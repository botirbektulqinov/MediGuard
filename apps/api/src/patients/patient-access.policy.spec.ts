import {
  canBrowsePatients,
  canUpdatePatientContact,
  canViewPatient,
} from './patient-access.policy';

function user(overrides: Partial<Parameters<typeof canBrowsePatients>[0]> = {}) {
  return {
    id: 'user-1',
    email: 'user@example.com',
    status: 'ACTIVE' as const,
    roles: [],
    permissions: [],
    ...overrides,
  };
}

describe('patient access policy', () => {
  it('allows a patient to view only their own profile', () => {
    const patientUser = user({ id: 'patient-user', roles: ['PATIENT'] });

    expect(canViewPatient(patientUser, { userId: 'patient-user', primaryDoctorUserId: null })).toBe(
      true,
    );
    expect(canViewPatient(patientUser, { userId: 'other-user', primaryDoctorUserId: null })).toBe(
      false,
    );
  });

  it('allows doctors to view assigned patient profiles only', () => {
    const doctor = user({
      id: 'doctor-user',
      roles: ['DOCTOR'],
      permissions: ['patient.read', 'patient.sensitive.read'],
    });

    expect(
      canViewPatient(doctor, { userId: 'patient-user', primaryDoctorUserId: 'doctor-user' }),
    ).toBe(true);
    expect(
      canViewPatient(doctor, { userId: 'patient-user', primaryDoctorUserId: 'other-doctor' }),
    ).toBe(false);
    expect(canBrowsePatients(doctor)).toBe(false);
  });

  it('allows receptionists to browse and update non-medical contact information', () => {
    const receptionist = user({
      roles: ['RECEPTIONIST'],
      permissions: ['patient.read', 'patient.update'],
    });

    expect(canBrowsePatients(receptionist)).toBe(true);
    expect(canUpdatePatientContact(receptionist)).toBe(true);
  });
});
