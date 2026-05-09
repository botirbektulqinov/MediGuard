import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { AuditLogService } from '../audit-log/audit-log.service';
import type { AuthenticatedUser, RequestContext } from '../auth/types/authenticated-user';
import { ClinicAccessService } from '../clinics/clinic-access.service';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateRoomDto } from './dto/create-room.dto';
import type { UpdateRoomDto } from './dto/update-room.dto';

@Injectable()
export class RoomsService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AuditLogService) private readonly auditLogService: AuditLogService,
    @Inject(ClinicAccessService) private readonly clinicAccessService: ClinicAccessService,
  ) {}

  async list(user: AuthenticatedUser, branchId?: string) {
    if (branchId) {
      const branch = await this.assertBranchExists(branchId);
      await this.clinicAccessService.assertCanAccessClinic(user, branch.clinicId);
    }
    const clinicIds = await this.clinicAccessService.accessibleClinicIds(user);
    const where: Prisma.RoomWhereInput = {
      ...(branchId ? { branchId } : {}),
      ...(clinicIds ? { branch: { clinicId: { in: clinicIds } } } : {}),
    };

    return this.prisma.room.findMany({
      where,
      orderBy: [{ branch: { name: 'asc' } }, { name: 'asc' }],
      include: { branch: { select: { id: true, name: true, clinicId: true } } },
    });
  }

  async create(input: CreateRoomDto, user: AuthenticatedUser, context: RequestContext) {
    const branch = await this.assertBranchExists(input.branchId);
    await this.clinicAccessService.assertCanAccessClinic(user, branch.clinicId);

    try {
      const room = await this.prisma.room.create({
        data: {
          branchId: input.branchId,
          name: input.name,
          code: input.code,
          type: input.type,
          capacity: input.capacity,
          isActive: input.isActive ?? true,
        },
      });

      await this.auditLogService.create({
        actorUserId: user.id,
        action: 'ROOM_CREATED',
        resourceType: 'Room',
        resourceId: room.id,
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
      });

      return room;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('Room code already exists for this branch.');
      }
      throw error;
    }
  }

  async update(id: string, input: UpdateRoomDto, user: AuthenticatedUser, context: RequestContext) {
    const existingRoom = await this.assertRoomExists(id);
    await this.clinicAccessService.assertCanAccessClinic(user, existingRoom.branch.clinicId);
    if (input.branchId) {
      const branch = await this.assertBranchExists(input.branchId);
      await this.clinicAccessService.assertCanAccessClinic(user, branch.clinicId);
    }

    try {
      const data: Prisma.RoomUncheckedUpdateInput = {};
      if (input.branchId !== undefined) data.branchId = input.branchId;
      if (input.name !== undefined) data.name = input.name;
      if (input.code !== undefined) data.code = input.code;
      if (input.type !== undefined) data.type = input.type;
      if (input.capacity !== undefined) data.capacity = input.capacity;
      if (input.isActive !== undefined) data.isActive = input.isActive;

      const room = await this.prisma.room.update({
        where: { id },
        data,
      });

      await this.auditLogService.create({
        actorUserId: user.id,
        action: 'ROOM_UPDATED',
        resourceType: 'Room',
        resourceId: room.id,
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
      });

      return room;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('Room code already exists for this branch.');
      }
      throw error;
    }
  }

  private async assertBranchExists(id: string): Promise<{ id: string; clinicId: string }> {
    const branch = await this.prisma.branch.findUnique({
      where: { id },
      select: { id: true, clinicId: true },
    });
    if (!branch) {
      throw new NotFoundException('Branch not found.');
    }
    return branch;
  }

  private async assertRoomExists(
    id: string,
  ): Promise<{ id: string; branch: { clinicId: string } }> {
    const room = await this.prisma.room.findUnique({
      where: { id },
      select: { id: true, branch: { select: { clinicId: true } } },
    });
    if (!room) {
      throw new NotFoundException('Room not found.');
    }
    return room;
  }
}
