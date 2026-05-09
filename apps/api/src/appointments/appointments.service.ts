import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { AppointmentStatus } from '@prisma/client';

import { AuditLogService } from '../audit-log/audit-log.service';
import type { AuthenticatedUser, RequestContext } from '../auth/types/authenticated-user';
import { ClinicAccessService } from '../clinics/clinic-access.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  assertAllowedTransition,
  assertPatientCanCancel,
  assertWithinDoctorSchedule,
} from './appointment-rules';
import type { CancelAppointmentDto } from './dto/cancel-appointment.dto';
import type { CreateAppointmentDto } from './dto/create-appointment.dto';
import type { RescheduleAppointmentDto } from './dto/reschedule-appointment.dto';

const appointmentSelect = Prisma.validator<Prisma.AppointmentSelect>()({
  id: true,
  clinicId: true,
  branchId: true,
  patientId: true,
  doctorId: true,
  serviceId: true,
  startAt: true,
  endAt: true,
  status: true,
  reason: true,
  cancellationReason: true,
  createdAt: true,
  updatedAt: true,
  clinic: { select: { id: true, name: true } },
  branch: { select: { id: true, name: true } },
  service: { select: { id: true, name: true, durationMinutes: true } },
  patient: {
    select: {
      id: true,
      userId: true,
      firstName: true,
      lastName: true,
      medicalRecordNumber: true,
      contact: { select: { phone: true, email: true } },
    },
  },
  doctor: {
    select: {
      id: true,
      specialty: true,
      staffProfile: {
        select: {
          clinicId: true,
          userId: true,
          user: { select: { id: true, firstName: true, lastName: true, email: true } },
        },
      },
    },
  },
  statusHistory: {
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      fromStatus: true,
      toStatus: true,
      reason: true,
      changedByUserId: true,
      createdAt: true,
    },
  },
  queueEntry: {
    select: {
      id: true,
      status: true,
      position: true,
      arrivedAt: true,
      calledAt: true,
      completedAt: true,
    },
  },
});

type AppointmentRecord = Prisma.AppointmentGetPayload<{ select: typeof appointmentSelect }>;

const BOOKING_BLOCKING_STATUSES: AppointmentStatus[] = [
  'BOOKED',
  'CONFIRMED',
  'ARRIVED',
  'IN_QUEUE',
  'IN_CONSULTATION',
  'LAB_REQUIRED',
];

