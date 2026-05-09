import { Inject, Injectable } from '@nestjs/common';

import { AuditLogService } from '../audit-log/audit-log.service';
import type { AuthenticatedUser, RequestContext } from '../auth/types/authenticated-user';
import { PrismaService } from '../prisma/prisma.service';
import { VisitsService } from '../visits/visits.service';
import type { CreatePrescriptionDto } from './dto/create-prescription.dto';

@Injectable()
export class PrescriptionsService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(VisitsService) private readonly visitsService: VisitsService,
    @Inject(AuditLogService) private readonly auditLogService: AuditLogService,
  ) {}

  async create(
    visitId: string,
    input: CreatePrescriptionDto,
    user: AuthenticatedUser,
    context: RequestContext,
  ) {
    const visit = await this.visitsService.assertDoctorCanUpdateVisit(visitId, user);
    const prescription = await this.prisma.prescription.create({
      data: { visitId, note: input.note, createdByUserId: user.id },
      select: { id: true, visitId: true, note: true, createdAt: true },
    });

    await this.auditLogService.create({
      actorUserId: user.id,
      action: 'PRESCRIPTION_CREATED',
      resourceType: 'MedicalRecord',
      resourceId: prescription.id,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      metadata: { patientId: visit.patientId, visitId },
    });

    return prescription;
  }
}
