import { expect, test } from '@playwright/test';

const users = {
  'clinic-admin': {
    roles: ['CLINIC_ADMIN'],
    permissions: ['clinic.manage', 'reports.read', 'staff.read', 'appointment.read'],
  },
  reception: {
    roles: ['RECEPTIONIST'],
    permissions: ['appointment.read', 'queue.manage', 'patient.read'],
  },
  doctor: {
    roles: ['DOCTOR'],
    permissions: ['queue.read', 'appointment.read', 'visit.read'],
  },
  qa: {
    roles: ['QA_MANAGER'],
    permissions: ['qa.read', 'qa.manage', 'reports.read'],
  },
  security: {
    roles: ['SECURITY_OFFICER'],
    permissions: ['security.read', 'security.incident.manage', 'reports.read'],
  },
  patient: {
    roles: ['PATIENT'],
    permissions: ['auth.me', 'appointment.read', 'visit.read', 'lab.read'],
  },
} as const;

for (const [dashboard, user] of Object.entries(users)) {
  test(`${dashboard} dashboard renders with mocked API data`, async ({ page }) => {
    await page.route('**/api/auth/me', async (route) => {
      await route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({
          id: `${dashboard}-user`,
          email: `${dashboard}@demo.com`,
          firstName: 'Demo',
          lastName: 'User',
          roles: user.roles,
          permissions: user.permissions,
        }),
      });
    });
    await page.route(`**/api/dashboards/${dashboard}`, async (route) => {
      await route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify(mockDashboard(dashboard)),
      });
    });
    await page.route('**/api/patient-portal/visits', async (route) => {
      await route.fulfill({ contentType: 'application/json', body: JSON.stringify([]) });
    });
    await page.route('**/api/patient-portal/lab-results', async (route) => {
      await route.fulfill({ contentType: 'application/json', body: JSON.stringify([]) });
    });
    await page.addInitScript(
      ({ dashboardName, dashboardUser }) => {
        window.localStorage.setItem('mediguard.accessToken', 'e2e-access-token');
        window.localStorage.setItem('mediguard.refreshToken', 'e2e-refresh-token');
        window.localStorage.setItem(
          'mediguard.user',
          JSON.stringify({
            id: `${dashboardName}-user`,
            email: `${dashboardName}@demo.com`,
            firstName: 'Demo',
            lastName: 'User',
            roles: dashboardUser.roles,
            permissions: dashboardUser.permissions,
          }),
        );
      },
      { dashboardName: dashboard, dashboardUser: user },
    );

    await page.goto(dashboard === 'patient' ? '/dashboard/patient' : `/dashboard/${dashboard}`);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Demo Script', exact: true })).toBeVisible();
  });
}

function mockDashboard(dashboard: string) {
  const base = {
    title: `${dashboard} dashboard`,
    metrics: {
      appointmentsToday: 3,
      openBugs: 1,
      failedLogins24h: 2,
      upcomingAppointments: 1,
    },
  };
  if (dashboard === 'clinic-admin') {
    return {
      ...base,
      charts: {
        appointmentVolume: [
          { date: '2026-05-09', total: 3, completed: 1, cancelled: 0, noShow: 0 },
        ],
        queue: { averageMinutes: 12, waitingNow: 2, inConsultation: 1, completedToday: 4 },
      },
    };
  }
  if (dashboard === 'qa') {
    return {
      ...base,
      charts: {
        passRate: {
          total: 4,
          passed: 3,
          failed: 1,
          blocked: 0,
          skipped: 0,
          pending: 0,
          passRate: 75,
        },
        bugSeverity: [{ severity: 'HIGH', count: 1 }],
      },
    };
  }
  if (dashboard === 'security') {
    return {
      ...base,
      charts: {
        failedLoginTrends: [{ date: '2026-05-09', count: 2 }],
        incidentsBySeverity: [{ severity: 'HIGH', count: 1 }],
      },
    };
  }
  return base;
}
