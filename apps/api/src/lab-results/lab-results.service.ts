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
import { FilesService } from '../files/files.service';
import type { UploadedMedicalFile } from '../files/file-upload.types';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import type { UploadLabResultDto } from './dto/upload-lab-result.dto';

const labOrderSelect = Prisma.validator<Prisma.LabOrderSelect>()({
  id: true,
  clinicId: true,
  visitId: true,
  patientId: true,
  doctorId: true,
  testName: true,
  instructions: true,
  status: true,
  createdAt: true,
  patient: { select: { userId: true, firstName: true, lastName: true, medicalRecordNumber: true } },
  doctor: {
    select: {
      staffProfile: {
        select: {
          userId: true,
          user: { select: { firstName: true, lastName: true, email: true } },
        },
      },
    },
  },
  result: {
    select: {
      id: true,
      status: true,
      resultSummary: true,
      readyAt: true,
      attachment: { select: { id: true, originalName: true, mimeType: true, sizeBytes: true } },
    },
  },
});

const labResultSelect = Prisma.validator<Prisma.LabResultSelect>()({
  id: true,
  clinicId: true,
  labOrderId: true,
  patientId: true,
  status: true,
  resultSummary: true,
  readyAt: true,
  createdAt: true,
  updatedAt: true,
  patient: { select: { userId: true, firstName: true, lastName: true, medicalRecordNumber: true } },
  labOrder: {
    select: {
      id: true,
      testName: true,
      instructions: true,
      status: true,
      visitId: true,
      doctor: {
        select: {
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
  attachment: { select: { id: true, originalName: true, mimeType: true, sizeBytes: true } },
});

type LabOrderRecord = Prisma.LabOrderGetPayload<{ select: typeof labOrderSelect }>;
type LabResultRecord = Prisma.LabResultGetPayload<{ select: typeof labResultSelect }>;

@Injectable()
export class LabResultsService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(FilesService) private readonly filesService: FilesService,
    @Inject(AuditLogService) private readonly auditLogService: AuditLogService,
    @Inject(ClinicAccessService) private readonly clinicAccessService: ClinicAccessService,
    @Inject(NotificationsService) private readonly notificationsService: NotificationsService,
  ) {}

  async listOrders(user: AuthenticatedUser) {
    this.assertPermission(user, 'lab.read');
    const clinicIds = await this.clinicAccessService.accessibleClinicIds(user);
    return this.prisma.labOrder.findMany({
      where: clinicIds ? { clinicId: { in: clinicIds } } : {},
      orderBy: { createdAt: 'desc' },
      take: 100,
      select: labOrderSelect,
    });
  }

  async uploadResult(
    orderId: string,
    input: UploadLabResultDto,
    file: UploadedMedicalFile | undefined,
    user: AuthenticatedUser,
    context: RequestContext,
  ) {
    this.assertPermission(user, 'lab.upload');
    if (!file) {
      throw new BadRequestException('Lab result file is required.');
    }
    this.filesService.assertAllowedUpload(file);
    const order = await this.findOrderOrThrow(orderId);
    await this.clinicAccessService.assertCanAccessClinic(user, order.clinicId);
    if (order.status === 'READY') {
      throw new ConflictException('This lab order is already ready.');
    }
    if (order.result) {
      throw new ConflictException('This lab order already has a result.');
    }

    let resultId: string | null = null;
    try {
      const result = await this.prisma.labResult.create({
        data: {
          clinicId: order.clinicId,
          labOrderId: order.id,
          patientId: order.patientId,
          uploadedByUserId: user.id,
          resultSummary: input.resultSummary ?? null,
        },
        select: labResultSelect,
      });
      resultId = result.id;

      await this.filesService.storeLabResultAttachment({
        clinicId: order.clinicId,
        patientId: order.patientId,
        labResultId: result.id,
        uploadedByUserId: user.id,
        file,
      });
      await this.prisma.labOrder.update({
        where: { id: order.id },
        data: { status: 'RESULT_UPLOADED' },
      });
      await this.auditMedicalAction(
        user,
        'LAB_RESULT_UPLOADED',
        result.id,
        context,
        order.patientId,
      );
      return this.findResultOrThrow(result.id);
    } catch (error) {
      if (resultId) {
        await this.prisma.labResult.delete({ where: { id: resultId } }).catch(() => undefined);
      }
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('This lab order already has a result.');
      }
      throw error;
    }
  }

  async markReady(id: string, user: AuthenticatedUser, context: RequestContext) {
    this.assertPermission(user, 'lab.publish');
    const result = await this.findResultOrThrow(id);
    await this.clinicAccessService.assertCanAccessClinic(user, result.clinicId);
    if (!result.attachment) {
      throw new BadRequestException('A lab result attachment is required before publishing.');
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.labResult.update({
        where: { id },
        data: { status: 'READY', readyAt: new Date() },
      });
      await tx.labOrder.update({ where: { id: result.labOrderId }, data: { status: 'READY' } });
      return tx.labResult.findUniqueOrThrow({ where: { id }, select: labResultSelect });
    });

    await this.auditMedicalAction(user, 'LAB_RESULT_READY', id, context, result.patientId);
    await this.notifyPatient(updated.patient.userId);
    return updated;
  }

  async getById(id: string, user: AuthenticatedUser, context: RequestContext) {
    const result = await this.findResultOrThrow(id);
    await this.assertCanViewResult(user, result);
    await this.auditMedicalAction(user, 'LAB_RESULT_VIEWED', id, context, result.patientId);
    return result;
  }

  async listPatientResults(user: AuthenticatedUser, context: RequestContext) {
    const patient = await this.prisma.patientProfile.findUnique({
      where: { userId: user.id },
      select: { id: true },
    });
    if (!patient) {
      throw new NotFoundException('Patient profile not found.');
    }
    const results = await this.prisma.labResult.findMany({
      where: { patientId: patient.id, status: 'READY' },
      orderBy: { createdAt: 'desc' },
      select: labResultSelect,
    });
    await this.auditMedicalAction(
      user,
      'PATIENT_PORTAL_LAB_RESULTS_VIEWED',
      patient.id,
      context,
      patient.id,
    );
    return results;
  }

  private async assertCanViewResult(user: AuthenticatedUser, result: LabResultRecord) {
    if (result.patient.userId === user.id && result.status === 'READY') {
      return;
    }
    if (result.labOrder.doctor.staffProfile.userId === user.id) {
      return;
    }
    if (user.permissions.includes('lab.read')) {
      await this.clinicAccessService.assertCanAccessClinic(user, result.clinicId);
      return;
    }
    throw new ForbiddenException('You cannot access this lab result.');
  }

  private async findOrderOrThrow(id: string): Promise<LabOrderRecord> {
    const order = await this.prisma.labOrder.findUnique({ where: { id }, select: labOrderSelect });
    if (!order) {
      throw new NotFoundException('Lab order not found.');
    }
    return order;
  }

  private async findResultOrThrow(id: string): Promise<LabResultRecord> {
    const result = await this.prisma.labResult.findUnique({
      where: { id },
      select: labResultSelect,
    });
    if (!result) {
      throw new NotFoundException('Lab result not found.');
    }
    return result;
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

  private async notifyPatient(userId: string | null): Promise<void> {
    if (!userId) return;
    await this.notificationsService.create({
      userId,
      type: 'LAB_RESULT_READY',
      title: 'Lab result ready',
      message: 'A lab result is ready in your patient portal.',
    });
  }
}
