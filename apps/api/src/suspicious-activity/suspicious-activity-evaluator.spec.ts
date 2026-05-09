import { evaluateSuspiciousActivity } from './suspicious-activity-evaluator';

describe('evaluateSuspiciousActivity', () => {
  it('detects repeated failed logins by email', () => {
    const now = new Date();
    const events = evaluateSuspiciousActivity({
      rules: [
        {
          type: 'TOO_MANY_FAILED_LOGINS',
          severity: 'HIGH',
          threshold: 3,
          windowMinutes: 15,
          isEnabled: true,
        },
      ],
      loginAttempts: [
        failedLogin('patient@demo.com', now),
        failedLogin('patient@demo.com', now),
        failedLogin('patient@demo.com', now),
      ],
      auditLogs: [],
    });

    const emailEvent = events.find((event) => event.resourceId === 'patient@demo.com');

    expect(emailEvent?.type).toBe('TOO_MANY_FAILED_LOGINS');
    expect(emailEvent?.evidence.count).toBe(3);
  });

  it('detects disabled account login attempts', () => {
    const now = new Date();
    const events = evaluateSuspiciousActivity({
      rules: [
        {
          type: 'DISABLED_USER_LOGIN',
          severity: 'MEDIUM',
          threshold: 1,
          windowMinutes: 60,
          isEnabled: true,
        },
      ],
      loginAttempts: [
        {
          ...failedLogin('disabled@demo.com', now),
          failureReason: 'ACCOUNT_DISABLED',
          userId: 'user-disabled',
        },
      ],
      auditLogs: [],
    });

    expect(events).toHaveLength(1);
    expect(events[0]?.actorUserId).toBe('user-disabled');
  });

  it('detects privilege changes from audit logs', () => {
    const now = new Date();
    const events = evaluateSuspiciousActivity({
      rules: [
        {
          type: 'ROLE_PERMISSION_CHANGED',
          severity: 'HIGH',
          threshold: 1,
          windowMinutes: 60,
          isEnabled: true,
        },
      ],
      loginAttempts: [],
      auditLogs: [
        {
          id: 'audit-1',
          actorUserId: 'admin-1',
          action: 'ROLE_PERMISSION_ASSIGNED',
          resourceType: 'RolePermission',
          resourceId: 'role:permission',
          ipAddress: '127.0.0.1',
          metadata: { permissionKey: 'security.read' },
          createdAt: now,
        },
      ],
    });

    expect(events).toHaveLength(1);
    expect(events[0]?.title).toContain('ROLE_PERMISSION_ASSIGNED');
  });

  it('detects patient profile access without appointment metadata', () => {
    const now = new Date();
    const events = evaluateSuspiciousActivity({
      rules: [
        {
          type: 'PATIENT_RECORD_OUTSIDE_APPOINTMENT',
          severity: 'MEDIUM',
          threshold: 1,
          windowMinutes: 60,
          isEnabled: true,
        },
      ],
      loginAttempts: [],
      auditLogs: [
        {
          id: 'audit-2',
          actorUserId: 'user-1',
          action: 'PATIENT_PROFILE_VIEWED',
          resourceType: 'PatientProfile',
          resourceId: 'patient-1',
          ipAddress: '127.0.0.1',
          metadata: { accessType: 'search' },
          createdAt: now,
        },
      ],
    });

    expect(events).toHaveLength(1);
    expect(events[0]?.resourceId).toBe('patient-1');
  });
});

function failedLogin(email: string, createdAt: Date) {
  return {
    email,
    userId: null,
    ipAddress: '127.0.0.1',
    success: false,
    failureReason: 'INVALID_CREDENTIALS',
    createdAt,
  };
}
