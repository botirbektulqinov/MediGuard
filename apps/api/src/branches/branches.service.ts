import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { AuditLogService } from '../audit-log/audit-log.service';
import type { AuthenticatedUser, RequestContext } from '../auth/types/authenticated-user';
import { ClinicAccessService } from '../clinics/clinic-access.service';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateBranchDto } from './dto/create-branch.dto';
import type { UpdateBranchDto } from './dto/update-branch.dto';

@Injectable()
export class BranchesService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AuditLogService) private readonly auditLogService: AuditLogService,
    @Inject(ClinicAccessService) private readonly clinicAccessService: ClinicAccessService,
  ) {}

  async list(user: AuthenticatedUser, clinicId?: string) {
    if (clinicId) {
      await this.clinicAccessService.assertCanAccessClinic(user, clinicId);
    }
    const clinicIds = await this.clinicAccessService.accessibleClinicIds(user);
    const where: Prisma.BranchWhereInput = {
      ...(clinicId ? { clinicId } : {}),
      ...(clinicIds ? { clinicId: { in: clinicIds } } : {}),
    };

    return this.prisma.branch.findMany({
      where,
      orderBy: [{ clinic: { name: 'asc' } }, { name: 'asc' }],
      include: { clinic: { select: { id: true, name: true } } },
    });
  }

  async create(input: CreateBranchDto, user: AuthenticatedUser, context: RequestContext) {
    await this.assertClinicExists(input.clinicId);
    await this.clinicAccessService.assertCanAccessClinic(user, input.clinicId);

    try {
      const branch = await this.prisma.branch.create({
        data: {
          clinicId: input.clinicId,
          name: input.name,
          code: input.code,
          address: input.address,
          phone: input.phone ?? null,
        },
      });

      await this.auditLogService.create({
        actorUserId: user.id,
        action: 'BRANCH_CREATED',
        resourceType: 'Branch',
        resourceId: branch.id,
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
      });

      return branch;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('Branch code already exists for this clinic.');
      }
      throw error;
    }
  }

  async update(
    id: string,
    input: UpdateBranchDto,
    user: AuthenticatedUser,
    context: RequestContext,
  ) {
    const existingBranch = await this.assertBranchExists(id);
    await this.clinicAccessService.assertCanAccessClinic(user, existingBranch.clinicId);
    if (input.clinicId) {
      await this.assertClinicExists(input.clinicId);
      await this.clinicAccessService.assertCanAccessClinic(user, input.clinicId);
    }

    try {
      const data: Prisma.BranchUncheckedUpdateInput = {};
      if (input.clinicId !== undefined) data.clinicId = input.clinicId;
      if (input.name !== undefined) data.name = input.name;
      if (input.code !== undefined) data.code = input.code;
      if (input.address !== undefined) data.address = input.address;
      if (input.phone !== undefined) data.phone = input.phone;

      const branch = await this.prisma.branch.update({
        where: { id },
        data,
      });

      await this.auditLogService.create({
        actorUserId: user.id,
        action: 'BRANCH_UPDATED',
        resourceType: 'Branch',
        resourceId: branch.id,
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
      });

      return branch;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('Branch code already exists for this clinic.');
      }
      throw error;
    }
  }

  private async assertClinicExists(id: string): Promise<void> {
    const clinic = await this.prisma.clinic.findUnique({ where: { id }, select: { id: true } });
    if (!clinic) {
      throw new NotFoundException('Clinic not found.');
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
}
