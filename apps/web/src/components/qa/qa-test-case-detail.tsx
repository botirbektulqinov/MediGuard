'use client';

import { useQuery } from '@tanstack/react-query';

import { fetchQaCase } from '@/lib/clinic-api';

export function QaTestCaseDetail({ id }: Readonly<{ id: string }>) {
  const testCase = useQuery({ queryKey: ['qa', 'test-case', id], queryFn: () => fetchQaCase(id) });

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink">Test Case</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Review the test design and expected result.
        </p>
      </div>
      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-panel">
        {testCase.isLoading ? <p className="text-sm text-slate-500">Loading test case...</p> : null}
        {testCase.data ? (
          <div className="grid gap-4">
            <div>
              <p className="text-sm text-slate-500">{testCase.data.suite.name}</p>
              <h2 className="text-xl font-semibold text-ink">{testCase.data.title}</h2>
              <p className="mt-1 text-sm font-semibold text-clinical">{testCase.data.priority}</p>
            </div>
            <Detail label="Feature area" value={testCase.data.featureArea} />
            <Detail label="Preconditions" value={testCase.data.preconditions ?? 'None'} />
            <Detail label="Steps" value={testCase.data.steps} />
            <Detail label="Expected result" value={testCase.data.expectedResult} />
          </div>
        ) : null}
      </section>
    </div>
  );
}

function Detail({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <div>
      <p className="text-sm font-semibold text-slate-500">{label}</p>
      <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-slate-700">{value}</p>
    </div>
  );
}
