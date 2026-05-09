import test from 'node:test';
import assert from 'node:assert/strict';

import { canUseNavigationItem, dashboardPathForRoles } from '../src/lib/navigation';

const baseUser = {
  id: 'user-1',
  email: 'user@example.com',
  firstName: 'User',
  lastName: 'Example',
  roles: [],
  permissions: [],
};

test('maps primary roles to role dashboards', () => {
  assert.equal(dashboardPathForRoles(['CLINIC_ADMIN']), '/dashboard/clinic-admin');
  assert.equal(dashboardPathForRoles(['RECEPTIONIST']), '/dashboard/reception');
  assert.equal(dashboardPathForRoles(['PATIENT']), '/dashboard/patient');
});

test('hides patient navigation from doctors because assigned-patient access is scoped', () => {
  const doctor = {
    ...baseUser,
    roles: ['DOCTOR'],
    permissions: ['patient.read', 'patient.sensitive.read'],
  };

  assert.equal(
    canUseNavigationItem(doctor, {
      href: '/dashboard/patients',
      label: 'Patients',
      requiredRoles: ['SUPER_ADMIN', 'CLINIC_ADMIN', 'RECEPTIONIST', 'LAB_TECHNICIAN'],
    }),
    false,
  );
});
