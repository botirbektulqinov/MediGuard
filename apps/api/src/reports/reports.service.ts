import { ForbiddenException, Inject, Injectable } from '@nestjs/common';
import { BugStatus, SecurityIncidentStatus } from '@prisma/client';
import type { Prisma } from '@prisma/client';

import type { AuthenticatedUser } from '../auth/types/authenticated-user';
import { PrismaService } from '../prisma/prisma.service';

const OPEN_BUG_STATUSES: BugStatus[] = [
  BugStatus.OPEN,
  BugStatus.TRIAGED,
  BugStatus.IN_PROGRESS,
  BugStatus.READY_FOR_QA,
  BugStatus.RETEST,
  BugStatus.REOPENED,
];
const OPEN_INCIDENT_STATUSES: SecurityIncidentStatus[] = [
  SecurityIncidentStatus.DETECTED,
  SecurityIncidentStatus.INVESTIGATING,
  SecurityIncidentStatus.CONTAINED,
];
const NO_CLINIC_ACCESS_ID = '__no_clinic_access__';

@Injectable()
export class ReportsService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async appointmentsPerDay(user: AuthenticatedUser, days = 14) {
    const clinicWhere = await this.appointmentWhereForReports(user);
    const from = daysAgo(days - 1);
    const appointments = await this.prisma.appointment.findMany({
      where: { ...clinicWhere, startAt: { gte: from } },
      select: { startAt: true, status: true },
      orderBy: { startAt: 'asc' },
    });

    const byDay = new Map(
      dateRange(days).map((date) => [
        date,
        { date, total: 0, completed: 0, cancelled: 0, noShow: 0 },
      ]),
    );
    for (const appointment of appointments) {
      const day = toDayKey(appointment.startAt);
      const row = byDay.get(day);
      if (!row) continue;
      row.total += 1;
      if (appointment.status === 'COMPLETED') row.completed += 1;
      if (appointment.status === 'CANCELLED') row.cancelled += 1;
      if (appointment.status === 'NO_SHOW') row.noShow += 1;
    }

