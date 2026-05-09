import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { AuditLogService } from '../audit-log/audit-log.service';
import type { AuthenticatedUser, RequestContext } from '../auth/types/authenticated-user';
import { ClinicAccessService } from '../clinics/clinic-access.service';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateClinicServiceDto } from './dto/create-clinic-service.dto';
import type { UpdateClinicServiceDto } from './dto/update-clinic-service.dto';

@Injectable()
export class ClinicServicesService {
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
    const where: Prisma.ClinicServiceWhereInput = {
      ...(clinicId ? { clinicId } : {}),
      ...(clinicIds ? { clinicId: { in: clinicIds } } : {}),
    };

    return this.prisma.clinicService.findMany({
      where,
      orderBy: { name: 'asc' },
      include: { clinic: { select: { id: true, name: true } } },
    });
  }

  async create(input: CreateClinicServiceDto, user: AuthenticatedUser, context: RequestContext) {
    await this.assertClinicExists(input.clinicId);
    await this.clinicAccessService.assertCanAccessClinic(user, input.clinicId);

    try {
      const service = await this.prisma.clinicService.create({
        data: {
          clinicId: input.clinicId,
          name: input.name,
          code: input.code,
          description: input.description ?? null,
          durationMinutes: input.durationMinutes,
          priceCents: input.priceCents,
        },
      });

      await this.auditLogService.create({
        actorUserId: user.id,
        action: 'CLINIC_SERVICE_CREATED',
        resourceType: 'ClinicService',
        resourceId: service.id,
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
      });

      return service;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('Service code already exists for this clinic.');
      }
      throw error;
    }
  }

  async update(
    id: string,
    input: UpdateClinicServiceDto,
    user: AuthenticatedUser,
    context: RequestContext,
  ) {
    const existingService = await this.assertServiceExists(id);
    await this.clinicAccessService.assertCanAccessClinic(user, existingService.clinicId);
    if (input.clinicId) {
      await this.assertClinicExists(input.clinicId);
      await this.clinicAccessService.assertCanAccessClinic(user, input.clinicId);
    }

    try {
      const data: Prisma.ClinicServiceUncheckedUpdateInput = {};
      if (input.clinicId !== undefined) data.clinicId = input.clinicId;
      if (input.name !== undefined) data.name = input.name;
      if (input.code !== undefined) data.code = input.code;
      if (input.description !== undefined) data.description = input.description;
      if (input.durationMinutes !== undefined) data.durationMinutes = input.durationMinutes;
      if (input.priceCents !== undefined) data.priceCents = input.priceCents;

      const service = await this.prisma.clinicService.update({
        where: { id },
        data,
      });

      await this.auditLogService.create({
        actorUserId: user.id,
        action: 'CLINIC_SERVICE_UPDATED',
        resourceType: 'ClinicService',
        resourceId: service.id,
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
      });

      return service;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('Service code already exists for this clinic.');
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

  private async assertServiceExists(id: string): Promise<{ id: string; clinicId: string }> {
    const service = await this.prisma.clinicService.findUnique({
      where: { id },
      select: { id: true, clinicId: true },
    });
    if (!service) {
      throw new NotFoundException('Clinic service not found.');
    }
    return service;
  }
}
