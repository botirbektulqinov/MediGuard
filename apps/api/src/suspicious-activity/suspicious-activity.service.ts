import { Inject, Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';

import { AuditLogService } from '../audit-log/audit-log.service';
import type { AuthenticatedUser, RequestContext } from '../auth/types/authenticated-user';
import { PrismaService } from '../prisma/prisma.service';
import {
  suspiciousActivityEventSelect,
  suspiciousActivityRuleSelect,
} from '../security-center/security-selects';
import {
  evaluateSuspiciousActivity,
  type SuspiciousActivityCandidate,
} from './suspicious-activity-evaluator';
import { defaultSuspiciousActivityRules } from './suspicious-activity-rules';

@Injectable()
export class SuspiciousActivityService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AuditLogService) private readonly auditLogService: AuditLogService,
  ) {}

  async listRules() {
    await this.ensureDefaultRules();
    return this.prisma.suspiciousActivityRule.findMany({
      orderBy: { type: 'asc' },
      select: suspiciousActivityRuleSelect,
    });
  }

  async listEvents() {
    return this.prisma.suspiciousActivityEvent.findMany({
      orderBy: { occurredAt: 'desc' },
      take: 100,
      select: suspiciousActivityEventSelect,
    });
  }

  async evaluate(user: AuthenticatedUser, context: RequestContext) {
    await this.ensureDefaultRules();
    const rules = await this.prisma.suspiciousActivityRule.findMany({
      where: { isEnabled: true },
      select: {
        id: true,
        type: true,
        severity: true,
        threshold: true,
        windowMinutes: true,
        isEnabled: true,
      },
    });
    const createdIds: string[] = [];

    for (const rule of rules) {
      const windowStart = new Date(Date.now() - rule.windowMinutes * 60 * 1000);
      const [loginAttempts, auditLogs] = await Promise.all([
        this.prisma.loginAttempt.findMany({
          where: { createdAt: { gte: windowStart } },
          orderBy: { createdAt: 'desc' },
          take: 500,
        }),
        this.prisma.auditLog.findMany({
          where: { createdAt: { gte: windowStart } },
          orderBy: { createdAt: 'desc' },
          take: 500,
        }),
      ]);
      const candidates = evaluateSuspiciousActivity({
        rules: [rule],
        loginAttempts,
        auditLogs,
      });

      for (const candidate of candidates) {
        const event = await this.createEventIfNew(rule.id, candidate, windowStart);
        if (event) {
          createdIds.push(event.id);
        }
      }
    }

    await this.auditLogService.create({
      actorUserId: user.id,
      action: 'SECURITY_SUSPICIOUS_ACTIVITY_EVALUATED',
      resourceType: 'SuspiciousActivityEvent',
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      metadata: { createdEventCount: createdIds.length },
    });

    return this.listEvents();
  }

  async ensureDefaultRules(): Promise<void> {
    for (const rule of defaultSuspiciousActivityRules) {
      await this.prisma.suspiciousActivityRule.upsert({
        where: { type: rule.type },
        update: {
          name: rule.name,
          description: rule.description,
          severity: rule.severity,
          threshold: rule.threshold,
          windowMinutes: rule.windowMinutes,
        },
        create: rule,
      });
    }
  }

  private async createEventIfNew(
    ruleId: string,
    candidate: SuspiciousActivityCandidate,
    windowStart: Date,
  ) {
    const existing = await this.prisma.suspiciousActivityEvent.findFirst({
      where: {
        type: candidate.type,
        actorUserId: candidate.actorUserId ?? null,
        ipAddress: candidate.ipAddress ?? null,
        resourceType: candidate.resourceType ?? null,
        resourceId: candidate.resourceId ?? null,
        occurredAt: { gte: windowStart },
      },
      select: { id: true },
    });
    if (existing) {
      return null;
    }

    return this.prisma.suspiciousActivityEvent.create({
      data: {
        ruleId,
        type: candidate.type,
        severity: candidate.severity,
        title: candidate.title,
        description: candidate.description,
        evidence: candidate.evidence as Prisma.InputJsonValue,
        actorUserId: candidate.actorUserId ?? null,
        ipAddress: candidate.ipAddress ?? null,
        resourceType: candidate.resourceType ?? null,
        resourceId: candidate.resourceId ?? null,
        occurredAt: candidate.occurredAt,
      },
      select: { id: true },
    });
  }
}
