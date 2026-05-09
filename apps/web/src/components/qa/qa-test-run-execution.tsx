'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { createQaBug, fetchQaRun, updateQaResult } from '@/lib/clinic-api';

const resultStatuses = ['PASSED', 'FAILED', 'BLOCKED', 'SKIPPED'] as const;

export function QaTestRunExecution({ id }: Readonly<{ id: string }>) {
  const queryClient = useQueryClient();
  const run = useQuery({
    queryKey: ['qa', 'run', id],
    queryFn: () => fetchQaRun(id),
    enabled: id !== 'latest',
  });
  const update = useMutation({
    mutationFn: ({ resultId, status }: { resultId: string; status: string }) =>
      updateQaResult(resultId, { status, actualResult: `Marked ${status} from QA Center` }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['qa'] }),
  });
  const createBug = useMutation({
    mutationFn: ({
      resultId,
      title,
      expectedResult,
      featureArea,
    }: {
      resultId: string;
      title: string;
      expectedResult: string;
      featureArea: string;
    }) =>
      createQaBug({
        testRunResultId: resultId,
        title: `Failed test: ${title}`,
        description: `Expected result: ${expectedResult}`,
        severity: 'HIGH',
        featureArea,
      }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['qa'] }),
  });
  const counts = run.data?.results.reduce<Record<string, number>>((accumulator, result) => {
    accumulator[result.status] = (accumulator[result.status] ?? 0) + 1;

    return accumulator;
  }, {});
  const completedResults =
    run.data?.results.filter((result) => !['PENDING', 'SKIPPED'].includes(result.status)).length ??
    0;
  const passedResults =
    run.data?.results.filter((result) => result.status === 'PASSED').length ?? 0;
  const passRate = completedResults > 0 ? Math.round((passedResults / completedResults) * 100) : 0;

  if (id === 'latest') {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-5 text-sm text-slate-600 shadow-panel">
        Start a run from the Test Suites page.
      </div>
    );
  }

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink">Test Run Execution</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Execute each case and record the observed result.
        </p>
      </div>
      <section className="rounded-lg border border-slate-200 bg-white shadow-panel">
        {run.isLoading ? <p className="p-5 text-sm text-slate-500">Loading run...</p> : null}
        {run.data ? (
          <>
            <div className="p-5">
              <h2 className="text-lg font-semibold text-ink">{run.data.name}</h2>
              <p className="mt-1 text-sm text-slate-500">{run.data.status}</p>
              <div className="mt-4 grid gap-3 sm:grid-cols-5">
                {['PASSED', 'FAILED', 'BLOCKED', 'SKIPPED', 'PENDING'].map((status) => (
                  <div key={status} className="rounded-md border border-slate-200 p-3">
                    <p className="text-xs font-semibold uppercase text-slate-500">{status}</p>
                    <p className="mt-1 text-xl font-semibold text-ink">{counts?.[status] ?? 0}</p>
                  </div>
                ))}
              </div>
              <p className="mt-3 text-sm font-medium text-clinical">Pass rate: {passRate}%</p>
            </div>
            {run.data.results.map((result) => (
              <div
                key={result.id}
                className="grid gap-3 border-t border-slate-100 p-5 md:grid-cols-[1fr_460px]"
              >
                <div>
                  <p className="font-medium text-ink">{result.testCase.title}</p>
                  <p className="mt-1 text-sm text-slate-500">{result.testCase.expectedResult}</p>
                  <p className="mt-2 text-sm font-semibold text-clinical">{result.status}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {resultStatuses.map((status) => (
                    <button
                      key={status}
                      className="rounded-md border border-slate-300 px-3 py-2 text-xs font-semibold"
                      type="button"
                      onClick={() => update.mutate({ resultId: result.id, status })}
                    >
                      {status}
                    </button>
                  ))}
                  {result.status === 'FAILED' && result.bugReports.length === 0 ? (
                    <button
                      className="rounded-md bg-alert px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
                      disabled={createBug.isPending}
                      type="button"
                      onClick={() =>
                        createBug.mutate({
                          resultId: result.id,
                          title: result.testCase.title,
                          expectedResult: result.testCase.expectedResult,
                          featureArea: result.testCase.featureArea,
                        })
                      }
                    >
                      Create bug
                    </button>
                  ) : null}
                </div>
              </div>
            ))}
          </>
        ) : null}
      </section>
    </div>
  );
}
