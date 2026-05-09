'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  confirmAppointment,
  enqueueAppointment,
  fetchAppointments,
  fetchTodayQueue,
  markAppointmentArrived,
} from '@/lib/clinic-api';

export function ReceptionQueueDashboard() {
  const queryClient = useQueryClient();
  const appointments = useQuery({ queryKey: ['appointments'], queryFn: fetchAppointments });
  const queue = useQuery({ queryKey: ['queue', 'today'], queryFn: fetchTodayQueue });

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ['appointments'] });
    void queryClient.invalidateQueries({ queryKey: ['queue', 'today'] });
  };
  const confirm = useMutation({ mutationFn: confirmAppointment, onSuccess: refresh });
  const arrive = useMutation({ mutationFn: markAppointmentArrived, onSuccess: refresh });
  const enqueue = useMutation({ mutationFn: enqueueAppointment, onSuccess: refresh });

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink">Reception Queue</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Confirm appointments, mark arrivals, and move patients into the doctor queue.
        </p>
      </div>

      <section className="rounded-lg border border-slate-200 bg-white shadow-panel">
        <h2 className="p-5 text-lg font-semibold text-ink">Appointments</h2>
        {appointments.data?.map((appointment) => (
          <div
            key={appointment.id}
            className="grid gap-3 border-t border-slate-100 p-5 md:grid-cols-[1fr_120px_260px]"
          >
            <div>
              <p className="font-medium text-ink">
                {appointment.patient.firstName} {appointment.patient.lastName}
              </p>
              <p className="text-sm text-slate-500">
                {new Date(appointment.startAt).toLocaleString()}
              </p>
            </div>
            <p className="text-sm font-semibold text-clinical">{appointment.status}</p>
            <div className="flex flex-wrap gap-2">
              <button
                className="rounded-md border border-slate-300 px-3 py-2 text-xs font-semibold"
                type="button"
                onClick={() => confirm.mutate(appointment.id)}
              >
                Confirm
              </button>
              <button
                className="rounded-md border border-slate-300 px-3 py-2 text-xs font-semibold"
                type="button"
                onClick={() => arrive.mutate(appointment.id)}
              >
                Arrived
              </button>
              <button
                className="rounded-md bg-clinical px-3 py-2 text-xs font-semibold text-white"
                type="button"
                onClick={() => enqueue.mutate(appointment.id)}
              >
                Queue
              </button>
            </div>
          </div>
        ))}
      </section>

      <section className="rounded-lg border border-slate-200 bg-white shadow-panel">
        <h2 className="p-5 text-lg font-semibold text-ink">Today&apos;s queue</h2>
        {queue.data?.map((entry) => (
          <div
            key={entry.id}
            className="grid gap-2 border-t border-slate-100 p-5 md:grid-cols-[80px_1fr_160px]"
          >
            <p className="text-lg font-semibold text-ink">#{entry.position}</p>
            <p className="text-sm text-slate-700">
              {entry.appointment.patient.firstName} {entry.appointment.patient.lastName}
            </p>
            <p className="text-sm font-semibold text-clinical">{entry.status}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
