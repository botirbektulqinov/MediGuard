'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import {
  createSecurityFinding,
  fetchSecurityFindings,
  updateSecurityFinding,
} from '@/lib/clinic-api';

export function SecurityFindingsPage() {
  const queryClient = useQueryClient();
  const findings = useQuery({ queryKey: ['security', 'findings'], queryFn: fetchSecurityFindings });
  const [title, setTitle] = useState('');
  const [affectedModule, setAffectedModule] = useState('');
  const [description, setDescription] = useState('');
  const create = useMutation({
    mutationFn: () =>
      createSecurityFinding({
        title,
        affectedModule,
        description,
        severity: 'MEDIUM',
        remediation: 'Document remediation owner and target date.',
      }),
    onSuccess: () => {
      setTitle('');
      setAffectedModule('');
      setDescription('');
      void queryClient.invalidateQueries({ queryKey: ['security'] });
    },
  });
  const update = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      updateSecurityFinding(id, { status }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['security'] }),
  });

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink">Security Findings</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Track defensive security gaps, evidence, remediation, and residual risk decisions.
        </p>
      </div>
      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-panel">
        <h2 className="text-lg font-semibold text-ink">Create finding</h2>
        <div className="mt-4 grid gap-3">
          <input
            className="rounded-md border px-3 py-2 text-sm"
            placeholder="Title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
          />
          <input
            className="rounded-md border px-3 py-2 text-sm"
            placeholder="Affected module"
            value={affectedModule}
            onChange={(event) => setAffectedModule(event.target.value)}
          />
          <textarea
            className="min-h-24 rounded-md border px-3 py-2 text-sm"
            placeholder="Description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
          />
          <button
            className="w-fit rounded-md bg-clinical px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            disabled={!title || !affectedModule || !description || create.isPending}
            onClick={() => create.mutate()}
            type="button"
          >
            Create
          </button>
        </div>
      </section>
      <section className="rounded-lg border border-slate-200 bg-white shadow-panel">
        <h2 className="p-5 text-lg font-semibold text-ink">Findings</h2>
        {findings.data?.map((finding) => (
          <div
            key={finding.id}
            className="grid gap-3 border-t border-slate-100 p-5 md:grid-cols-[1fr_220px]"
          >
            <div>
              <p className="font-medium text-ink">{finding.title}</p>
              <p className="mt-1 text-sm text-slate-500">{finding.description}</p>
              <p className="mt-2 text-xs font-semibold text-slate-500">
                {finding.severity} - {finding.status} - {finding.affectedModule}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {['REMEDIATED', 'ACCEPTED_RISK', 'FALSE_POSITIVE'].map((status) => (
                <button
                  key={status}
                  className="rounded-md border border-slate-300 px-3 py-2 text-xs font-semibold"
                  onClick={() => update.mutate({ id: finding.id, status })}
                  type="button"
                >
                  {status}
                </button>
              ))}
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}
