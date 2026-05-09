import type {
  AuditLog,
  LoginAttempt,
  SecuritySeverity,
  SuspiciousActivityRule,
  SuspiciousActivityRuleType,
} from '@prisma/client';

export interface SuspiciousActivityCandidate {
  type: SuspiciousActivityRuleType;
  severity: SecuritySeverity;
  title: string;
  description: string;
  evidence: Record<string, unknown>;
  actorUserId?: string | null;
  ipAddress?: string | null;
  resourceType?: string | null;
  resourceId?: string | null;
  occurredAt: Date;
}

type Rule = Pick<
  SuspiciousActivityRule,
  'type' | 'severity' | 'threshold' | 'windowMinutes' | 'isEnabled'
>;

type LoginAttemptInput = Pick<
  LoginAttempt,
  'email' | 'userId' | 'ipAddress' | 'success' | 'failureReason' | 'createdAt'
>;

type AuditLogInput = Pick<
  AuditLog,
  | 'id'
  | 'actorUserId'
  | 'action'
  | 'resourceType'
  | 'resourceId'
  | 'ipAddress'
  | 'metadata'
  | 'createdAt'
>;

export function evaluateSuspiciousActivity(input: {
  rules: Rule[];
  loginAttempts: LoginAttemptInput[];
  auditLogs: AuditLogInput[];
}): SuspiciousActivityCandidate[] {
  const candidates: SuspiciousActivityCandidate[] = [];
  for (const rule of input.rules.filter((item) => item.isEnabled)) {
    switch (rule.type) {
      case 'TOO_MANY_FAILED_LOGINS':
        candidates.push(...failedLoginCandidates(rule, input.loginAttempts));
        break;
      case 'DISABLED_USER_LOGIN':
        candidates.push(...disabledUserLoginCandidates(rule, input.loginAttempts));
        break;
      case 'EXCESSIVE_PATIENT_PROFILE_VIEWS':
        candidates.push(...patientProfileViewCandidates(rule, input.auditLogs));
        break;
      case 'ROLE_PERMISSION_CHANGED':
        candidates.push(...rolePermissionChangeCandidates(rule, input.auditLogs));
        break;
      case 'REPEATED_LAB_RESULT_DOWNLOAD':
        candidates.push(...repeatedDownloadCandidates(rule, input.auditLogs));
        break;
      case 'PATIENT_RECORD_OUTSIDE_APPOINTMENT':
        candidates.push(...outsideAppointmentCandidates(rule, input.auditLogs));
        break;
    }
  }

  return candidates;
}

function failedLoginCandidates(
  rule: Rule,
  attempts: LoginAttemptInput[],
): SuspiciousActivityCandidate[] {
  const failed = attempts.filter((attempt) => !attempt.success);

  return [
    ...groupLoginAttempts(
      failed,
      (attempt) => `email:${attempt.email}`,
      (attempt) => attempt.email,
    ),
    ...groupLoginAttempts(
      failed.filter((attempt) => attempt.ipAddress),
      (attempt) => `ip:${attempt.ipAddress ?? ''}`,
      (attempt) => attempt.ipAddress ?? 'unknown IP',
    ),
  ]
    .filter((group) => group.items.length >= rule.threshold)
    .map(({ key, label, items }) => ({
      type: rule.type,
      severity: rule.severity,
      title: `Repeated failed login attempts for ${label}`,
      description: `${items.length} failed login attempt(s) were recorded in ${rule.windowMinutes} minutes.`,
      evidence: { key, count: items.length, emails: [...new Set(items.map((item) => item.email))] },
      actorUserId: items.find((item) => item.userId)?.userId ?? null,
      ipAddress: items.find((item) => item.ipAddress)?.ipAddress ?? null,
      resourceType: 'LoginAttempt',
      resourceId: label,
      occurredAt: latest(items.map((item) => item.createdAt)),
    }));
}

function disabledUserLoginCandidates(
  rule: Rule,
  attempts: LoginAttemptInput[],
): SuspiciousActivityCandidate[] {
  return attempts
    .filter((attempt) => attempt.failureReason === 'ACCOUNT_DISABLED')
    .map((attempt) => ({
      type: rule.type,
      severity: rule.severity,
      title: `Disabled account login attempt for ${attempt.email}`,
      description: 'A disabled account was used in a login attempt.',
      evidence: { email: attempt.email, failureReason: attempt.failureReason },
      actorUserId: attempt.userId,
      ipAddress: attempt.ipAddress,
      resourceType: 'LoginAttempt',
      resourceId: attempt.email,
      occurredAt: attempt.createdAt,
    }));
}

