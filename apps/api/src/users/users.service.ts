import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { UserStatus } from '@prisma/client';

import { AuditLogService } from '../audit-log/audit-log.service';
import { PrismaService } from '../prisma/prisma.service';
import { safeUserSelect } from './user-select';

export interface CreateUserInput {
  email: string;
  passwordHash: string;
  firstName: string;
  lastName: string;
}

@Injectable()
export class UsersService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AuditLogService) private readonly auditLogService: AuditLogService,
  ) {}

  findByEmailForAuth(email: string) {
    return this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
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
    });
  }

  findByIdForAuth(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
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
    });
  }

  async create(input: CreateUserInput) {
    const email = input.email.toLowerCase();
    const existing = await this.prisma.user.findUnique({ where: { email }, select: { id: true } });
    if (existing) {
      throw new ConflictException('A user with this email already exists.');
    }

    return this.prisma.user.create({
      data: {
        email,
        passwordHash: input.passwordHash,
        firstName: input.firstName,
        lastName: input.lastName,
      },
    });
  }

  list() {
    return this.prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      select: safeUserSelect,
    });
  }

  async updateStatus(
    userId: string,
    status: UserStatus,
    actorUserId: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const user = await this.prisma.user
      .update({
        where: { id: userId },
        data: { status },
        select: safeUserSelect,
      })
      .catch(() => {
        throw new NotFoundException('User not found.');
      });

    await this.auditLogService.create({
      actorUserId,
      action: 'USER_STATUS_UPDATED',
      resourceType: 'User',
      resourceId: user.id,
      ipAddress,
      userAgent,
      metadata: { status },
    });

    return user;
  }
}
