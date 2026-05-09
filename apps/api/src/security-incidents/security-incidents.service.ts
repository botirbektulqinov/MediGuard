import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { SecurityIncidentStatus } from '@prisma/client';
import type { Prisma } from '@prisma/client';

import { AuditLogService } from '../audit-log/audit-log.service';
import type { AuthenticatedUser, RequestContext } from '../auth/types/authenticated-user';
import { PrismaService } from '../prisma/prisma.service';
import { securityIncidentSelect } from '../security-center/security-selects';
import type { CreateSecurityIncidentDto } from './dto/create-security-incident.dto';
import type { UpdateSecurityIncidentDto } from './dto/update-security-incident.dto';

@Injectable()
export class SecurityIncidentsService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AuditLogService) private readonly auditLogService: AuditLogService,
  ) {}

  list() {
    return this.prisma.securityIncident.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100,
      select: securityIncidentSelect,
    });
  }

  async getById(id: string) {
    const incident = await this.prisma.securityIncident.findUnique({
      where: { id },
      select: securityIncidentSelect,
    });
    if (!incident) {
      throw new NotFoundException('Security incident not found.');
    }
    return incident;
  }

  async create(input: CreateSecurityIncidentDto, user: AuthenticatedUser, context: RequestContext) {
    if (input.sourceEventId) {
      const [sourceEvent, existingIncident] = await Promise.all([
        this.prisma.suspiciousActivityEvent.findUnique({
          where: { id: input.sourceEventId },
          select: { id: true },
        }),
        this.prisma.securityIncident.findUnique({
          where: { sourceEventId: input.sourceEventId },
          select: { id: true },
        }),
      ]);
      if (!sourceEvent) {
        throw new NotFoundException('Suspicious activity event not found.');
      }
      if (existingIncident) {
        throw new ConflictException('Suspicious activity event already has an incident.');
      }
    }
    if (input.assignedToUserId) {
      await this.assertActiveAssignee(input.assignedToUserId);
    }

    const incident = await this.prisma.$transaction(async (tx) => {
      const created = await tx.securityIncident.create({
        data: {
          title: input.title,
          description: input.description,
          severity: input.severity,
          sourceEventId: input.sourceEventId ?? null,
          assignedToUserId: input.assignedToUserId ?? null,
          createdByUserId: user.id,
        },
        select: securityIncidentSelect,
      });
      if (input.sourceEventId) {
        await tx.suspiciousActivityEvent.update({
          where: { id: input.sourceEventId },
          data: { status: 'LINKED_TO_INCIDENT' },
        });
      }
      return created;
    });

    await this.auditLogService.create({
      actorUserId: user.id,
      action: 'SECURITY_INCIDENT_CREATED',
      resourceType: 'SecurityIncident',
      resourceId: incident.id,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      metadata: { severity: incident.severity, sourceEventId: incident.sourceEventId },
    });
    return incident;
  }

  async update(
    id: string,
    input: UpdateSecurityIncidentDto,
    user: AuthenticatedUser,
    context: RequestContext,
  ) {
    await this.getById(id);
    if (input.assignedToUserId) {
      await this.assertActiveAssignee(input.assignedToUserId);
    }

    const resolvedStatuses: SecurityIncidentStatus[] = [
      SecurityIncidentStatus.RESOLVED,
      SecurityIncidentStatus.FALSE_POSITIVE,
    ];
    const data: Prisma.SecurityIncidentUncheckedUpdateInput = {
      ...(input.status ? { status: input.status } : {}),
      ...(input.severity ? { severity: input.severity } : {}),
      ...(input.assignedToUserId ? { assignedToUserId: input.assignedToUserId } : {}),
      ...(input.remediationNotes ? { remediationNotes: input.remediationNotes } : {}),
      ...(input.status
        ? {
            resolvedAt: resolvedStatuses.includes(input.status) ? new Date() : null,
          }
        : {}),
    };
    const incident = await this.prisma.securityIncident.update({
      where: { id },
      data,
      select: securityIncidentSelect,
    });

    await this.auditLogService.create({
      actorUserId: user.id,
      action: 'SECURITY_INCIDENT_UPDATED',
      resourceType: 'SecurityIncident',
      resourceId: id,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      metadata: {
        status: input.status,
        severity: input.severity,
        assignedToUserId: input.assignedToUserId,
      },
    });
    return incident;
  }

  private async assertActiveAssignee(userId: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, status: true },
    });
    if (!user) {
      throw new NotFoundException('Assigned user not found.');
    }
    if (user.status !== 'ACTIVE') {
      throw new BadRequestException('Incidents can only be assigned to active users.');
    }
  }
}
