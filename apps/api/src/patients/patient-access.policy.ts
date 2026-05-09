import { ForbiddenException } from '@nestjs/common';

import type { AuthenticatedUser } from '../auth/types/authenticated-user';

export interface PatientAccessRecord {
  userId: string | null;
  primaryDoctorUserId: string | null;
}

const PATIENT_BROWSING_ROLES = new Set([
  'SUPER_ADMIN',
  'CLINIC_ADMIN',
  'RECEPTIONIST',
  'LAB_TECHNICIAN',
]);

const PATIENT_CONTACT_UPDATE_ROLES = new Set(['SUPER_ADMIN', 'CLINIC_ADMIN', 'RECEPTIONIST']);

export function canBrowsePatients(user: AuthenticatedUser): boolean {
  return (
    user.permissions.includes('patient.read') &&
    user.roles.some((role) => PATIENT_BROWSING_ROLES.has(role))
  );
}

export function canViewPatient(user: AuthenticatedUser, patient: PatientAccessRecord): boolean {
  if (patient.userId === user.id) {
    return true;
  }

  if (user.roles.includes('DOCTOR')) {
    return patient.primaryDoctorUserId === user.id;
  }

  return canBrowsePatients(user);
}

export function canUpdatePatientContact(user: AuthenticatedUser): boolean {
  return (
    user.permissions.includes('patient.update') &&
    user.roles.some((role) => PATIENT_CONTACT_UPDATE_ROLES.has(role))
  );
}

export function assertCanBrowsePatients(user: AuthenticatedUser): void {
  if (!canBrowsePatients(user)) {
    throw new ForbiddenException('You are not allowed to browse patient profiles.');
  }
}

export function assertCanViewPatient(user: AuthenticatedUser, patient: PatientAccessRecord): void {
  if (!canViewPatient(user, patient)) {
    throw new ForbiddenException('You are not allowed to access this patient profile.');
  }
}

export function assertCanUpdatePatientContact(user: AuthenticatedUser): void {
  if (!canUpdatePatientContact(user)) {
    throw new ForbiddenException('You are not allowed to update patient contact information.');
  }
}
