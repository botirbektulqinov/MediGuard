import { Prisma } from '@prisma/client';

export const securityUserSelect = Prisma.validator<Prisma.UserSelect>()({
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  status: true,
});

export const suspiciousActivityRuleSelect = Prisma.validator<Prisma.SuspiciousActivityRuleSelect>()(
  {
    id: true,
    type: true,
    name: true,
    description: true,
    severity: true,
    threshold: true,
    windowMinutes: true,
    isEnabled: true,
    createdAt: true,
    updatedAt: true,
  },
);

export const suspiciousActivityEventSelect =
  Prisma.validator<Prisma.SuspiciousActivityEventSelect>()({
    id: true,
    ruleId: true,
    type: true,
    severity: true,
    status: true,
    title: true,
    description: true,
    evidence: true,
    actorUserId: true,
    ipAddress: true,
    resourceType: true,
    resourceId: true,
    occurredAt: true,
    createdAt: true,
    rule: { select: { id: true, name: true } },
    actor: { select: securityUserSelect },
    incident: { select: { id: true, status: true, severity: true } },
  });

export const securityIncidentSelect = Prisma.validator<Prisma.SecurityIncidentSelect>()({
  id: true,
  sourceEventId: true,
  title: true,
  description: true,
  severity: true,
  status: true,
  remediationNotes: true,
  createdByUserId: true,
  assignedToUserId: true,
  createdAt: true,
  updatedAt: true,
  resolvedAt: true,
  createdBy: { select: securityUserSelect },
  assignedTo: { select: securityUserSelect },
  sourceEvent: { select: suspiciousActivityEventSelect },
  findings: {
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      title: true,
      severity: true,
      affectedModule: true,
      status: true,
      createdAt: true,
    },
  },
});

export const securityFindingSelect = Prisma.validator<Prisma.SecurityFindingSelect>()({
  id: true,
  incidentId: true,
  title: true,
  description: true,
  severity: true,
  affectedModule: true,
  evidence: true,
  remediation: true,
  status: true,
  createdByUserId: true,
  createdAt: true,
  updatedAt: true,
  incident: { select: { id: true, title: true, status: true } },
  createdBy: { select: securityUserSelect },
});
