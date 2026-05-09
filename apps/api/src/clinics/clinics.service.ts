import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { AuditLogService } from '../audit-log/audit-log.service';
import type { AuthenticatedUser } from '../auth/types/authenticated-user';
import { PrismaService } from '../prisma/prisma.service';
import { ClinicAccessService } from './clinic-access.service';
import type { RequestContext } from '../auth/types/authenticated-user';
import type { CreateClinicDto } from './dto/create-clinic.dto';
import type { UpdateClinicDto } from './dto/update-clinic.dto';

@Injectable()
export class ClinicsService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AuditLogService) private readonly auditLogService: AuditLogService,
    @Inject(ClinicAccessService) private readonly clinicAccessService: ClinicAccessService,
  ) {}

  async list(user: AuthenticatedUser) {
    const clinicIds = await this.clinicAccessService.accessibleClinicIds(user);

    return this.prisma.clinic.findMany({
      ...(clinicIds ? { where: { id: { in: clinicIds } } } : {}),
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        slug: true,
        phone: true,
        email: true,
        address: true,
        timezone: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async create(input: CreateClinicDto, user: AuthenticatedUser, context: RequestContext) {
    await this.clinicAccessService.assertPlatformAdminForClinicCreation(user);

    try {
      const clinic = await this.prisma.clinic.create({
        data: {
          name: input.name,
          slug: input.slug,
          phone: input.phone ?? null,
          email: input.email ?? null,
          address: input.address ?? null,
          timezone: input.timezone ?? 'UTC',
        },
      });

      await this.auditLogService.create({
        actorUserId: user.id,
        action: 'CLINIC_CREATED',
        resourceType: 'Clinic',
        resourceId: clinic.id,
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
      });

      return clinic;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('Clinic slug already exists.');
      }
      throw error;
    }
  }

  async update(
    id: string,
    input: UpdateClinicDto,
    user: AuthenticatedUser,
    context: RequestContext,
  ) {
    await this.assertClinicExists(id);
    await this.clinicAccessService.assertCanAccessClinic(user, id);

    try {
      const data: Prisma.ClinicUpdateInput = {};
      if (input.name !== undefined) data.name = input.name;
      if (input.slug !== undefined) data.slug = input.slug;
      if (input.phone !== undefined) data.phone = input.phone;
      if (input.email !== undefined) data.email = input.email;
      if (input.address !== undefined) data.address = input.address;
      if (input.timezone !== undefined) data.timezone = input.timezone;

      const clinic = await this.prisma.clinic.update({
        where: { id },
        data,
      });

      await this.auditLogService.create({
        actorUserId: user.id,
        action: 'CLINIC_UPDATED',
        resourceType: 'Clinic',
        resourceId: clinic.id,
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
      });

      return clinic;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('Clinic slug already exists.');
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
}
