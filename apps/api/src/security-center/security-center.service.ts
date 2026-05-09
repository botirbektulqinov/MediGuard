import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { AuditLogService } from '../audit-log/audit-log.service';
import type { AuthenticatedUser, RequestContext } from '../auth/types/authenticated-user';
import { PrismaService } from '../prisma/prisma.service';
import type { AuditLogQueryDto } from './dto/audit-log-query.dto';
import type { CreateSecurityFindingDto } from './dto/create-security-finding.dto';
import type { UpdateSecurityFindingDto } from './dto/update-security-finding.dto';
import { securityFindingSelect } from './security-selects';

@Injectable()
export class SecurityCenterService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AuditLogService) private readonly auditLogService: AuditLogService,
  ) {}

  async dashboard() {
    const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const [failedLogins24h, openEvents, openIncidents, criticalFindings, activeSessions] =
      await Promise.all([
        this.prisma.loginAttempt.count({ where: { success: false, createdAt: { gte: since24h } } }),
        this.prisma.suspiciousActivityEvent.count({ where: { status: 'OPEN' } }),
        this.prisma.securityIncident.count({
          where: { status: { in: ['DETECTED', 'INVESTIGATING', 'CONTAINED'] } },
        }),
        this.prisma.securityFinding.count({
          where: { severity: 'CRITICAL', status: { in: ['OPEN', 'ACCEPTED_RISK'] } },
        }),
        this.prisma.session.count({ where: { status: 'ACTIVE', expiresAt: { gt: new Date() } } }),
      ]);

    return { failedLogins24h, openEvents, openIncidents, criticalFindings, activeSessions };
  }

  failedLogins() {
    return this.prisma.loginAttempt.findMany({
      where: { success: false },
      orderBy: { createdAt: 'desc' },
      take: 100,
      select: {
        id: true,
        email: true,
        userId: true,
        ipAddress: true,
        userAgent: true,
        failureReason: true,
        createdAt: true,
        user: { select: { id: true, email: true, firstName: true, lastName: true, status: true } },
      },
    });
  }

  sensitivePatientAccessLogs() {
    return this.prisma.auditLog.findMany({
      where: {
        OR: [
          { action: { startsWith: 'PATIENT_' } },
          { action: { startsWith: 'PATIENT_PORTAL_' } },
          { action: { startsWith: 'LAB_RESULT_' } },
          { action: { startsWith: 'VISIT_' } },
          { action: { startsWith: 'FILE_ATTACHMENT_' } },
        ],
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
      select: this.auditLogSelect(),
    });
  }

  auditLogs(query: AuditLogQueryDto) {
    const where: Prisma.AuditLogWhereInput = {};
    if (query.action) {
      where.action = { contains: query.action, mode: 'insensitive' };
    }
    if (query.resourceType) {
      where.resourceType = { contains: query.resourceType, mode: 'insensitive' };
    }
    if (query.actorUserId) {
      where.actorUserId = query.actorUserId;
    }
    if (query.from || query.to) {
      const from = query.from ? new Date(query.from) : undefined;
      const to = query.to ? new Date(query.to) : undefined;
      if (from && to && from > to) {
        throw new BadRequestException('Audit log from date must be before to date.');
      }
      where.createdAt = {
        ...(from ? { gte: from } : {}),
        ...(to ? { lte: to } : {}),
      };
    }

    return this.prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 150,
      select: this.auditLogSelect(),
    });
  }

  sessions() {
    return this.prisma.session.findMany({
      orderBy: { lastSeenAt: 'desc' },
      take: 100,
      select: {
        id: true,
        status: true,
        ipAddress: true,
        userAgent: true,
        createdAt: true,
        lastSeenAt: true,
        revokedAt: true,
        expiresAt: true,
        user: { select: { id: true, email: true, firstName: true, lastName: true, status: true } },
      },
    });
  }

  async revokeSession(id: string, user: AuthenticatedUser, context: RequestContext) {
    const session = await this.prisma.session.findUnique({
      where: { id },
      select: { id: true, familyId: true },
    });
    if (!session) {
      throw new NotFoundException('Session not found.');
    }

    const revokedAt = new Date();
    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.refreshToken.updateMany({
        where: { familyId: session.familyId, revokedAt: null },
        data: { revokedAt },
      });
      return tx.session.update({
        where: { id },
        data: { status: 'REVOKED', revokedAt },
        select: {
          id: true,
          status: true,
          revokedAt: true,
          user: { select: { id: true, email: true } },
        },
      });
    });

    await this.auditLogService.create({
      actorUserId: user.id,
      action: 'SECURITY_SESSION_REVOKED',
      resourceType: 'Session',
      resourceId: id,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      metadata: { targetUserId: updated.user.id },
    });
    return updated;
  }

  findings() {
    return this.prisma.securityFinding.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100,
      select: securityFindingSelect,
    });
  }

  async createFinding(
    input: CreateSecurityFindingDto,
    user: AuthenticatedUser,
    context: RequestContext,
  ) {
    if (input.incidentId) {
      await this.assertIncidentExists(input.incidentId);
    }
    const finding = await this.prisma.securityFinding.create({
      data: {
        title: input.title,
        description: input.description,
        severity: input.severity,
        affectedModule: input.affectedModule,
        evidence: input.evidence ? (input.evidence as Prisma.InputJsonValue) : Prisma.JsonNull,
        remediation: input.remediation ?? null,
        incidentId: input.incidentId ?? null,
        createdByUserId: user.id,
      },
      select: securityFindingSelect,
    });
    await this.auditLogService.create({
      actorUserId: user.id,
      action: 'SECURITY_FINDING_CREATED',
      resourceType: 'SecurityFinding',
      resourceId: finding.id,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      metadata: { severity: finding.severity, affectedModule: finding.affectedModule },
    });
    return finding;
  }

  async updateFinding(
    id: string,
    input: UpdateSecurityFindingDto,
    user: AuthenticatedUser,
    context: RequestContext,
  ) {
    const existing = await this.prisma.securityFinding.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!existing) {
      throw new NotFoundException('Security finding not found.');
    }
    const data: Prisma.SecurityFindingUncheckedUpdateInput = {
      ...(input.severity ? { severity: input.severity } : {}),
      ...(input.status ? { status: input.status } : {}),
      ...(input.remediation ? { remediation: input.remediation } : {}),
      ...(input.evidence ? { evidence: input.evidence as Prisma.InputJsonValue } : {}),
    };
    const finding = await this.prisma.securityFinding.update({
      where: { id },
      data,
      select: securityFindingSelect,
    });
    await this.auditLogService.create({
      actorUserId: user.id,
      action: 'SECURITY_FINDING_UPDATED',
      resourceType: 'SecurityFinding',
      resourceId: id,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      metadata: { status: input.status, severity: input.severity },
    });
    return finding;
  }

  private async assertIncidentExists(id: string): Promise<void> {
    const incident = await this.prisma.securityIncident.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!incident) {
      throw new NotFoundException('Security incident not found.');
    }
  }

  private auditLogSelect() {
    return {
      id: true,
      actorUserId: true,
      action: true,
      resourceType: true,
      resourceId: true,
      ipAddress: true,
      userAgent: true,
      metadata: true,
      createdAt: true,
      actor: { select: { id: true, email: true, firstName: true, lastName: true, status: true } },
    } satisfies Prisma.AuditLogSelect;
  }
}
