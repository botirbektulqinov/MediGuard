'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { cancelAppointment, fetchAppointment, type AppointmentSummary } from '@/lib/clinic-api';

export function AppointmentDetail({ id }: Readonly<{ id: string }>) {
  const queryClient = useQueryClient();
  const appointment = useQuery({
    queryKey: ['appointment', id],
    queryFn: () => fetchAppointment(id),
  });
  const cancel = useMutation({
    mutationFn: () => cancelAppointment(id, 'Cancelled from dashboard'),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['appointment', id] });
      void queryClient.invalidateQueries({ queryKey: ['appointments'] });
    },
  });

  if (appointment.isLoading) {
    return (
      <p className="rounded-lg border border-slate-200 bg-white p-5 text-sm text-slate-500">
        Loading appointment...
      </p>
    );
  }

  if (appointment.isError || !appointment.data) {
    return (
      <p className="rounded-lg border border-slate-200 bg-white p-5 text-sm text-red-700">
        Unable to access this appointment.
      </p>
    );
  }

  return (
    <div className="grid gap-6">
      <Header appointment={appointment.data} />
      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-panel">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-lg font-semibold text-ink">Status timeline</h2>
          <button
            className="rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 disabled:opacity-50"
            type="button"
            disabled={
              cancel.isPending || ['CANCELLED', 'COMPLETED'].includes(appointment.data.status)
            }
            onClick={() => cancel.mutate()}
          >
            Cancel
          </button>
        </div>
        <ol className="mt-4 grid gap-3">
          {appointment.data.statusHistory.map((entry) => (
            <li key={entry.id} className="rounded-md border border-slate-200 p-4">
              <p className="text-sm font-semibold text-ink">{entry.toStatus}</p>
              <p className="mt-1 text-xs text-slate-500">
                {new Date(entry.createdAt).toLocaleString()}
              </p>
              {entry.reason ? <p className="mt-2 text-sm text-slate-600">{entry.reason}</p> : null}
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}

function Header({ appointment }: Readonly<{ appointment: AppointmentSummary }>) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-panel">
      <p className="text-sm font-semibold text-clinical">{appointment.status}</p>
      <h1 className="mt-2 text-2xl font-semibold text-ink">
        {appointment.patient.firstName} {appointment.patient.lastName}
      </h1>
      <div className="mt-4 grid gap-3 text-sm text-slate-600 md:grid-cols-2">
        <p>{new Date(appointment.startAt).toLocaleString()}</p>
        <p>{appointment.branch.name}</p>
        <p>
          Dr. {appointment.doctor.staffProfile.user.firstName}{' '}
          {appointment.doctor.staffProfile.user.lastName}
        </p>
        <p>{appointment.service?.name ?? 'Clinic appointment'}</p>
      </div>
    </section>
  );
}
