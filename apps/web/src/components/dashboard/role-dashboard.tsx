'use client';

import { useQuery } from '@tanstack/react-query';

import { fetchRoleDashboard, type RoleDashboardSummary } from '@/lib/clinic-api';
import {
  BarChart,
  DashboardHeader,
  DonutStat,
  EmptyState,
  ErrorState,
  LoadingState,
  MetricGrid,
  QuickLink,
} from './dashboard-widgets';

const dashboardCopy: Record<
  string,
  { title: string; description: string; links: Array<[string, string]> }
> = {
  'clinic-admin': {
    title: 'Clinic Admin Dashboard',
    description: 'Clinic configuration, staffing, appointment volume, and queue health.',
    links: [
      ['/dashboard/clinic-admin/staff', 'Staff'],
      ['/dashboard/patients', 'Patients'],
      ['/dashboard/appointments', 'Appointments'],
    ],
  },
  reception: {
    title: 'Reception Dashboard',
    description: 'Front-desk view for today appointments, arrivals, and waiting queue.',
    links: [
      ['/dashboard/appointments', 'Appointments'],
      ['/dashboard/reception/queue', 'Queue'],
      ['/dashboard/patients', 'Patients'],
    ],
  },
  doctor: {
    title: 'Doctor Dashboard',
    description:
      'Today queue, active visits, and completed consultations for the signed-in doctor.',
    links: [
      ['/dashboard/doctor/queue', 'Today queue'],
      ['/dashboard/doctor/consultation', 'Consultation'],
    ],
  },
  qa: {
    title: 'QA Dashboard',
    description: 'Quality posture, active defects, pass rate, and release readiness.',
    links: [
      ['/dashboard/qa/test-suites', 'Test suites'],
      ['/dashboard/qa/bugs', 'Bug reports'],
      ['/dashboard/qa/release-gates', 'Release gates'],
    ],
  },
  security: {
    title: 'Security Dashboard',
    description: 'Authentication monitoring, incidents, findings, and suspicious activity trends.',
    links: [
      ['/dashboard/security/failed-logins', 'Failed logins'],
      ['/dashboard/security/suspicious-activity', 'Suspicious activity'],
      ['/dashboard/security/incidents/latest', 'Incidents'],
    ],
  },
  patient: {
    title: 'Patient Dashboard',
    description: 'Upcoming appointments, completed visit records, ready lab results, and messages.',
    links: [
      ['/dashboard/appointments', 'Appointments'],
      ['/dashboard/patient', 'Portal'],
    ],
  },
};

export function RoleDashboard({ role }: Readonly<{ role: string }>) {
  const normalizedRole =
    role === 'super-admin' ? 'clinic-admin' : dashboardCopy[role] ? role : 'patient';
  const copy = (dashboardCopy[normalizedRole] ?? dashboardCopy.patient)!;
  const dashboard = useQuery({
    queryKey: ['dashboard-summary', normalizedRole],
    queryFn: () => fetchRoleDashboard(normalizedRole),
  });

  if (dashboard.isLoading) return <LoadingState />;
  if (dashboard.isError) return <ErrorState />;

  const data = dashboard.data;
  if (!data) return <EmptyState label="No dashboard data is available." />;

  return (
    <div className="grid gap-6">
      <DashboardHeader title={copy.title} description={copy.description} />
      <MetricGrid metrics={data.metrics} />
      <section className="grid gap-3 md:grid-cols-3">
        {copy.links.map(([href, label]) => (
          <QuickLink key={href} href={href} label={label} />
        ))}
        <QuickLink href="/dashboard/demo" label="Demo script" />
      </section>
      <DashboardCharts role={normalizedRole} data={data} />
    </div>
  );
}

function DashboardCharts({ data, role }: Readonly<{ role: string; data: RoleDashboardSummary }>) {
  if (role === 'clinic-admin') {
    return (
      <section className="grid gap-6 xl:grid-cols-2">
        <BarChart
          title="Appointment volume"
          data={data.charts?.appointmentVolume ?? []}
          labelKey="date"
          valueKey="total"
        />
        <BarChart
          title="Queue status"
          data={[
            { label: 'Waiting', value: data.charts?.queue?.waitingNow ?? 0 },
            { label: 'In consultation', value: data.charts?.queue?.inConsultation ?? 0 },
            { label: 'Completed today', value: data.charts?.queue?.completedToday ?? 0 },
          ]}
          labelKey="label"
          valueKey="value"
        />
      </section>
    );
  }

  if (role === 'reception') {
    return (
      <section className="rounded-lg border border-slate-200 bg-white shadow-panel">
        <h2 className="p-5 text-lg font-semibold text-ink">Upcoming appointments</h2>
        {data.upcoming?.map((appointment) => (
          <div
            key={appointment.id}
            className="grid gap-2 border-t border-slate-100 p-5 md:grid-cols-3"
          >
            <p className="font-medium text-ink">
              {appointment.patient.firstName} {appointment.patient.lastName}
            </p>
            <p className="text-sm text-slate-600">
              {new Date(appointment.startAt).toLocaleString()}
            </p>
            <p className="text-sm font-semibold text-clinical">{appointment.status}</p>
          </div>
        ))}
        {!data.upcoming?.length ? <EmptyState label="No upcoming appointments." /> : null}
      </section>
    );
  }

  if (role === 'doctor') {
    return (
      <section className="rounded-lg border border-slate-200 bg-white shadow-panel">
        <h2 className="p-5 text-lg font-semibold text-ink">Assigned queue</h2>
        {data.queue?.map((entry) => (
          <div key={entry.id} className="grid gap-2 border-t border-slate-100 p-5 md:grid-cols-3">
            <p className="font-medium text-ink">
              #{entry.position} {entry.appointment.patient.firstName}{' '}
              {entry.appointment.patient.lastName}
            </p>
            <p className="text-sm text-slate-600">
              {new Date(entry.appointment.startAt).toLocaleString()}
            </p>
            <p className="text-sm font-semibold text-clinical">{entry.status}</p>
          </div>
        ))}
        {!data.queue?.length ? <EmptyState label="No patients are waiting." /> : null}
      </section>
    );
  }

  if (role === 'qa') {
    return (
      <section className="grid gap-6 xl:grid-cols-2">
        <DonutStat
          title="Test pass rate"
          value={data.charts?.passRate?.passRate ?? 0}
          detail={`${data.charts?.passRate?.passed ?? 0} passed of ${data.charts?.passRate?.total ?? 0} recorded results.`}
        />
        <BarChart
          title="Open bugs by severity"
          data={data.charts?.bugSeverity ?? []}
          labelKey="severity"
          valueKey="count"
        />
      </section>
    );
  }

  if (role === 'security') {
    return (
      <section className="grid gap-6 xl:grid-cols-2">
        <BarChart
          title="Failed login trends"
          data={data.charts?.failedLoginTrends ?? []}
          labelKey="date"
          valueKey="count"
        />
        <BarChart
          title="Open incidents by severity"
          data={data.charts?.incidentsBySeverity ?? []}
          labelKey="severity"
          valueKey="count"
        />
      </section>
    );
  }

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-panel">
      <h2 className="text-lg font-semibold text-ink">Portal summary</h2>
      <p className="mt-2 text-sm leading-6 text-slate-600">
        Patient portal data is scoped to the signed-in patient and loaded from protected API
        endpoints.
      </p>
    </section>
  );
}
