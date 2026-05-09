'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useState } from 'react';

import {
  fetchSecurityIncident,
  fetchSecurityIncidents,
  updateSecurityIncident,
} from '@/lib/clinic-api';

const incidentStatuses = ['INVESTIGATING', 'CONTAINED', 'RESOLVED', 'FALSE_POSITIVE'] as const;

export function SecurityIncidentDetail({ id }: Readonly<{ id: string }>) {
  const queryClient = useQueryClient();
  const incidents = useQuery({
    queryKey: ['security', 'incidents'],
    queryFn: fetchSecurityIncidents,
    enabled: id === 'latest',
  });
  const incident = useQuery({
    queryKey: ['security', 'incident', id],
    queryFn: () => fetchSecurityIncident(id),
    enabled: id !== 'latest',
  });
  const [remediationNotes, setRemediationNotes] = useState('');
  const update = useMutation({
    mutationFn: (input: { status?: string; remediationNotes?: string }) =>
      updateSecurityIncident(id, input),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['security'] }),
  });

  if (id === 'latest') {
    return (
      <div className="grid gap-6">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Security Incidents</h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Open an incident to investigate and track remediation.
          </p>
        </div>
        <section className="rounded-lg border border-slate-200 bg-white shadow-panel">
          {incidents.data?.map((item) => (
            <Link
              key={item.id}
              className="block border-t border-slate-100 p-5 first:border-t-0 hover:bg-slate-50"
              href={`/dashboard/security/incidents/${item.id}`}
            >
              <p className="font-medium text-ink">{item.title}</p>
              <p className="mt-1 text-sm text-slate-500">
                {item.severity} - {item.status}
              </p>
            </Link>
          ))}
        </section>
      </div>
    );
  }

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink">Security Incident</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Track containment, resolution, and remediation evidence.
        </p>
      </div>
      {incident.data ? (
        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-panel">
          <h2 className="text-lg font-semibold text-ink">{incident.data.title}</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">{incident.data.description}</p>
          <p className="mt-3 text-sm font-semibold text-clinical">
            {incident.data.severity} - {incident.data.status}
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            {incidentStatuses.map((status) => (
              <button
                key={status}
                className="rounded-md border border-slate-300 px-3 py-2 text-xs font-semibold"
                onClick={() => update.mutate({ status })}
                type="button"
              >
                {status}
              </button>
            ))}
          </div>
          <div className="mt-5 grid gap-3">
            <textarea
              className="min-h-24 rounded-md border px-3 py-2 text-sm"
              placeholder="Remediation notes"
              value={remediationNotes}
              onChange={(event) => setRemediationNotes(event.target.value)}
            />
            <button
              className="w-fit rounded-md bg-clinical px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              disabled={!remediationNotes}
              onClick={() => update.mutate({ remediationNotes })}
              type="button"
            >
              Save notes
            </button>
          </div>
        </section>
      ) : null}
    </div>
  );
}