@Injectable()
export class AppointmentsService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AuditLogService) private readonly auditLogService: AuditLogService,
    @Inject(ClinicAccessService) private readonly clinicAccessService: ClinicAccessService,
    @Inject(NotificationsService) private readonly notificationsService: NotificationsService,
  ) {}

  async list(user: AuthenticatedUser, from?: string, to?: string) {
    const where: Prisma.AppointmentWhereInput = {};
    if (from || to) {
      where.startAt = {
        ...(from ? { gte: this.parseDateInput(from, 'from') } : {}),
        ...(to ? { lte: this.parseDateInput(to, 'to') } : {}),
      };
    }

    if (user.roles.includes('PATIENT')) {
      where.patient = { userId: user.id };
    } else if (user.roles.includes('DOCTOR')) {
      const doctorId = await this.findDoctorIdForUser(user.id);
      where.doctorId = doctorId ?? '__none__';
    } else {
      this.assertPermission(user, 'appointment.read');
      const clinicIds = await this.clinicAccessService.accessibleClinicIds(user);
      if (clinicIds) {
        where.clinicId = { in: clinicIds };
      }
    }

    return this.prisma.appointment.findMany({
      where,
      orderBy: { startAt: 'asc' },
      take: 100,
      select: appointmentSelect,
    });
  }

  async getById(id: string, user: AuthenticatedUser, context?: RequestContext) {
    const appointment = await this.findAppointmentOrThrow(id);
    await this.assertCanView(user, appointment);

    if (context) {
      await this.auditLogService.create({
        actorUserId: user.id,
        action: 'APPOINTMENT_VIEWED',
        resourceType: 'Appointment',
        resourceId: appointment.id,
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
      });
    }

    return appointment;
  }

  async create(input: CreateAppointmentDto, user: AuthenticatedUser, context: RequestContext) {
    const patientId = await this.resolvePatientIdForCreate(input.patientId, user);
    const startAt = this.parseDateInput(input.startAt, 'startAt');

    const references = await this.validateAppointmentReferences({
      patientId,
      doctorId: input.doctorId,
      branchId: input.branchId,
      ...(input.serviceId ? { serviceId: input.serviceId } : {}),
    });
    await this.assertCanCreateForClinic(user, references.clinicId);
    const durationMinutes = references.service?.durationMinutes ?? 30;
    const endAt = new Date(startAt.getTime() + durationMinutes * 60 * 1000);
    await this.assertScheduleAvailable(
      input.doctorId,
      references.clinicId,
      input.branchId,
      startAt,
      endAt,
    );

    try {
      const appointment = await this.prisma.$transaction(async (tx) => {
        const created = await tx.appointment.create({
          data: {
            clinicId: references.clinicId,
            branchId: input.branchId,
            patientId,
            doctorId: input.doctorId,
            serviceId: input.serviceId ?? null,
            startAt,
            endAt,
            status: 'BOOKED',
            reason: input.reason ?? null,
            createdByUserId: user.id,
          },
          select: appointmentSelect,
        });
        await tx.appointmentStatusHistory.create({
          data: {
            appointmentId: created.id,
            fromStatus: null,
            toStatus: 'BOOKED',
            changedByUserId: user.id,
            reason: 'Appointment booked',
          },
        });
        return created;
      });

      await this.auditStatusChange(
        appointment.id,
        user,
        null,
        'BOOKED',
        context,
        'Appointment booked',
      );
      await this.notifyPatient(
        appointment.patient.userId,
        'APPOINTMENT_BOOKED',
        'Appointment booked',
        'Your appointment has been booked.',
      );

      return this.findAppointmentOrThrow(appointment.id);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('Doctor is already booked for this time slot.');
      }
      throw error;
    }
  }

  async confirm(id: string, user: AuthenticatedUser, context: RequestContext) {
    await this.assertStaffCanModify(id, user, 'appointment.update');
    return this.changeStatus(id, 'CONFIRMED', user, context, 'Appointment confirmed');
  }

  async markArrived(id: string, user: AuthenticatedUser, context: RequestContext) {
    await this.assertStaffCanModify(id, user, 'appointment.update');
    return this.changeStatus(id, 'ARRIVED', user, context, 'Patient arrived');
  }

  async cancel(
    id: string,
    input: CancelAppointmentDto,
    user: AuthenticatedUser,
    context: RequestContext,
  ) {
    const appointment = await this.findAppointmentOrThrow(id);
    if (appointment.patient.userId === user.id) {
      assertPatientCanCancel(appointment.startAt);
    } else {
      this.assertPermission(user, 'appointment.cancel');
      await this.clinicAccessService.assertCanAccessClinic(user, appointment.clinicId);
    }

    return this.changeStatus(
      id,
      'CANCELLED',
      user,
      context,
      input.reason ?? 'Appointment cancelled',
    );
  }

  async reschedule(
    id: string,
    input: RescheduleAppointmentDto,
    user: AuthenticatedUser,
    context: RequestContext,
  ) {
    await this.assertStaffCanModify(id, user, 'appointment.update');
    const appointment = await this.findAppointmentOrThrow(id);
    if (['CANCELLED', 'COMPLETED', 'NO_SHOW'].includes(appointment.status)) {
      throw new BadRequestException('Terminal appointments cannot be rescheduled.');
    }

    const startAt = this.parseDateInput(input.startAt, 'startAt');
    const durationMinutes =
      appointment.service?.durationMinutes ??
      Math.max(
        1,
        Math.round((appointment.endAt.getTime() - appointment.startAt.getTime()) / 60_000),
      );
    const endAt = new Date(startAt.getTime() + durationMinutes * 60 * 1000);
    await this.assertScheduleAvailable(
      appointment.doctorId,
      appointment.clinicId,
      appointment.branchId,
      startAt,
      endAt,
      id,
    );

    try {
      const updated = await this.prisma.appointment.update({
        where: { id },
        data: { startAt, endAt },
        select: appointmentSelect,
      });

      await this.auditLogService.create({
        actorUserId: user.id,
        action: 'APPOINTMENT_RESCHEDULED',
        resourceType: 'Appointment',
        resourceId: id,
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
      });

      return updated;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('Doctor is already booked for this time slot.');
      }
      throw error;
    }
  }

  async analytics(user: AuthenticatedUser) {
    this.assertPermission(user, 'reports.read');
    const clinicIds = await this.clinicAccessService.accessibleClinicIds(user);
    const where: Prisma.AppointmentWhereInput = clinicIds ? { clinicId: { in: clinicIds } } : {};
    const grouped = await this.prisma.appointment.groupBy({
      by: ['status'],
      where,
      _count: { status: true },
    });

    return grouped.map((item) => ({ status: item.status, count: item._count.status }));
  }

  async changeStatus(
    id: string,
    toStatus: AppointmentStatus,
    user: AuthenticatedUser,
    context: RequestContext,
    reason?: string,
  ) {
    const appointment = await this.findAppointmentOrThrow(id);
    assertAllowedTransition(appointment.status, toStatus);

    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.appointment.update({
        where: { id },
        data: {
          status: toStatus,
          ...(toStatus === 'CANCELLED' ? { cancellationReason: reason ?? null } : {}),
        },
      });
      await tx.appointmentStatusHistory.create({
        data: {
          appointmentId: id,
          fromStatus: appointment.status,
          toStatus,
          changedByUserId: user.id,
          reason: reason ?? null,
        },
      });
      return tx.appointment.findUniqueOrThrow({ where: { id }, select: appointmentSelect });
    });

    await this.auditStatusChange(id, user, appointment.status, toStatus, context, reason);
    await this.notifyPatient(
      appointment.patient.userId,
      toStatus === 'CANCELLED' ? 'APPOINTMENT_CANCELLED' : 'APPOINTMENT_STATUS_CHANGED',
      `Appointment ${toStatus.toLowerCase().replaceAll('_', ' ')}`,
      `Your appointment status changed to ${toStatus}.`,
    );

    return updated;
  }

  async assertDoctorOwnsAppointment(
    id: string,
    user: AuthenticatedUser,
  ): Promise<AppointmentRecord> {
    const appointment = await this.findAppointmentOrThrow(id);
    if (appointment.doctor.staffProfile.userId !== user.id) {
      throw new ForbiddenException('You are not assigned to this appointment.');
    }
    return appointment;
  }

  private async resolvePatientIdForCreate(patientId: string | undefined, user: AuthenticatedUser) {
    if (user.roles.includes('PATIENT')) {
      const patient = await this.prisma.patientProfile.findUnique({
        where: { userId: user.id },
        select: { id: true },
      });
      if (!patient) {
        throw new NotFoundException('Patient profile not found.');
      }
      return patient.id;
    }

    this.assertPermission(user, 'appointment.create');
    if (!patientId) {
      throw new BadRequestException('patientId is required when staff creates an appointment.');
    }
    return patientId;
  }

  private async assertCanCreateForClinic(user: AuthenticatedUser, clinicId: string): Promise<void> {
    if (user.roles.includes('PATIENT')) {
      return;
    }
    await this.clinicAccessService.assertCanAccessClinic(user, clinicId);
  }

  private async validateAppointmentReferences(input: {
    patientId: string;
    doctorId: string;
    branchId: string;
    serviceId?: string;
  }) {
    const [patient, doctor, branch, service] = await Promise.all([
      this.prisma.patientProfile.findUnique({
        where: { id: input.patientId },
        select: { id: true, clinicId: true },
      }),
      this.prisma.doctorProfile.findUnique({
        where: { id: input.doctorId },
        select: { id: true, staffProfile: { select: { clinicId: true } } },
      }),
      this.prisma.branch.findUnique({
        where: { id: input.branchId },
        select: { id: true, clinicId: true },
      }),
      input.serviceId
        ? this.prisma.clinicService.findUnique({
            where: { id: input.serviceId },
            select: { id: true, clinicId: true, durationMinutes: true },
          })
        : null,
    ]);

    if (!patient) throw new NotFoundException('Patient not found.');
    if (!doctor) throw new NotFoundException('Doctor not found.');
    if (!branch) throw new NotFoundException('Branch not found.');

    const clinicId = patient.clinicId;
    if (doctor.staffProfile.clinicId !== clinicId || branch.clinicId !== clinicId) {
      throw new BadRequestException('Patient, doctor, and branch must belong to the same clinic.');
    }
    if (input.serviceId && (!service || service.clinicId !== clinicId)) {
      throw new NotFoundException('Clinic service not found.');
    }

    return { clinicId, service };
  }

  private async assertScheduleAvailable(
    doctorId: string,
    clinicId: string,
    branchId: string,
    startAt: Date,
    endAt: Date,
    excludeAppointmentId?: string,
  ): Promise<void> {
    const schedules = await this.prisma.doctorSchedule.findMany({
      where: {
        doctorId,
        clinicId,
        branchId,
        isActive: true,
        effectiveFrom: { lte: startAt },
        OR: [{ effectiveUntil: null }, { effectiveUntil: { gte: startAt } }],
      },
      select: { dayOfWeek: true, startsAt: true, endsAt: true },
    });

    assertWithinDoctorSchedule(startAt, endAt, schedules);
    await this.assertNoOverlappingAppointment(doctorId, startAt, endAt, excludeAppointmentId);
  }

  private async assertNoOverlappingAppointment(
    doctorId: string,
    startAt: Date,
    endAt: Date,
    excludeAppointmentId?: string,
  ): Promise<void> {
    const overlappingAppointment = await this.prisma.appointment.findFirst({
      where: {
        doctorId,
        status: { in: BOOKING_BLOCKING_STATUSES },
        startAt: { lt: endAt },
        endAt: { gt: startAt },
        ...(excludeAppointmentId ? { id: { not: excludeAppointmentId } } : {}),
      },
      select: { id: true },
    });

    if (overlappingAppointment) {
      throw new ConflictException('Doctor is already booked for this time range.');
    }
  }

  private async assertStaffCanModify(id: string, user: AuthenticatedUser, permission: string) {
    this.assertPermission(user, permission);
    const appointment = await this.findAppointmentOrThrow(id);
    await this.clinicAccessService.assertCanAccessClinic(user, appointment.clinicId);
  }

  private async assertCanView(user: AuthenticatedUser, appointment: AppointmentRecord) {
    if (
      appointment.patient.userId === user.id ||
      appointment.doctor.staffProfile.userId === user.id
    ) {
      return;
    }

    this.assertPermission(user, 'appointment.read');
    await this.clinicAccessService.assertCanAccessClinic(user, appointment.clinicId);
  }

  private assertPermission(user: AuthenticatedUser, permission: string): void {
    if (!user.permissions.includes(permission)) {
      throw new ForbiddenException(`Missing permission: ${permission}`);
    }
  }

  private async findDoctorIdForUser(userId: string): Promise<string | null> {
    const staff = await this.prisma.staffProfile.findUnique({
      where: { userId },
      select: { doctorProfile: { select: { id: true } } },
    });
    return staff?.doctorProfile?.id ?? null;
  }

  private parseDateInput(value: string, fieldName: string): Date {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException(`${fieldName} must be a valid ISO date.`);
    }
    return date;
  }

  private findAppointmentOrThrow(id: string): Promise<AppointmentRecord> {
    return this.prisma.appointment
      .findUnique({ where: { id }, select: appointmentSelect })
      .then((appointment) => {
        if (!appointment) {
          throw new NotFoundException('Appointment not found.');
        }
        return appointment;
      });
  }

  private async auditStatusChange(
    appointmentId: string,
    user: AuthenticatedUser,
    fromStatus: AppointmentStatus | null,
    toStatus: AppointmentStatus,
    context: RequestContext,
    reason?: string,
  ): Promise<void> {
    await this.auditLogService.create({
      actorUserId: user.id,
      action: 'APPOINTMENT_STATUS_CHANGED',
      resourceType: 'Appointment',
      resourceId: appointmentId,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      metadata: {
        fromStatus,
        toStatus,
        reason: reason ?? null,
      },
    });
  }

  private async notifyPatient(
    userId: string | null,
    type: Parameters<NotificationsService['create']>[0]['type'],
    title: string,
    message: string,
  ): Promise<void> {
    if (!userId) {
      return;
    }
    await this.notificationsService.create({ userId, type, title, message });
  }
}
