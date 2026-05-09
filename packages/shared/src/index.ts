export const MEDIGUARD_ROLES = [
  'SUPER_ADMIN',
  'CLINIC_ADMIN',
  'RECEPTIONIST',
  'DOCTOR',
  'LAB_TECHNICIAN',
  'QA_MANAGER',
  'SECURITY_OFFICER',
  'PATIENT',
] as const;

export type MediGuardRole = (typeof MEDIGUARD_ROLES)[number];

export const HEALTH_STATUS = {
  ok: 'ok',
  degraded: 'degraded',
} as const;
