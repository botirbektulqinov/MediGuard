'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { createQaReleaseGate, fetchQaReleaseGates, fetchQaRuns } from '@/lib/clinic-api';

export function QaReleaseGates() {
  const queryClient = useQueryClient();
  const runs = useQuery({ queryKey: ['qa', 'runs'], queryFn: fetchQaRuns });
  const gates = useQuery({ queryKey: ['qa', 'release-gates'], queryFn: fetchQaReleaseGates });
  const [testRunId, setTestRunId] = useState('');
  const [name, setName] = useState('');
  const [version, setVersion] = useState('');
  const create = useMutation({
    mutationFn: () => createQaReleaseGate({ testRunId, name, version, minPassRate: 90 }),
    onSuccess: () => {
      setName('');
      setVersion('');
      void queryClient.invalidateQueries({ queryKey: ['qa', 'release-gates'] });
    },
  });

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink">Release Quality Gate</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Evaluate release readiness against pass rate, required failures, and open critical bugs.
        </p>
      </div>
      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-panel">
        <h2 className="text-lg font-semibold text-ink">Create gate</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-4">
          <select
            className="rounded-md border px-3 py-2 text-sm"
            value={testRunId}
            onChange={(event) => setTestRunId(event.target.value)}
          >
            <option value="">Test run</option>
            {runs.data?.map((run) => (
              <option key={run.id} value={run.id}>
                {run.name}
              </option>
            ))}
          </select>
          <input
            className="rounded-md border px-3 py-2 text-sm"
            placeholder="Gate name"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
          <input
            className="rounded-md border px-3 py-2 text-sm"
            placeholder="Version"
            value={version}
            onChange={(event) => setVersion(event.target.value)}
          />
          <button
            className="rounded-md bg-clinical px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            disabled={!testRunId || !name || !version}
            onClick={() => create.mutate()}
            type="button"
          >
            Evaluate
          </button>
        </div>
      </section>
      <section className="rounded-lg border border-slate-200 bg-white shadow-panel">
        <h2 className="p-5 text-lg font-semibold text-ink">Gates</h2>
        {gates.data?.map((gate) => (
          <div key={gate.id} className="border-t border-slate-100 p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-medium text-ink">
                  {gate.name} {gate.version}
                </p>
                <p className="text-sm text-slate-500">{gate.testRun.name}</p>
              </div>
              <p className="text-sm font-semibold text-clinical">{gate.status}</p>
            </div>
            <div className="mt-3 grid gap-2">
              {gate.checks.map((check) => (
                <p key={check.id} className="text-sm text-slate-600">
                  {check.status}: {check.message}
                </p>
              ))}
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}
