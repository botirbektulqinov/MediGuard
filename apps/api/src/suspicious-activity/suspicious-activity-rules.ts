import type { SecuritySeverity, SuspiciousActivityRuleType } from '@prisma/client';

export interface DefaultSuspiciousActivityRule {
  type: SuspiciousActivityRuleType;
  name: string;
  description: string;
  severity: SecuritySeverity;
  threshold: number;
  windowMinutes: number;
}

export const defaultSuspiciousActivityRules: DefaultSuspiciousActivityRule[] = [
  {
    type: 'TOO_MANY_FAILED_LOGINS',
    name: 'Too many failed logins',
    description: 'Detects repeated failed login attempts by email or IP address.',
    severity: 'HIGH',
    threshold: 5,
    windowMinutes: 15,
  },
  {
    type: 'EXCESSIVE_PATIENT_PROFILE_VIEWS',
    name: 'Excessive patient profile views',
    description: 'Detects users viewing many patient profiles in a short window.',
    severity: 'HIGH',
    threshold: 10,
    windowMinutes: 15,
  },
  {
    type: 'DISABLED_USER_LOGIN',
    name: 'Disabled user attempted login',
    description: 'Detects login attempts against disabled accounts.',
    severity: 'MEDIUM',
    threshold: 1,
    windowMinutes: 60,
  },
  {
    type: 'ROLE_PERMISSION_CHANGED',
    name: 'Role or permission changed',
    description: 'Detects role assignment or permission assignment audit events.',
    severity: 'HIGH',
    threshold: 1,
    windowMinutes: 60,
  },
  {
    type: 'REPEATED_LAB_RESULT_DOWNLOAD',
    name: 'Repeated lab result download',
    description: 'Detects repeated downloads of the same medical attachment.',
    severity: 'HIGH',
    threshold: 3,
    windowMinutes: 30,
  },
  {
    type: 'PATIENT_RECORD_OUTSIDE_APPOINTMENT',
    name: 'Patient record accessed outside appointment context',
    description: 'Detects audited patient profile access without appointment-context evidence.',
    severity: 'MEDIUM',
    threshold: 1,
    windowMinutes: 60,
  },
];
