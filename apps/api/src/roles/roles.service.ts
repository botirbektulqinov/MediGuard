import { Inject, Injectable, NotFoundException } from '@nestjs/common';

import { AuditLogService } from '../audit-log/audit-log.service';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class RolesService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AuditLogService) private readonly auditLogService: AuditLogService,
  ) {}

  list() {
    return this.prisma.role.findMany({
      orderBy: { name: 'asc' },
      include: {
        permissions: {
          include: { permission: true },
        },
      },
    });
  }

  async assignRoleToUser(
    userId: string,
    roleName: string,
    actorUserId: string,
    userAgent?: string,
  ) {
    const [user, role] = await Promise.all([
      this.prisma.user.findUnique({ where: { id: userId }, select: { id: true } }),
      this.prisma.role.findUnique({ where: { name: roleName }, select: { id: true, name: true } }),
    ]);

    if (!user) {
      throw new NotFoundException('User not found.');
    }
    if (!role) {
      throw new NotFoundException('Role not found.');
    }

    const userRole = await this.prisma.userRole.upsert({
      where: {
        userId_roleId: {
          userId: user.id,
          roleId: role.id,
        },
      },
      update: {},
      create: {
        userId: user.id,
        roleId: role.id,
      },
    });

    await this.auditLogService.create({
      actorUserId,
      action: 'USER_ROLE_ASSIGNED',
      resourceType: 'UserRole',
      resourceId: userRole.id,
      userAgent,
      metadata: {
        userId: user.id,
        roleName: role.name,
      },
    });

    return userRole;
  }

  async assignPermissionToRole(
    roleName: string,
    permissionKey: string,
    actorUserId: string,
    userAgent?: string,
  ) {
    const [role, permission] = await Promise.all([
      this.prisma.role.findUnique({ where: { name: roleName }, select: { id: true, name: true } }),
      this.prisma.permission.findUnique({
        where: { key: permissionKey },
        select: { id: true, key: true },
      }),
    ]);

    if (!role) {
      throw new NotFoundException('Role not found.');
    }
    if (!permission) {
      throw new NotFoundException('Permission not found.');
    }

    const rolePermission = await this.prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: {
          roleId: role.id,
          permissionId: permission.id,
        },
      },
      update: {},
      create: {
        roleId: role.id,
        permissionId: permission.id,
      },
    });

    await this.auditLogService.create({
      actorUserId,
      action: 'ROLE_PERMISSION_ASSIGNED',
      resourceType: 'RolePermission',
      resourceId: `${role.id}:${permission.id}`,
      userAgent,
      metadata: {
        roleName: role.name,
        permissionKey: permission.key,
      },
    });

    return rolePermission;
  }
}
