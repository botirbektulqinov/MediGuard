import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { AuditLogService } from '../audit-log/audit-log.service';
import type { AuthenticatedUser, RequestContext } from '../auth/types/authenticated-user';
import { ClinicAccessService } from '../clinics/clinic-access.service';
import { NotificationsService } from '../notifications/notifications.service';
import { AppointmentsService } from '../appointments/appointments.service';
import { PrismaService } from '../prisma/prisma.service';

const queueSelect = Prisma.validator<Prisma.QueueEntrySelect>()({
  id: true,
  clinicId: true,
  branchId: true,
  appointmentId: true,
  patientId: true,
  doctorId: true,
  status: true,
  position: true,
  arrivedAt: true,
  calledAt: true,
  completedAt: true,
  createdAt: true,
  updatedAt: true,
  appointment: {
    select: {
      id: true,
      status: true,
      startAt: true,
      patient: {
        select: { id: true, firstName: true, lastName: true, medicalRecordNumber: true },
      },
      doctor: {
        select: {
          id: true,
          specialty: true,
          staffProfile: {
            select: {
              userId: true,
              user: { select: { firstName: true, lastName: true, email: true } },
            },
          },
        },
      },
    },
  },
});

@Injectable()
export class QueueService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AuditLogService) private readonly auditLogService: AuditLogService,
    @Inject(ClinicAccessService) private readonly clinicAccessService: ClinicAccessService,
    @Inject(AppointmentsService) private readonly appointmentsService: AppointmentsService,
    @Inject(NotificationsService) private readonly notificationsService: NotificationsService,
  ) {}

  async listToday(user: AuthenticatedUser) {
    const todayStart = new Date();
    todayStart.setUTCHours(0, 0, 0, 0);
    const todayEnd = new Date(todayStart);
    todayEnd.setUTCDate(todayEnd.getUTCDate() + 1);

    const where: Prisma.QueueEntryWhereInput = {
      createdAt: { gte: todayStart, lt: todayEnd },
    };

    if (user.roles.includes('DOCTOR')) {
      const doctor = await this.findDoctorForUser(user.id);
      where.doctorId = doctor?.id ?? '__none__';
    } else {
      this.assertPermission(user, 'queue.read');
      const clinicIds = await this.clinicAccessService.accessibleClinicIds(user);
      if (clinicIds) {
        where.clinicId = { in: clinicIds };
      }
    }

    return this.prisma.queueEntry.findMany({
      where,
      orderBy: [{ status: 'asc' }, { position: 'asc' }],
      select: queueSelect,
    });
  }

  async enqueue(appointmentId: string, user: AuthenticatedUser, context: RequestContext) {
    this.assertPermission(user, 'queue.manage');
    const appointment = await this.appointmentsService.getById(appointmentId, user);
    await this.clinicAccessService.assertCanAccessClinic(user, appointment.clinicId);
    if (appointment.status !== 'ARRIVED') {
      throw new BadRequestException('Only arrived appointments can be added to the queue.');
    }

    const nextPosition = await this.nextQueuePosition(appointment.clinicId, appointment.branchId);
    try {
      const queueEntry = await this.prisma.queueEntry.create({
        data: {
          clinicId: appointment.clinicId,
          branchId: appointment.branchId,
          appointmentId,
          patientId: appointment.patientId,
          doctorId: appointment.doctorId,
          position: nextPosition,
        },
        select: queueSelect,
      });

      await this.appointmentsService.changeStatus(
        appointmentId,
        'IN_QUEUE',
        user,
        context,
        'Patient added to queue',
      );
      await this.auditQueueAction(user, queueEntry.id, 'QUEUE_ENTRY_CREATED', context);
      await this.notifyPatient(
        appointment.patient.userId,
        'Queue updated',
        'You have been added to the queue.',
      );

      return this.findQueueEntryOrThrow(queueEntry.id);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new BadRequestException('Appointment is already in the queue.');
      }
      throw error;
    }
  }

  async startConsultation(id: string, user: AuthenticatedUser, context: RequestContext) {
    const queueEntry = await this.findQueueEntryOrThrow(id);
    await this.assertDoctorCanManageQueueEntry(queueEntry.appointmentId, user);
    if (queueEntry.status !== 'WAITING') {
      throw new BadRequestException('Only waiting queue entries can be started.');
    }

    await this.prisma.queueEntry.update({
      where: { id },
      data: { status: 'IN_CONSULTATION', calledAt: new Date() },
    });
    await this.appointmentsService.changeStatus(
      queueEntry.appointmentId,
      'IN_CONSULTATION',
      user,
      context,
      'Consultation started',
    );
    await this.auditQueueAction(user, id, 'QUEUE_CONSULTATION_STARTED', context);

    return this.findQueueEntryOrThrow(id);
  }

  async markLabRequired(id: string, user: AuthenticatedUser, context: RequestContext) {
    const queueEntry = await this.findQueueEntryOrThrow(id);
    await this.assertDoctorCanManageQueueEntry(queueEntry.appointmentId, user);
    if (queueEntry.status !== 'IN_CONSULTATION') {
      throw new BadRequestException('Only in-consultation queue entries can require lab work.');
    }

    await this.prisma.queueEntry.update({ where: { id }, data: { status: 'LAB_REQUIRED' } });
    await this.appointmentsService.changeStatus(
      queueEntry.appointmentId,
      'LAB_REQUIRED',
      user,
      context,
      'Lab required',
    );
    await this.auditQueueAction(user, id, 'QUEUE_LAB_REQUIRED', context);

    return this.findQueueEntryOrThrow(id);
  }

  async complete(id: string, user: AuthenticatedUser, context: RequestContext) {
    const queueEntry = await this.findQueueEntryOrThrow(id);
    await this.assertDoctorCanManageQueueEntry(queueEntry.appointmentId, user);
    if (!['IN_CONSULTATION', 'LAB_REQUIRED'].includes(queueEntry.status)) {
      throw new BadRequestException(
        'Only in-consultation or lab-required queue entries can be completed.',
      );
    }

    await this.prisma.queueEntry.update({
      where: { id },
      data: { status: 'COMPLETED', completedAt: new Date() },
    });
    await this.appointmentsService.changeStatus(
      queueEntry.appointmentId,
      'COMPLETED',
      user,
      context,
      'Consultation completed',
    );
    await this.auditQueueAction(user, id, 'QUEUE_CONSULTATION_COMPLETED', context);

    return this.findQueueEntryOrThrow(id);
  }

  private async nextQueuePosition(clinicId: string, branchId: string): Promise<number> {
    const start = new Date();
    start.setUTCHours(0, 0, 0, 0);
    const last = await this.prisma.queueEntry.findFirst({
      where: { clinicId, branchId, createdAt: { gte: start } },
      orderBy: { position: 'desc' },
      select: { position: true },
    });
    return (last?.position ?? 0) + 1;
  }

  private async findQueueEntryOrThrow(id: string) {
    const entry = await this.prisma.queueEntry.findUnique({ where: { id }, select: queueSelect });
    if (!entry) {
      throw new NotFoundException('Queue entry not found.');
    }
    return entry;
  }

  private async assertDoctorCanManageQueueEntry(appointmentId: string, user: AuthenticatedUser) {
    if (!user.roles.includes('DOCTOR')) {
      throw new ForbiddenException('Only assigned doctors can manage consultations.');
    }
    await this.appointmentsService.assertDoctorOwnsAppointment(appointmentId, user);
  }

  private async findDoctorForUser(userId: string) {
    return this.prisma.doctorProfile.findFirst({
      where: { staffProfile: { userId } },
      select: { id: true },
    });
  }

  private assertPermission(user: AuthenticatedUser, permission: string): void {
    if (!user.permissions.includes(permission)) {
      throw new ForbiddenException(`Missing permission: ${permission}`);
    }
  }

  private async auditQueueAction(
    user: AuthenticatedUser,
    queueEntryId: string,
    action: string,
    context: RequestContext,
  ): Promise<void> {
    await this.auditLogService.create({
      actorUserId: user.id,
      action,
      resourceType: 'QueueEntry',
      resourceId: queueEntryId,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    });
  }

  private async notifyPatient(
    userId: string | null,
    title: string,
    message: string,
  ): Promise<void> {
    if (!userId) {
      return;
    }
    await this.notificationsService.create({
      userId,
      type: 'QUEUE_UPDATED',
      title,
      message,
    });
  }
}
