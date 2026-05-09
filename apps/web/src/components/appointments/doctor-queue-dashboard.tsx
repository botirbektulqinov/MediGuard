'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  completeQueueConsultation,
  fetchTodayQueue,
  markQueueLabRequired,
  startQueueConsultation,
} from '@/lib/clinic-api';

export function DoctorQueueDashboard() {
  const queryClient = useQueryClient();
  const queue = useQuery({ queryKey: ['queue', 'today'], queryFn: fetchTodayQueue });
  const refresh = () => void queryClient.invalidateQueries({ queryKey: ['queue', 'today'] });
  const start = useMutation({ mutationFn: startQueueConsultation, onSuccess: refresh });
  const lab = useMutation({ mutationFn: markQueueLabRequired, onSuccess: refresh });
  const complete = useMutation({ mutationFn: completeQueueConsultation, onSuccess: refresh });

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink">Doctor Queue</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Start consultations and complete today&apos;s assigned appointments.
        </p>
      </div>

      <section className="rounded-lg border border-slate-200 bg-white shadow-panel">
        {queue.isLoading ? <p className="p-5 text-sm text-slate-500">Loading queue...</p> : null}
        {queue.data?.map((entry) => (
          <div
            key={entry.id}
            className="grid gap-3 border-b border-slate-100 p-5 last:border-b-0 md:grid-cols-[80px_1fr_260px]"
          >
            <p className="text-lg font-semibold text-ink">#{entry.position}</p>
            <div>
              <p className="font-medium text-ink">
                {entry.appointment.patient.firstName} {entry.appointment.patient.lastName}
              </p>
              <p className="text-sm text-slate-500">{entry.status}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                className="rounded-md border border-slate-300 px-3 py-2 text-xs font-semibold"
                type="button"
                onClick={() => start.mutate(entry.id)}
              >
                Start
              </button>
              <button
                className="rounded-md border border-slate-300 px-3 py-2 text-xs font-semibold"
                type="button"
                onClick={() => lab.mutate(entry.id)}
              >
                Lab
              </button>
              <button
                className="rounded-md bg-clinical px-3 py-2 text-xs font-semibold text-white"
                type="button"
                onClick={() => complete.mutate(entry.id)}
              >
                Complete
              </button>
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}
