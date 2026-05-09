'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { createQaBug, fetchQaBugs, updateQaBugStatus } from '@/lib/clinic-api';

const bugStatuses = [
  'TRIAGED',
  'IN_PROGRESS',
  'READY_FOR_QA',
  'RETEST',
  'CLOSED',
  'REOPENED',
] as const;

export function QaBugReports() {
  const queryClient = useQueryClient();
  const bugs = useQuery({ queryKey: ['qa', 'bugs'], queryFn: fetchQaBugs });
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [featureArea, setFeatureArea] = useState('');
  const create = useMutation({
    mutationFn: () => createQaBug({ title, description, featureArea, severity: 'HIGH' }),
    onSuccess: () => {
      setTitle('');
      setDescription('');
      setFeatureArea('');
      void queryClient.invalidateQueries({ queryKey: ['qa', 'bugs'] });
    },
  });
  const update = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => updateQaBugStatus(id, status),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['qa', 'bugs'] }),
  });

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink">Bug Reports</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Track defect lifecycle from open through QA closure.
        </p>
      </div>
      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-panel">
        <h2 className="text-lg font-semibold text-ink">Create bug</h2>
        <div className="mt-4 grid gap-3">
          <input
            className="rounded-md border px-3 py-2 text-sm"
            placeholder="Title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
          />
          <input
            className="rounded-md border px-3 py-2 text-sm"
            placeholder="Feature area"
            value={featureArea}
            onChange={(event) => setFeatureArea(event.target.value)}
          />
          <textarea
            className="min-h-20 rounded-md border px-3 py-2 text-sm"
            placeholder="Description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
          />
          <button
            className="w-fit rounded-md bg-clinical px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            disabled={!title || !featureArea || !description}
            onClick={() => create.mutate()}
            type="button"
          >
            Create bug
          </button>
        </div>
      </section>
      <section className="rounded-lg border border-slate-200 bg-white shadow-panel">
        <h2 className="p-5 text-lg font-semibold text-ink">Defects</h2>
        {bugs.data?.map((bug) => (
          <div
            key={bug.id}
            className="grid gap-3 border-t border-slate-100 p-5 md:grid-cols-[1fr_420px]"
          >
            <div>
              <p className="font-medium text-ink">{bug.title}</p>
              <p className="text-sm text-slate-500">
                {bug.severity} - {bug.status} - {bug.featureArea}
              </p>
              <p className="mt-1 text-sm text-slate-600">{bug.description}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {bugStatuses.map((status) => (
                <button
                  key={status}
                  className="rounded-md border px-3 py-2 text-xs font-semibold"
                  type="button"
                  onClick={() => update.mutate({ id: bug.id, status })}
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
