import type { AuthUser } from './auth';

export interface NavigationItem {
  href: string;
  label: string;
  requiredPermissions?: string[];
  requiredRoles?: string[];
}

export const dashboardNavigation: NavigationItem[] = [
  { href: '/dashboard/clinic-admin', label: 'Clinic', requiredPermissions: ['clinic.manage'] },
  { href: '/dashboard/clinic-admin/staff', label: 'Staff', requiredPermissions: ['staff.read'] },
  {
    href: '/dashboard/patients',
    label: 'Patients',
    requiredRoles: ['SUPER_ADMIN', 'CLINIC_ADMIN', 'RECEPTIONIST', 'LAB_TECHNICIAN'],
  },
  {
    href: '/dashboard/appointments',
    label: 'Appointments',
    requiredPermissions: ['appointment.read'],
  },
  {
    href: '/dashboard/reception/queue',
    label: 'Reception Queue',
    requiredPermissions: ['queue.manage'],
  },
  { href: '/dashboard/doctor/queue', label: 'Doctor Queue', requiredRoles: ['DOCTOR'] },
  { href: '/dashboard/doctor/consultation', label: 'Consultation', requiredRoles: ['DOCTOR'] },
  { href: '/dashboard/lab', label: 'Lab', requiredPermissions: ['lab.read'] },
  { href: '/dashboard/patient', label: 'Patient Portal', requiredRoles: ['PATIENT'] },
  { href: '/dashboard/qa', label: 'QA Center', requiredPermissions: ['qa.read'] },
  { href: '/dashboard/security', label: 'Security Center', requiredPermissions: ['security.read'] },
  { href: '/dashboard/demo', label: 'Demo Script' },
  { href: '/dashboard/super-admin', label: 'Reports', requiredPermissions: ['reports.read'] },
];

export function dashboardPathForRoles(roles: string[]): string {
  if (roles.includes('SUPER_ADMIN')) return '/dashboard/super-admin';
  if (roles.includes('CLINIC_ADMIN')) return '/dashboard/clinic-admin';
  if (roles.includes('RECEPTIONIST')) return '/dashboard/reception';
  if (roles.includes('DOCTOR')) return '/dashboard/doctor';
  if (roles.includes('LAB_TECHNICIAN')) return '/dashboard/lab';
  if (roles.includes('QA_MANAGER')) return '/dashboard/qa';
  if (roles.includes('SECURITY_OFFICER')) return '/dashboard/security';
  return '/dashboard/patient';
}

export function canUseNavigationItem(user: AuthUser, item: NavigationItem): boolean {
  const hasRequiredRole =
    !item.requiredRoles?.length || item.requiredRoles.some((role) => user.roles.includes(role));
  const hasRequiredPermission =
    !item.requiredPermissions?.length ||
    item.requiredPermissions.every((permission) => user.permissions.includes(permission));

  return hasRequiredRole && hasRequiredPermission;
}
