import {
  BadRequestException,
  ConflictException,
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
import { PrismaService } from '../prisma/prisma.service';
import type { CreateLabOrderDto } from './dto/create-lab-order.dto';
import type { CreateVisitDto } from './dto/create-visit.dto';
import type { UpdateVisitNotesDto } from './dto/update-visit-notes.dto';

export const visitSelect = Prisma.validator<Prisma.VisitSelect>()({
  id: true,
  clinicId: true,
  appointmentId: true,
  patientId: true,
  doctorId: true,
  status: true,
  diagnosis: true,
  recommendation: true,
  completedAt: true,
  createdAt: true,
  updatedAt: true,
  appointment: { select: { id: true, status: true, startAt: true } },
  patient: {
    select: { id: true, userId: true, firstName: true, lastName: true, medicalRecordNumber: true },
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
  notes: {
    orderBy: { createdAt: 'asc' },
    select: { id: true, type: true, content: true, createdAt: true },
  },
  prescriptions: {
    orderBy: { createdAt: 'asc' },
    select: { id: true, note: true, createdAt: true },
  },
  labOrders: {
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      testName: true,
      instructions: true,
      status: true,
      createdAt: true,
      result: {
        select: {
          id: true,
          status: true,
          resultSummary: true,
          readyAt: true,
          attachment: { select: { id: true, originalName: true, mimeType: true, sizeBytes: true } },
        },
      },
    },
  },
});

export type VisitRecord = Prisma.VisitGetPayload<{ select: typeof visitSelect }>;

@Injectable()
export class VisitsService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AuditLogService) private readonly auditLogService: AuditLogService,
    @Inject(ClinicAccessService) private readonly clinicAccessService: ClinicAccessService,
    @Inject(NotificationsService) private readonly notificationsService: NotificationsService,
  ) {}

  async create(input: CreateVisitDto, user: AuthenticatedUser, context: RequestContext) {
    this.assertPermission(user, 'visit.create');
    const appointment = await this.prisma.appointment.findUnique({
      where: { id: input.appointmentId },
      select: {
        id: true,
        clinicId: true,
        patientId: true,
        doctorId: true,
        status: true,
        doctor: { select: { staffProfile: { select: { userId: true } } } },
      },
    });
    if (!appointment) {
      throw new NotFoundException('Appointment not found.');
    }
    if (appointment.doctor.staffProfile.userId !== user.id) {
      throw new ForbiddenException('Only the assigned doctor can create this visit.');
    }
    if (!['IN_CONSULTATION', 'LAB_REQUIRED'].includes(appointment.status)) {
      throw new BadRequestException('Visit records require an active consultation appointment.');
    }

    try {
      const visit = await this.prisma.$transaction(async (tx) => {
        const created = await tx.visit.create({
          data: {
            clinicId: appointment.clinicId,
            appointmentId: appointment.id,
            patientId: appointment.patientId,
            doctorId: appointment.doctorId,
            diagnosis: input.diagnosisNote ?? null,
            recommendation: input.recommendation ?? null,
          },
          select: visitSelect,
        });
        if (input.diagnosisNote) {
          await tx.visitNote.create({
            data: {
              visitId: created.id,
              type: 'DIAGNOSIS',
              content: input.diagnosisNote,
              createdByUserId: user.id,
            },
          });
        }
        if (input.recommendation) {
          await tx.visitNote.create({
            data: {
              visitId: created.id,
              type: 'RECOMMENDATION',
              content: input.recommendation,
              createdByUserId: user.id,
            },
          });
        }
        if (input.prescriptionNote) {
          await tx.prescription.create({
            data: { visitId: created.id, note: input.prescriptionNote, createdByUserId: user.id },
          });
        }
        return created;
      });

      await this.auditMedicalAction(user, 'VISIT_CREATED', visit.id, context, visit.patientId);
      return this.findByIdOrThrow(visit.id);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('A visit already exists for this appointment.');
      }
      throw error;
    }
  }

  async getById(id: string, user: AuthenticatedUser, context: RequestContext) {
    const visit = await this.findByIdOrThrow(id);
    await this.assertCanViewVisit(user, visit);
    await this.auditMedicalAction(user, 'VISIT_VIEWED', visit.id, context, visit.patientId);
    return visit;
  }

  async updateNotes(
    id: string,
    input: UpdateVisitNotesDto,
    user: AuthenticatedUser,
    context: RequestContext,
  ) {
    const visit = await this.assertDoctorCanUpdateVisit(id, user);
    if (!input.diagnosisNote && !input.recommendation) {
      throw new BadRequestException('At least one note field is required.');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.visit.update({
        where: { id },
        data: {
          ...(input.diagnosisNote ? { diagnosis: input.diagnosisNote } : {}),
          ...(input.recommendation ? { recommendation: input.recommendation } : {}),
        },
      });
      if (input.diagnosisNote) {
        await tx.visitNote.create({
          data: {
            visitId: id,
            type: 'DIAGNOSIS',
            content: input.diagnosisNote,
            createdByUserId: user.id,
          },
        });
      }
      if (input.recommendation) {
        await tx.visitNote.create({
          data: {
            visitId: id,
            type: 'RECOMMENDATION',
            content: input.recommendation,
            createdByUserId: user.id,
          },
        });
      }
    });

    await this.auditMedicalAction(user, 'VISIT_UPDATED', id, context, visit.patientId);
    return this.findByIdOrThrow(id);
  }

  async createLabOrder(
    id: string,
    input: CreateLabOrderDto,
    user: AuthenticatedUser,
    context: RequestContext,
  ) {
    const visit = await this.assertDoctorCanUpdateVisit(id, user);
    const order = await this.prisma.labOrder.create({
      data: {
        clinicId: visit.clinicId,
        visitId: visit.id,
        patientId: visit.patientId,
        doctorId: visit.doctorId,
        testName: input.testName,
        instructions: input.instructions ?? null,
        orderedByUserId: user.id,
      },
    });

    await this.auditMedicalAction(user, 'LAB_ORDER_CREATED', order.id, context, visit.patientId);
    return this.findByIdOrThrow(id);
  }

  async complete(id: string, user: AuthenticatedUser, context: RequestContext) {
    const visit = await this.assertDoctorCanUpdateVisit(id, user);
    const updated = await this.prisma.visit.update({
      where: { id },
      data: { status: 'COMPLETED', completedAt: new Date() },
      select: visitSelect,
    });
    await this.auditMedicalAction(user, 'VISIT_COMPLETED', id, context, visit.patientId);
    await this.notifyPatient(
      updated.patient.userId,
      'Visit summary available',
      'Your visit summary is available in the patient portal.',
    );
    return updated;
  }

  async assertDoctorCanUpdateVisit(id: string, user: AuthenticatedUser): Promise<VisitRecord> {
    this.assertPermission(user, 'visit.update');
    const visit = await this.findByIdOrThrow(id);
    if (visit.doctor.staffProfile.userId !== user.id) {
      throw new ForbiddenException('Only the assigned doctor can update this visit.');
    }
    if (visit.status === 'COMPLETED') {
      throw new BadRequestException('Completed visits cannot be changed.');
    }
    return visit;
  }

  private async assertCanViewVisit(user: AuthenticatedUser, visit: VisitRecord): Promise<void> {
    if (visit.patient.userId === user.id || visit.doctor.staffProfile.userId === user.id) {
      return;
    }
    if (!user.permissions.includes('visit.read')) {
      throw new ForbiddenException('Missing permission: visit.read');
    }
    await this.clinicAccessService.assertCanAccessClinic(user, visit.clinicId);
  }

  private findByIdOrThrow(id: string): Promise<VisitRecord> {
    return this.prisma.visit.findUnique({ where: { id }, select: visitSelect }).then((visit) => {
      if (!visit) {
        throw new NotFoundException('Visit not found.');
      }
      return visit;
    });
  }

  private assertPermission(user: AuthenticatedUser, permission: string): void {
    if (!user.permissions.includes(permission)) {
      throw new ForbiddenException(`Missing permission: ${permission}`);
    }
  }

  private async auditMedicalAction(
    user: AuthenticatedUser,
    action: string,
    resourceId: string,
    context: RequestContext,
    patientId: string,
  ): Promise<void> {
    await this.auditLogService.create({
      actorUserId: user.id,
      action,
      resourceType: 'MedicalRecord',
      resourceId,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      metadata: { patientId },
    });
  }

  private async notifyPatient(
    userId: string | null,
    title: string,
    message: string,
  ): Promise<void> {
    if (!userId) return;
    await this.notificationsService.create({
      userId,
      type: 'APPOINTMENT_STATUS_CHANGED',
      title,
      message,
    });
  }
}
