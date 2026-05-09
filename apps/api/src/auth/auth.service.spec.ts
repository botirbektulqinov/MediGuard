import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import type { JwtService } from '@nestjs/jwt';

import type { AuditLogService } from '../audit-log/audit-log.service';
import type { Env } from '../config/env.schema';
import type { PrismaService } from '../prisma/prisma.service';
import type { UsersService } from '../users/users.service';
import { AuthService } from './auth.service';
import type { PasswordService } from './password.service';

const authUser = {
  id: 'user-1',
  email: 'admin@demo.com',
  passwordHash: 'hash',
  firstName: 'Admin',
  lastName: 'User',
  status: 'ACTIVE',
  failedLoginCount: 0,
  lockedUntil: null,
  lastLoginAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  roles: [
    {
      role: {
        name: 'SUPER_ADMIN',
        permissions: [{ permission: { key: 'users.read' } }],
      },
    },
  ],
};

function createService(
  overrides: Partial<{ user: typeof authUser | null; passwordMatches: boolean }> = {},
) {
  const prisma = {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn().mockResolvedValue({}),
    },
    refreshToken: {
      create: jest.fn().mockResolvedValue({ id: 'refresh-token-2' }),
      findUnique: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    session: {
      create: jest.fn().mockResolvedValue({ id: 'session-1' }),
      updateMany: jest.fn(),
    },
    loginAttempt: {
      create: jest.fn().mockResolvedValue({}),
    },
    $transaction: jest.fn().mockImplementation(async (input: unknown) => {
      if (Array.isArray(input)) {
        return Promise.all(input);
      }
      if (typeof input === 'function') {
        return input(prisma);
      }
      return input;
    }),
  } as unknown as PrismaService;
  const usersService = {
    findByEmailForAuth: jest.fn().mockResolvedValue(overrides.user ?? authUser),
    findByIdForAuth: jest.fn().mockResolvedValue(overrides.user ?? authUser),
  } as unknown as UsersService;
  const passwordService = {
    hash: jest.fn().mockResolvedValue('hash'),
    verify: jest.fn().mockResolvedValue(overrides.passwordMatches ?? true),
  } as unknown as PasswordService;
  const jwtService = {
    signAsync: jest.fn().mockResolvedValue('access-token'),
  } as unknown as JwtService;
  const configService = {
    get: jest.fn().mockReturnValue('replace-with-a-long-random-development-secret'),
  } as unknown as ConfigService<Env, true>;
  const auditLogService = {
    create: jest.fn().mockResolvedValue(undefined),
  } as unknown as AuditLogService;

  return {
    service: new AuthService(
      prisma,
      usersService,
      passwordService,
      jwtService,
      configService,
      auditLogService,
    ),
    prisma,
    auditLogService,
  };
}

describe('AuthService', () => {
  it('returns tokens and a sanitized user on successful login', async () => {
    const { service } = createService();

    const result = await service.login(
      { email: 'ADMIN@demo.com', password: 'DemoPass123!' },
      { ipAddress: '127.0.0.1' },
    );

    expect(result.accessToken).toBe('access-token');
    expect(result.refreshToken).toEqual(expect.any(String));
    expect(result.user).toMatchObject({
      email: 'admin@demo.com',
      roles: ['SUPER_ADMIN'],
      permissions: ['users.read'],
    });
    expect(result.user).not.toHaveProperty('passwordHash');
  });

  it('tracks failed login attempts for invalid passwords', async () => {
    const { service, prisma, auditLogService } = createService({ passwordMatches: false });

    await expect(
      service.login({ email: 'admin@demo.com', password: 'wrong' }, {}),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(prisma.loginAttempt.create).toHaveBeenCalled();
    expect(auditLogService.create).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'AUTH_LOGIN_FAILED',
        metadata: { failureReason: 'INVALID_CREDENTIALS' },
      }),
    );
  });

  it('rejects disabled accounts', async () => {
    const disabledUser = { ...authUser, status: 'DISABLED' as const };
    const { service } = createService({ user: disabledUser });

    await expect(
      service.login({ email: 'admin@demo.com', password: 'DemoPass123!' }, {}),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('marks the session revoked when refresh token reuse revokes a token family', async () => {
    const { service, prisma, auditLogService } = createService();
    const findRefreshToken = prisma.refreshToken.findUnique as unknown as jest.Mock;
    findRefreshToken.mockResolvedValue({
      id: 'refresh-token-1',
      userId: authUser.id,
      tokenHash: 'hash',
      familyId: 'family-1',
      replacedByTokenId: 'refresh-token-2',
      revokedAt: new Date(),
      expiresAt: new Date(Date.now() + 60_000),
      createdAt: new Date(),
      createdByIp: null,
      userAgent: null,
      user: authUser,
    });

    await expect(
      service.refresh('refresh-token-value-with-enough-length', {}),
    ).rejects.toBeInstanceOf(UnauthorizedException);

    expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { familyId: 'family-1', revokedAt: null } }),
    );
    expect(prisma.session.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { familyId: 'family-1', status: 'ACTIVE' },
        data: expect.objectContaining({ status: 'REVOKED', revokedAt: expect.any(Date) }),
      }),
    );
    expect(auditLogService.create).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'AUTH_REFRESH_REUSE_DETECTED' }),
    );
  });

  it('marks the session expired when the refresh token is expired', async () => {
    const { service, prisma } = createService();
    const findRefreshToken = prisma.refreshToken.findUnique as unknown as jest.Mock;
    findRefreshToken.mockResolvedValue({
      id: 'refresh-token-1',
      userId: authUser.id,
      tokenHash: 'hash',
      familyId: 'family-1',
      replacedByTokenId: null,
      revokedAt: null,
      expiresAt: new Date(Date.now() - 60_000),
      createdAt: new Date(),
      createdByIp: null,
      userAgent: null,
      user: authUser,
    });

    await expect(
      service.refresh('refresh-token-value-with-enough-length', {}),
    ).rejects.toBeInstanceOf(UnauthorizedException);

    expect(prisma.refreshToken.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'refresh-token-1' },
        data: { revokedAt: expect.any(Date) },
      }),
    );
    expect(prisma.session.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { familyId: 'family-1', status: 'ACTIVE' },
        data: { status: 'EXPIRED' },
      }),
    );
  });
});
