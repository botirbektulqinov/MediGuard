import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';

import { AuditLogService } from '../audit-log/audit-log.service';
import type { AuthenticatedUser, RequestContext } from '../auth/types/authenticated-user';
import { LabResultsService } from '../lab-results/lab-results.service';
import { PrismaService } from '../prisma/prisma.service';
import { visitSelect } from '../visits/visits.service';

@Injectable()
export class PatientPortalService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AuditLogService) private readonly auditLogService: AuditLogService,
    @Inject(LabResultsService) private readonly labResultsService: LabResultsService,
  ) {}

  async visitHistory(user: AuthenticatedUser, context: RequestContext) {
    const patient = await this.findOwnPatient(user);
    const visits = await this.prisma.visit.findMany({
      where: { patientId: patient.id, status: 'COMPLETED' },
      orderBy: { createdAt: 'desc' },
      select: visitSelect,
    });
    await this.auditLogService.create({
      actorUserId: user.id,
      action: 'PATIENT_PORTAL_VISITS_VIEWED',
      resourceType: 'MedicalRecord',
      resourceId: patient.id,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      metadata: { patientId: patient.id },
    });
    return visits;
  }

  async labResults(user: AuthenticatedUser, context: RequestContext) {
    return this.labResultsService.listPatientResults(user, context);
  }

  async labResultById(id: string, user: AuthenticatedUser, context: RequestContext) {
    const result = await this.labResultsService.getById(id, user, context);
    if (result.patient.userId !== user.id) {
      throw new ForbiddenException('You cannot access this lab result.');
    }
    return result;
  }

  private async findOwnPatient(user: AuthenticatedUser): Promise<{ id: string }> {
    const patient = await this.prisma.patientProfile.findUnique({
      where: { userId: user.id },
      select: { id: true },
    });
    if (!patient) {
      throw new NotFoundException('Patient profile not found.');
    }
    return patient;
  }
}