function patientProfileViewCandidates(
  rule: Rule,
  logs: AuditLogInput[],
): SuspiciousActivityCandidate[] {
  return groupAuditLogs(
    logs.filter((log) => log.action === 'PATIENT_PROFILE_VIEWED' && log.actorUserId),
    (log) => log.actorUserId ?? 'unknown',
  )
    .filter((group) => group.items.length >= rule.threshold)
    .map(({ key, items }) => ({
      type: rule.type,
      severity: rule.severity,
      title: `High-volume patient profile access by user ${key}`,
      description: `${items.length} patient profile view audit event(s) were recorded in ${rule.windowMinutes} minutes.`,
      evidence: {
        count: items.length,
        patientIds: [...new Set(items.map((item) => item.resourceId))],
      },
      actorUserId: key,
      ipAddress: items.find((item) => item.ipAddress)?.ipAddress ?? null,
      resourceType: 'PatientProfile',
      resourceId: key,
      occurredAt: latest(items.map((item) => item.createdAt)),
    }));
}

function rolePermissionChangeCandidates(
  rule: Rule,
  logs: AuditLogInput[],
): SuspiciousActivityCandidate[] {
  return logs
    .filter((log) => ['USER_ROLE_ASSIGNED', 'ROLE_PERMISSION_ASSIGNED'].includes(log.action))
    .map((log) => ({
      type: rule.type,
      severity: rule.severity,
      title: `Privilege change: ${log.action}`,
      description: 'A role or permission assignment was recorded in audit logs.',
      evidence: { auditLogId: log.id, metadata: log.metadata },
      actorUserId: log.actorUserId,
      ipAddress: log.ipAddress,
      resourceType: log.resourceType,
      resourceId: log.resourceId,
      occurredAt: log.createdAt,
    }));
}

function repeatedDownloadCandidates(
  rule: Rule,
  logs: AuditLogInput[],
): SuspiciousActivityCandidate[] {
  return groupAuditLogs(
    logs.filter((log) => log.action === 'FILE_ATTACHMENT_DOWNLOADED'),
    (log) => `${log.actorUserId ?? 'unknown'}:${log.resourceId ?? 'unknown'}`,
  )
    .filter((group) => group.items.length >= rule.threshold)
    .map(({ key, items }) => ({
      type: rule.type,
      severity: rule.severity,
      title: 'Repeated medical attachment download',
      description: `${items.length} download audit event(s) were recorded for one attachment in ${rule.windowMinutes} minutes.`,
      evidence: { key, count: items.length, auditLogIds: items.map((item) => item.id) },
      actorUserId: items.find((item) => item.actorUserId)?.actorUserId ?? null,
      ipAddress: items.find((item) => item.ipAddress)?.ipAddress ?? null,
      resourceType: 'FileAttachment',
      resourceId: items.find((item) => item.resourceId)?.resourceId ?? null,
      occurredAt: latest(items.map((item) => item.createdAt)),
    }));
}

function outsideAppointmentCandidates(
  rule: Rule,
  logs: AuditLogInput[],
): SuspiciousActivityCandidate[] {
  return logs
    .filter(
      (log) => log.action === 'PATIENT_PROFILE_VIEWED' && !hasAppointmentEvidence(log.metadata),
    )
    .map((log) => ({
      type: rule.type,
      severity: rule.severity,
      title: 'Patient profile viewed without appointment-context evidence',
      description:
        'A patient profile view audit event did not include appointment context metadata.',
      evidence: { auditLogId: log.id, metadata: log.metadata },
      actorUserId: log.actorUserId,
      ipAddress: log.ipAddress,
      resourceType: log.resourceType,
      resourceId: log.resourceId,
      occurredAt: log.createdAt,
    }));
}

function groupLoginAttempts(
  items: LoginAttemptInput[],
  keyFn: (item: LoginAttemptInput) => string,
  labelFn: (item: LoginAttemptInput) => string,
) {
  const groups = new Map<string, { label: string; items: LoginAttemptInput[] }>();
  for (const item of items) {
    const key = keyFn(item);
    const group = groups.get(key) ?? { label: labelFn(item), items: [] };
    group.items.push(item);
    groups.set(key, group);
  }

  return [...groups.entries()].map(([key, value]) => ({ key, ...value }));
}

function groupAuditLogs(items: AuditLogInput[], keyFn: (item: AuditLogInput) => string) {
  const groups = new Map<string, AuditLogInput[]>();
  for (const item of items) {
    const key = keyFn(item);
    groups.set(key, [...(groups.get(key) ?? []), item]);
  }

  return [...groups.entries()].map(([key, groupedItems]) => ({ key, items: groupedItems }));
}

function latest(values: Date[]): Date {
  return values.reduce((max, value) => (value > max ? value : max), values[0] ?? new Date());
}

function hasAppointmentEvidence(metadata: unknown): boolean {
  return Boolean(
    metadata &&
    typeof metadata === 'object' &&
    ('appointmentId' in metadata || 'appointmentContext' in metadata),
  );
}