    return [...byDay.values()];
  }

  async queueWaitingTime(user: AuthenticatedUser) {
    const clinicWhere = await this.queueWhereForReports(user);
    const entries = await this.prisma.queueEntry.findMany({
      where: { ...clinicWhere, arrivedAt: { gte: daysAgo(6) } },
      select: { status: true, arrivedAt: true, calledAt: true, completedAt: true },
    });
    const completedWaits = entries
      .map((entry) => minutesBetween(entry.arrivedAt, entry.calledAt ?? entry.completedAt))
      .filter((value): value is number => value !== null);

    return {
      averageMinutes: average(completedWaits),
      waitingNow: entries.filter((entry) => entry.status === 'WAITING').length,
      inConsultation: entries.filter((entry) => entry.status === 'IN_CONSULTATION').length,
      completedToday: entries.filter(
        (entry) =>
          entry.status === 'COMPLETED' && entry.completedAt && entry.completedAt >= today(),
      ).length,
    };
  }

  async doctorWorkload(user: AuthenticatedUser) {
    const clinicWhere = await this.appointmentWhereForReports(user);
    const appointments = await this.prisma.appointment.findMany({
      where: { ...clinicWhere, startAt: { gte: daysAgo(6) } },
      select: {
        doctorId: true,
        status: true,
        doctor: {
          select: {
            specialty: true,
            staffProfile: {
              select: {
                user: { select: { firstName: true, lastName: true, email: true } },
              },
            },
          },
        },
      },
    });

    const rows = new Map<
      string,
      {
        doctorId: string;
        doctorName: string;
        specialty: string;
        appointments: number;
        completed: number;
      }
    >();
    for (const appointment of appointments) {
      const doctorUser = appointment.doctor.staffProfile.user;
      const row = rows.get(appointment.doctorId) ?? {
        doctorId: appointment.doctorId,
        doctorName: `${doctorUser.firstName} ${doctorUser.lastName}`,
        specialty: appointment.doctor.specialty,
        appointments: 0,
        completed: 0,
      };
      row.appointments += 1;
      if (appointment.status === 'COMPLETED') row.completed += 1;
      rows.set(appointment.doctorId, row);
    }

    return [...rows.values()].sort((a, b) => b.appointments - a.appointments);
  }

  async testPassRate() {
    const grouped = await this.prisma.testRunResult.groupBy({
      by: ['status'],
      _count: { status: true },
    });
    const counts = statusCount(grouped, ['PENDING', 'PASSED', 'FAILED', 'BLOCKED', 'SKIPPED']);
    const total = Object.values(counts).reduce((sum, count) => sum + count, 0);
    return {
      total,
      passed: counts.PASSED,
      failed: counts.FAILED,
      blocked: counts.BLOCKED,
      skipped: counts.SKIPPED,
      pending: counts.PENDING,
      passRate: total ? Math.round((counts.PASSED / total) * 100) : 0,
    };
  }

  async openBugsBySeverity() {
    const grouped = await this.prisma.bugReport.groupBy({
      by: ['severity'],
      where: { status: { in: OPEN_BUG_STATUSES } },
      _count: { severity: true },
    });
    return countRows(grouped, ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']);
  }

  async securityIncidentsBySeverity() {
    const grouped = await this.prisma.securityIncident.groupBy({
      by: ['severity'],
      where: { status: { in: OPEN_INCIDENT_STATUSES } },
      _count: { severity: true },
    });
    return countRows(grouped, ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']);
  }

  async failedLoginTrends(days = 7) {
    const attempts = await this.prisma.loginAttempt.findMany({
      where: { success: false, createdAt: { gte: daysAgo(days - 1) } },
      select: { createdAt: true },
    });
    const byDay = new Map(dateRange(days).map((date) => [date, { date, count: 0 }]));
    for (const attempt of attempts) {
      const day = toDayKey(attempt.createdAt);
      const row = byDay.get(day);
      if (row) row.count += 1;
    }
    return [...byDay.values()];
  }

  async clinicAdminDashboard(user: AuthenticatedUser) {
    this.assertAny(user, ['SUPER_ADMIN', 'CLINIC_ADMIN'], ['clinic.manage', 'reports.read']);
    const clinicWhere = await this.appointmentWhereForReports(user);
    const clinicId = await this.clinicIdForUser(user);
    const [clinics, branches, staff, patients, appointmentsToday, appointmentVolume, queue] =
      await Promise.all([
        clinicId
          ? this.prisma.clinic.count({ where: { id: clinicId } })
          : this.prisma.clinic.count(),
        clinicId ? this.prisma.branch.count({ where: { clinicId } }) : this.prisma.branch.count(),
        clinicId
          ? this.prisma.staffProfile.count({ where: { clinicId } })
          : this.prisma.staffProfile.count(),
        clinicId
          ? this.prisma.patientProfile.count({ where: { clinicId } })
          : this.prisma.patientProfile.count(),
        this.prisma.appointment.count({
          where: { ...clinicWhere, startAt: { gte: today(), lt: tomorrow() } },
        }),
        this.appointmentsPerDay(user, 7),
        this.queueWaitingTime(user),
      ]);

    return {
      title: 'Clinic Admin Dashboard',
      metrics: {
        clinics,
        branches,
        staff,
        patients,
        appointmentsToday,
        averageQueueMinutes: queue.averageMinutes,
      },
      charts: { appointmentVolume, queue },
    };
  }

  async receptionDashboard(user: AuthenticatedUser) {
    this.assertAny(user, ['SUPER_ADMIN', 'RECEPTIONIST'], ['queue.manage', 'appointment.read']);
    const appointmentWhere = await this.appointmentWhereForReports(user);
    const queueWhere = await this.queueWhereForReports(user);
    const [appointmentsToday, waitingQueue, arrived, upcoming] = await Promise.all([
      this.prisma.appointment.count({
        where: { ...appointmentWhere, startAt: { gte: today(), lt: tomorrow() } },
      }),
      this.prisma.queueEntry.count({ where: { ...queueWhere, status: 'WAITING' } }),
      this.prisma.appointment.count({
        where: {
          ...appointmentWhere,
          status: 'ARRIVED',
          startAt: { gte: today(), lt: tomorrow() },
        },
      }),
      this.prisma.appointment.findMany({
        where: {
          ...appointmentWhere,
          startAt: { gte: new Date() },
          status: { in: ['BOOKED', 'CONFIRMED'] },
        },
        orderBy: { startAt: 'asc' },
        take: 5,
        select: {
          id: true,
          startAt: true,
          status: true,
          patient: { select: { firstName: true, lastName: true, medicalRecordNumber: true } },
          doctor: {
            select: {
              staffProfile: { select: { user: { select: { firstName: true, lastName: true } } } },
            },
          },
        },
      }),
    ]);

    return {
      title: 'Reception Dashboard',
      metrics: { appointmentsToday, waitingQueue, arrived },
      upcoming,
    };
  }

  async doctorDashboard(user: AuthenticatedUser) {
    this.assertAny(user, ['DOCTOR'], ['queue.read']);
    const doctor = await this.prisma.doctorProfile.findFirst({
      where: { staffProfile: { userId: user.id } },
      select: { id: true },
    });
    const doctorWhere = doctor ? { doctorId: doctor.id } : { doctorId: '__none__' };
    const [todayAppointments, queue, visitsInProgress, completedVisits] = await Promise.all([
      this.prisma.appointment.count({
        where: { ...doctorWhere, startAt: { gte: today(), lt: tomorrow() } },
      }),
      this.prisma.queueEntry.findMany({
        where: { ...doctorWhere, status: { in: ['WAITING', 'IN_CONSULTATION', 'LAB_REQUIRED'] } },
        orderBy: { arrivedAt: 'asc' },
        take: 8,
        select: {
          id: true,
          status: true,
          position: true,
          appointment: {
            select: {
              startAt: true,
              patient: { select: { firstName: true, lastName: true, medicalRecordNumber: true } },
            },
          },
        },
      }),
      this.prisma.visit.count({ where: { ...doctorWhere, status: 'IN_PROGRESS' } }),
      this.prisma.visit.count({
        where: {
          ...doctorWhere,
          status: 'COMPLETED',
          completedAt: { gte: today(), lt: tomorrow() },
        },
      }),
    ]);

    return {
      title: 'Doctor Dashboard',
      metrics: { todayAppointments, activeQueue: queue.length, visitsInProgress, completedVisits },
      queue,
    };
  }

  async qaDashboard(user: AuthenticatedUser) {
    this.assertAny(user, ['SUPER_ADMIN', 'QA_MANAGER'], ['qa.read']);
    const [suites, cases, openBugs, blockedGates, passRate, bugSeverity] = await Promise.all([
      this.prisma.testSuite.count(),
      this.prisma.testCase.count({ where: { isActive: true } }),
      this.prisma.bugReport.count({ where: { status: { in: OPEN_BUG_STATUSES } } }),
      this.prisma.releaseGate.count({ where: { status: 'BLOCKED' } }),
      this.testPassRate(),
      this.openBugsBySeverity(),
    ]);
    return {
      title: 'QA Dashboard',
      metrics: { suites, cases, openBugs, blockedGates, passRate: passRate.passRate },
      charts: { passRate, bugSeverity },
    };
  }

  async securityDashboard(user: AuthenticatedUser) {
    this.assertAny(user, ['SUPER_ADMIN', 'SECURITY_OFFICER'], ['security.read']);
    const [failedLoginTrends, incidentsBySeverity, openIncidents, openEvents, failedLogins24h] =
      await Promise.all([
        this.failedLoginTrends(),
        this.securityIncidentsBySeverity(),
        this.prisma.securityIncident.count({ where: { status: { in: OPEN_INCIDENT_STATUSES } } }),
        this.prisma.suspiciousActivityEvent.count({ where: { status: 'OPEN' } }),
        this.prisma.loginAttempt.count({
          where: { success: false, createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
        }),
      ]);
    return {
      title: 'Security Dashboard',
      metrics: { failedLogins24h, openEvents, openIncidents },
      charts: { failedLoginTrends, incidentsBySeverity },
    };
  }

  async patientDashboard(user: AuthenticatedUser) {
    this.assertAny(user, ['PATIENT'], ['auth.me']);
    const patient = await this.prisma.patientProfile.findUnique({
      where: { userId: user.id },
      select: { id: true },
    });
    const patientWhere = patient ? { patientId: patient.id } : { patientId: '__none__' };
    const [upcomingAppointments, visits, labResults, notifications] = await Promise.all([
      this.prisma.appointment.count({
        where: {
          ...patientWhere,
          startAt: { gte: new Date() },
          status: { notIn: ['CANCELLED', 'NO_SHOW'] },
        },
      }),
      this.prisma.visit.count({ where: patientWhere }),
      this.prisma.labResult.count({ where: { ...patientWhere, status: 'READY' } }),
      this.prisma.notification.count({ where: { userId: user.id, readAt: null } }),
    ]);
    return {
      title: 'Patient Dashboard',
      metrics: {
        upcomingAppointments,
        visits,
        readyLabResults: labResults,
        unreadNotifications: notifications,
      },
    };
  }

  private async appointmentWhereForReports(
    user: AuthenticatedUser,
  ): Promise<Prisma.AppointmentWhereInput> {
    const clinicId = await this.clinicIdForUser(user);
    return clinicId ? { clinicId } : {};
  }

  private async queueWhereForReports(
    user: AuthenticatedUser,
  ): Promise<Prisma.QueueEntryWhereInput> {
    const clinicId = await this.clinicIdForUser(user);
    return clinicId ? { clinicId } : {};
  }

  private async clinicIdForUser(user: AuthenticatedUser): Promise<string | null> {
    if (user.roles.includes('SUPER_ADMIN')) return null;
    const staff = await this.prisma.staffProfile.findUnique({
      where: { userId: user.id },
      select: { clinicId: true },
    });
    return staff?.clinicId ?? NO_CLINIC_ACCESS_ID;
  }

  private assertAny(user: AuthenticatedUser, roles: string[], permissions: string[]): void {
    const hasRole = roles.some((role) => user.roles.includes(role));
    const hasPermission = permissions.some((permission) => user.permissions.includes(permission));
    if (!hasRole && !hasPermission) {
      throw new ForbiddenException('You do not have access to this dashboard.');
    }
  }
}

function dateRange(days: number): string[] {
  return Array.from({ length: days }, (_, index) => toDayKey(daysAgo(days - index - 1)));
}

function daysAgo(days: number): Date {
  const date = today();
  date.setUTCDate(date.getUTCDate() - days);
  return date;
}

function today(): Date {
  const date = new Date();
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function tomorrow(): Date {
  const date = today();
  date.setUTCDate(date.getUTCDate() + 1);
  return date;
}

function toDayKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function minutesBetween(start: Date, end: Date | null): number | null {
  if (!end) return null;
  return Math.max(0, Math.round((end.getTime() - start.getTime()) / 60_000));
}

function average(values: number[]): number {
  if (!values.length) return 0;
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function statusCount<TStatus extends string>(
  grouped: Array<{ status: TStatus; _count: { status: number } }>,
  statuses: readonly TStatus[],
): Record<TStatus, number> {
  return Object.fromEntries(
    statuses.map((status) => [
      status,
      grouped.find((item) => item.status === status)?._count.status ?? 0,
    ]),
  ) as Record<TStatus, number>;
}

function countRows<TValue extends string>(
  grouped: Array<{ severity: TValue; _count?: { severity?: number } }>,
  values: readonly TValue[],
) {
  return values.map((value) => ({
    severity: value,
    count: grouped.find((item) => item.severity === value)?._count?.severity ?? 0,
  }));
}
