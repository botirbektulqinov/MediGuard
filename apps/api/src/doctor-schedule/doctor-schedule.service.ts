import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma } from '@prisma/client';

import { AuditLogService } from '../audit-log/audit-log.service';
import type { AuthenticatedUser, RequestContext } from '../auth/types/authenticated-user';
import { ClinicAccessService } from '../clinics/clinic-access.service';
import { PrismaService } from '../prisma/prisma.service';
import { parseTime } from '../appointments/appointment-rules';
import type { CreateDoctorScheduleDto } from './dto/create-doctor-schedule.dto';
import type { UpdateDoctorScheduleDto } from './dto/update-doctor-schedule.dto';

@Injectable()
export class DoctorScheduleService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AuditLogService) private readonly auditLogService: AuditLogService,
    @Inject(ClinicAccessService) private readonly clinicAccessService: ClinicAccessService,
  ) {}

  async list(user: AuthenticatedUser, doctorId?: string) {
    const clinicIds = await this.clinicAccessService.accessibleClinicIds(user);
    const where: Prisma.DoctorScheduleWhereInput = {
      ...(doctorId ? { doctorId } : {}),
      ...(clinicIds ? { clinicId: { in: clinicIds } } : {}),
    };

    return this.prisma.doctorSchedule.findMany({
      where,
      orderBy: [{ doctor: { staffProfile: { user: { lastName: 'asc' } } } }, { dayOfWeek: 'asc' }],
      include: {
        branch: { select: { id: true, name: true } },
        doctor: {
          select: {
            id: true,
            specialty: true,
            staffProfile: {
              select: {
                user: { select: { firstName: true, lastName: true, email: true } },
              },
            },
          },
        },
      },
    });
  }

  async create(input: CreateDoctorScheduleDto, user: AuthenticatedUser, context: RequestContext) {
    this.assertManagePermission(user);
    const references = await this.validateReferences(input.doctorId, input.branchId);
    await this.clinicAccessService.assertCanAccessClinic(user, references.clinicId);
    this.assertTimeRange(input.startsAt, input.endsAt);

    const schedule = await this.prisma.doctorSchedule.create({
      data: {
        clinicId: references.clinicId,
        branchId: input.branchId,
        doctorId: input.doctorId,
        dayOfWeek: input.dayOfWeek,
        startsAt: input.startsAt,
        endsAt: input.endsAt,
        slotMinutes: input.slotMinutes,
        effectiveFrom: new Date(input.effectiveFrom),
        effectiveUntil: input.effectiveUntil ? new Date(input.effectiveUntil) : null,
        isActive: input.isActive ?? true,
      },
    });

    await this.auditLogService.create({
      actorUserId: user.id,
      action: 'DOCTOR_SCHEDULE_CREATED',
      resourceType: 'DoctorSchedule',
      resourceId: schedule.id,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    });

    return schedule;
  }

  async update(
    id: string,
    input: UpdateDoctorScheduleDto,
    user: AuthenticatedUser,
    context: RequestContext,
  ) {
    this.assertManagePermission(user);
    const existing = await this.findScheduleOrThrow(id);
    await this.clinicAccessService.assertCanAccessClinic(user, existing.clinicId);
    const branchId = input.branchId ?? existing.branchId;
    const doctorId = input.doctorId ?? existing.doctorId;
    const references = await this.validateReferences(doctorId, branchId);
    await this.clinicAccessService.assertCanAccessClinic(user, references.clinicId);
    this.assertTimeRange(input.startsAt ?? existing.startsAt, input.endsAt ?? existing.endsAt);

    const data: Prisma.DoctorScheduleUncheckedUpdateInput = {
      clinicId: references.clinicId,
      branchId,
      doctorId,
    };
    if (input.dayOfWeek !== undefined) data.dayOfWeek = input.dayOfWeek;
    if (input.startsAt !== undefined) data.startsAt = input.startsAt;
    if (input.endsAt !== undefined) data.endsAt = input.endsAt;
    if (input.slotMinutes !== undefined) data.slotMinutes = input.slotMinutes;
    if (input.effectiveFrom !== undefined) data.effectiveFrom = new Date(input.effectiveFrom);
    if (input.effectiveUntil !== undefined) {
      data.effectiveUntil = input.effectiveUntil ? new Date(input.effectiveUntil) : null;
    }
    if (input.isActive !== undefined) data.isActive = input.isActive;

    const schedule = await this.prisma.doctorSchedule.update({ where: { id }, data });
    await this.auditLogService.create({
      actorUserId: user.id,
      action: 'DOCTOR_SCHEDULE_UPDATED',
      resourceType: 'DoctorSchedule',
      resourceId: id,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    });

    return schedule;
  }

  private assertManagePermission(user: AuthenticatedUser): void {
    if (!user.permissions.includes('doctor-schedule.manage')) {
      throw new ForbiddenException('Missing permission: doctor-schedule.manage');
    }
  }

  private assertTimeRange(startsAt: string, endsAt: string): void {
    if (parseTime(startsAt) >= parseTime(endsAt)) {
      throw new BadRequestException('Schedule end time must be after start time.');
    }
  }

  private async validateReferences(doctorId: string, branchId: string) {
    const [doctor, branch] = await Promise.all([
      this.prisma.doctorProfile.findUnique({
        where: { id: doctorId },
        select: { id: true, staffProfile: { select: { clinicId: true } } },
      }),
      this.prisma.branch.findUnique({
        where: { id: branchId },
        select: { id: true, clinicId: true },
      }),
    ]);

    if (!doctor) throw new NotFoundException('Doctor not found.');
    if (!branch) throw new NotFoundException('Branch not found.');
    if (doctor.staffProfile.clinicId !== branch.clinicId) {
      throw new BadRequestException('Doctor and branch must belong to the same clinic.');
    }

    return { clinicId: branch.clinicId };
  }

  private async findScheduleOrThrow(id: string) {
    const schedule = await this.prisma.doctorSchedule.findUnique({ where: { id } });
    if (!schedule) {
      throw new NotFoundException('Doctor schedule not found.');
    }
    return schedule;
  }
}
