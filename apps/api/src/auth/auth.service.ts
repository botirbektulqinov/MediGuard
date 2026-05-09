import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { randomBytes, randomUUID, createHash } from 'node:crypto';
import type { Prisma, User } from '@prisma/client';

import { AuditLogService } from '../audit-log/audit-log.service';
import type { Env } from '../config/env.schema';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import { PasswordService } from './password.service';
import type { AuthenticatedUser, RequestContext } from './types/authenticated-user';
import type { JwtPayload } from './types/jwt-payload';

const ACCESS_TOKEN_EXPIRES_IN = '15m';
const REFRESH_TOKEN_TTL_DAYS = 7;
const MAX_FAILED_LOGIN_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;

type UserWithRoles = Awaited<ReturnType<UsersService['findByEmailForAuth']>>;

export interface SanitizedUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  roles: string[];
  permissions: string[];
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  user: SanitizedUser;
}

@Injectable()
export class AuthService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(UsersService) private readonly usersService: UsersService,
    @Inject(PasswordService) private readonly passwordService: PasswordService,
    @Inject(JwtService) private readonly jwtService: JwtService,
    @Inject(ConfigService) private readonly configService: ConfigService<Env, true>,
    @Inject(AuditLogService) private readonly auditLogService: AuditLogService,
  ) {}

  async register(
    input: { email: string; password: string; firstName: string; lastName: string },
    context: RequestContext,
  ): Promise<AuthTokens> {
    const email = input.email.toLowerCase();
    const existing = await this.prisma.user.findUnique({ where: { email }, select: { id: true } });
    if (existing) {
      throw new ConflictException('A user with this email already exists.');
    }

    const passwordHash = await this.passwordService.hash(input.password);
    const patientRole = await this.prisma.role.findUnique({
      where: { name: 'PATIENT' },
      select: { id: true },
    });

    const user = await this.prisma.user.create({
      data: {
        email,
        passwordHash,
        firstName: input.firstName,
        lastName: input.lastName,
        ...(patientRole
          ? {
              roles: {
                create: {
                  roleId: patientRole.id,
                },
              },
            }
          : {}),
      },
    });

    await this.auditLogService.create({
      actorUserId: user.id,
      action: 'USER_REGISTERED',
      resourceType: 'User',
      resourceId: user.id,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    });

    const authUser = await this.usersService.findByEmailForAuth(email);
    if (!authUser) {
      throw new UnauthorizedException('Unable to authenticate registered user.');
    }

    return this.issueTokenPair(authUser, context);
  }

  async login(
    input: { email: string; password: string },
    context: RequestContext,
  ): Promise<AuthTokens> {
    const email = input.email.toLowerCase();
    const user = await this.usersService.findByEmailForAuth(email);

    if (!user) {
      await this.recordLoginAttempt(email, null, false, 'INVALID_CREDENTIALS', context);
      throw new UnauthorizedException('Invalid email or password.');
    }

    if (user.status === 'DISABLED') {
      await this.recordLoginAttempt(email, user.id, false, 'ACCOUNT_DISABLED', context);
      throw new ForbiddenException('Account is disabled.');
    }

    if (user.lockedUntil && user.lockedUntil > new Date()) {
      await this.recordLoginAttempt(email, user.id, false, 'ACCOUNT_LOCKED', context);
      throw new ForbiddenException('Account is temporarily locked.');
    }

    const passwordMatches = await this.passwordService.verify(input.password, user.passwordHash);
    if (!passwordMatches) {
      await this.handleFailedLogin(user, context);
      throw new UnauthorizedException('Invalid email or password.');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginCount: 0,
        lockedUntil: null,
        lastLoginAt: new Date(),
      },
    });
    await this.recordLoginAttempt(email, user.id, true, undefined, context);

    return this.issueTokenPair(user, context);
  }

  async refresh(refreshToken: string, context: RequestContext): Promise<AuthTokens> {
    const tokenHash = this.hashRefreshToken(refreshToken);
    const existingToken = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: {
        user: {
          include: {
            roles: {
              include: {
                role: {
                  include: {
                    permissions: {
                      include: { permission: true },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!existingToken) {
      throw new UnauthorizedException('Invalid refresh token.');
    }

    if (existingToken.revokedAt || existingToken.replacedByTokenId) {
      await this.revokeRefreshTokenFamily(existingToken.familyId);
      await this.auditLogService.create({
        actorUserId: existingToken.userId,
        action: 'AUTH_REFRESH_REUSE_DETECTED',
        resourceType: 'RefreshToken',
        resourceId: existingToken.id,
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
      });
      throw new UnauthorizedException('Refresh token reuse detected.');
    }

    if (existingToken.expiresAt <= new Date()) {
      await this.expireRefreshTokenFamily(existingToken.familyId, existingToken.id);
      throw new UnauthorizedException('Refresh token expired.');
    }

    if (existingToken.user.status === 'DISABLED') {
      throw new ForbiddenException('Account is disabled.');
    }

    const newRefreshToken = this.generateRefreshToken();
    const rotationResult = await this.prisma.$transaction(async (tx) => {
      const newRefreshTokenExpiresAt = this.refreshTokenExpiry();
      const newRefreshTokenData: Prisma.RefreshTokenUncheckedCreateInput = {
        userId: existingToken.userId,
        tokenHash: this.hashRefreshToken(newRefreshToken),
        familyId: existingToken.familyId,
        expiresAt: newRefreshTokenExpiresAt,
        createdByIp: context.ipAddress ?? null,
        userAgent: context.userAgent ?? null,
      };
      const newRefreshTokenRecord = await tx.refreshToken.create({
        data: newRefreshTokenData,
      });

      const updateResult = await tx.refreshToken.updateMany({
        where: {
          id: existingToken.id,
          revokedAt: null,
          replacedByTokenId: null,
        },
        data: {
          revokedAt: new Date(),
          replacedByTokenId: newRefreshTokenRecord.id,
        },
      });

      if (updateResult.count !== 1) {
        await tx.refreshToken.updateMany({
          where: { familyId: existingToken.familyId, revokedAt: null },
          data: { revokedAt: new Date() },
        });
        return null;
      }

      return newRefreshTokenRecord;
    });

    if (!rotationResult) {
      await this.auditLogService.create({
        actorUserId: existingToken.userId,
        action: 'AUTH_REFRESH_REUSE_DETECTED',
        resourceType: 'RefreshToken',
        resourceId: existingToken.id,
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
      });
      throw new UnauthorizedException('Refresh token reuse detected.');
    }
    await this.prisma.session.updateMany({
      where: { familyId: existingToken.familyId, status: 'ACTIVE' },
      data: { lastSeenAt: new Date(), expiresAt: rotationResult.expiresAt },
    });

    return {
      accessToken: await this.signAccessToken(existingToken.user),
      refreshToken: newRefreshToken,
      user: this.sanitizeUser(existingToken.user),
    };
  }

  async logout(
    refreshToken: string,
    user: AuthenticatedUser,
    context: RequestContext,
  ): Promise<void> {
    const tokenHash = this.hashRefreshToken(refreshToken);
    const existingToken = await this.prisma.refreshToken.findFirst({
      where: { tokenHash, userId: user.id, revokedAt: null },
      select: { id: true, familyId: true },
    });

    if (!existingToken) {
      await this.auditLogService.create({
        actorUserId: user.id,
        action: 'AUTH_LOGOUT_INVALID_REFRESH_TOKEN',
        resourceType: 'RefreshToken',
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
      });
      throw new UnauthorizedException('Invalid refresh token.');
    }
    await this.prisma.$transaction([
      this.prisma.refreshToken.update({
        where: { id: existingToken.id },
        data: { revokedAt: new Date() },
      }),
      this.prisma.session.updateMany({
        where: { familyId: existingToken.familyId, status: 'ACTIVE' },
        data: { status: 'REVOKED', revokedAt: new Date() },
      }),
    ]);

    await this.auditLogService.create({
      actorUserId: user.id,
      action: 'AUTH_LOGOUT',
      resourceType: 'User',
      resourceId: user.id,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    });
  }

  async getAuthenticatedUser(userId: string): Promise<AuthenticatedUser> {
    const user = await this.usersService.findByIdForAuth(userId);
    if (!user) {
      throw new UnauthorizedException('User not found.');
    }
    if (user.status === 'DISABLED') {
      throw new ForbiddenException('Account is disabled.');
    }

    const sanitized = this.sanitizeUser(user);
    return {
      ...sanitized,
      status: user.status,
    };
  }

  async me(user: AuthenticatedUser): Promise<SanitizedUser> {
    const dbUser = await this.usersService.findByIdForAuth(user.id);
    if (!dbUser) {
      throw new UnauthorizedException('User not found.');
    }
    return this.sanitizeUser(dbUser);
  }

  private async issueTokenPair(user: NonNullable<UserWithRoles>, context: RequestContext) {
    const refreshToken = this.generateRefreshToken();
    const familyId = randomUUID();
    const refreshTokenData: Prisma.RefreshTokenUncheckedCreateInput = {
      userId: user.id,
      tokenHash: this.hashRefreshToken(refreshToken),
      familyId,
      expiresAt: this.refreshTokenExpiry(),
      createdByIp: context.ipAddress ?? null,
      userAgent: context.userAgent ?? null,
    };
    await this.prisma.$transaction([
      this.prisma.session.create({
        data: {
          userId: user.id,
          familyId,
          ipAddress: context.ipAddress ?? null,
          userAgent: context.userAgent ?? null,
          expiresAt: refreshTokenData.expiresAt,
        },
      }),
      this.prisma.refreshToken.create({ data: refreshTokenData }),
    ]);

    return {
      accessToken: await this.signAccessToken(user),
      refreshToken,
      user: this.sanitizeUser(user),
    };
  }

  private async signAccessToken(user: Pick<User, 'id' | 'email'>): Promise<string> {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
    };

    return this.jwtService.signAsync(payload, {
      secret: this.configService.get('JWT_ACCESS_SECRET', { infer: true }),
      expiresIn: ACCESS_TOKEN_EXPIRES_IN,
    });
  }

  private sanitizeUser(user: NonNullable<UserWithRoles>): SanitizedUser {
    const roles = user.roles.map((userRole) => userRole.role.name);
    const permissions = Array.from(
      new Set(
        user.roles.flatMap((userRole) =>
          userRole.role.permissions.map((rolePermission) => rolePermission.permission.key),
        ),
      ),
    ).sort();

    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      roles,
      permissions,
    };
  }

  private async handleFailedLogin(user: NonNullable<UserWithRoles>, context: RequestContext) {
    const failedLoginCount = user.failedLoginCount + 1;
    const lockedUntil =
      failedLoginCount >= MAX_FAILED_LOGIN_ATTEMPTS
        ? new Date(Date.now() + LOCKOUT_MINUTES * 60 * 1000)
        : null;

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginCount,
        lockedUntil,
      },
    });
    await this.recordLoginAttempt(user.email, user.id, false, 'INVALID_CREDENTIALS', context);
  }

  private async recordLoginAttempt(
    email: string,
    userId: string | null,
    success: boolean,
    failureReason: string | undefined,
    context: RequestContext,
  ): Promise<void> {
    const loginAttemptData: Prisma.LoginAttemptUncheckedCreateInput = {
      email,
      userId,
      success,
      failureReason: failureReason ?? null,
      ipAddress: context.ipAddress ?? null,
      userAgent: context.userAgent ?? null,
    };
    await this.prisma.loginAttempt.create({ data: loginAttemptData });

    await this.auditLogService.create({
      actorUserId: userId ?? undefined,
      action: success ? 'AUTH_LOGIN_SUCCEEDED' : 'AUTH_LOGIN_FAILED',
      resourceType: 'LoginAttempt',
      resourceId: email,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      metadata: failureReason ? { failureReason } : undefined,
    });
  }

  private async revokeRefreshTokenFamily(familyId: string): Promise<void> {
    const revokedAt = new Date();
    await this.prisma.$transaction([
      this.prisma.refreshToken.updateMany({
        where: { familyId, revokedAt: null },
        data: { revokedAt },
      }),
      this.prisma.session.updateMany({
        where: { familyId, status: 'ACTIVE' },
        data: { status: 'REVOKED', revokedAt },
      }),
    ]);
  }

  private async expireRefreshTokenFamily(familyId: string, tokenId: string): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.refreshToken.update({
        where: { id: tokenId },
        data: { revokedAt: new Date() },
      }),
      this.prisma.session.updateMany({
        where: { familyId, status: 'ACTIVE' },
        data: { status: 'EXPIRED' },
      }),
    ]);
  }

  private generateRefreshToken(): string {
    return randomBytes(48).toString('base64url');
  }

  private hashRefreshToken(refreshToken: string): string {
    return createHash('sha256')
      .update(this.configService.get('JWT_REFRESH_SECRET', { infer: true }))
      .update(refreshToken)
      .digest('hex');
  }

  private refreshTokenExpiry(): Date {
    return new Date(Date.now() + REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);
  }
}
