'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  createSecurityIncident,
  evaluateSuspiciousActivity,
  fetchSuspiciousActivityEvents,
  fetchSuspiciousActivityRules,
} from '@/lib/clinic-api';

export function SuspiciousActivityPage() {
  const queryClient = useQueryClient();
  const rules = useQuery({
    queryKey: ['security', 'rules'],
    queryFn: fetchSuspiciousActivityRules,
  });
  const events = useQuery({
    queryKey: ['security', 'events'],
    queryFn: fetchSuspiciousActivityEvents,
  });
  const evaluate = useMutation({
    mutationFn: evaluateSuspiciousActivity,
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['security'] }),
  });
  const createIncident = useMutation({
    mutationFn: (event: { id: string; title: string; description: string; severity: string }) =>
      createSecurityIncident({
        sourceEventId: event.id,
        title: event.title,
        description: event.description,
        severity: event.severity,
      }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['security'] }),
  });

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Suspicious Activity</h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Evaluate defensive rules against login attempts and audit logs.
          </p>
        </div>
        <button
          className="rounded-md bg-clinical px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          disabled={evaluate.isPending}
          onClick={() => evaluate.mutate()}
          type="button"
        >
          Evaluate
        </button>
      </div>
      <section className="rounded-lg border border-slate-200 bg-white shadow-panel">
        <h2 className="p-5 text-lg font-semibold text-ink">Rules</h2>
        {rules.data?.map((rule) => (
          <div key={rule.id} className="grid gap-2 border-t border-slate-100 p-5 md:grid-cols-4">
            <p className="font-medium text-ink">{rule.name}</p>
            <p className="text-sm text-slate-600">{rule.severity}</p>
            <p className="text-sm text-slate-600">
              {rule.threshold} in {rule.windowMinutes}m
            </p>
            <p className="text-sm text-slate-600">{rule.isEnabled ? 'Enabled' : 'Disabled'}</p>
          </div>
        ))}
      </section>
      <section className="rounded-lg border border-slate-200 bg-white shadow-panel">
        <h2 className="p-5 text-lg font-semibold text-ink">Events</h2>
        {events.data?.map((event) => (
          <div
            key={event.id}
            className="grid gap-3 border-t border-slate-100 p-5 md:grid-cols-[1fr_160px]"
          >
            <div>
              <p className="font-medium text-ink">{event.title}</p>
              <p className="mt-1 text-sm text-slate-500">{event.description}</p>
              <p className="mt-2 text-xs font-semibold text-slate-500">
                {event.severity} - {event.status} - {new Date(event.occurredAt).toLocaleString()}
              </p>
            </div>
            <button
              className="h-fit rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold disabled:opacity-50"
              disabled={Boolean(event.incident) || createIncident.isPending}
              onClick={() => createIncident.mutate(event)}
              type="button"
            >
              Create incident
            </button>
          </div>
        ))}
      </section>
    </div>
  );
}
