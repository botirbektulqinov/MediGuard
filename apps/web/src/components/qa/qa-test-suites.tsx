'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useState } from 'react';

import { createQaCase, createQaSuite, fetchQaSuites, startQaRun } from '@/lib/clinic-api';

export function QaTestSuites() {
  const queryClient = useQueryClient();
  const suites = useQuery({ queryKey: ['qa', 'suites'], queryFn: fetchQaSuites });
  const [suiteName, setSuiteName] = useState('');
  const [featureArea, setFeatureArea] = useState('');
  const [selectedSuiteId, setSelectedSuiteId] = useState('');
  const [caseTitle, setCaseTitle] = useState('');
  const [steps, setSteps] = useState('');
  const [expectedResult, setExpectedResult] = useState('');
  const [runName, setRunName] = useState('');
  const selectedSuite = suites.data?.find((suite) => suite.id === selectedSuiteId);

  const refresh = () => void queryClient.invalidateQueries({ queryKey: ['qa'] });
  const createSuite = useMutation({
    mutationFn: () => createQaSuite({ name: suiteName, featureArea }),
    onSuccess: (suite) => {
      setSelectedSuiteId(suite.id);
      setSuiteName('');
      setFeatureArea('');
      refresh();
    },
  });
  const createCase = useMutation({
    mutationFn: () =>
      createQaCase({
        suiteId: selectedSuiteId,
        title: caseTitle,
        featureArea: selectedSuite?.featureArea ?? featureArea,
        steps,
        expectedResult,
        priority: 'CRITICAL',
        isRequired: true,
      }),
    onSuccess: () => {
      setCaseTitle('');
      setSteps('');
      setExpectedResult('');
      refresh();
    },
  });
  const startRun = useMutation({
    mutationFn: () => startQaRun({ suiteId: selectedSuiteId, name: runName }),
    onSuccess: (run) => {
      setRunName('');
      refresh();
      window.location.assign(`/dashboard/qa/test-runs/${run.id}`);
    },
  });

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink">Test Suites</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Create suites, required cases, and execution runs.
        </p>
      </div>
      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-panel">
        <h2 className="text-lg font-semibold text-ink">Create suite</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <input
            className="rounded-md border px-3 py-2 text-sm"
            placeholder="Suite name"
            value={suiteName}
            onChange={(event) => setSuiteName(event.target.value)}
          />
          <input
            className="rounded-md border px-3 py-2 text-sm"
            placeholder="Feature area"
            value={featureArea}
            onChange={(event) => setFeatureArea(event.target.value)}
          />
          <button
            className="rounded-md bg-clinical px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            disabled={!suiteName || !featureArea}
            onClick={() => createSuite.mutate()}
            type="button"
          >
            Create
          </button>
        </div>
      </section>
      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-panel">
        <h2 className="text-lg font-semibold text-ink">Add required test case</h2>
        <div className="mt-4 grid gap-3">
          <select
            className="rounded-md border px-3 py-2 text-sm"
            value={selectedSuiteId}
            onChange={(event) => setSelectedSuiteId(event.target.value)}
          >
            <option value="">Suite</option>
            {suites.data?.map((suite) => (
              <option key={suite.id} value={suite.id}>
                {suite.name}
              </option>
            ))}
          </select>
          <input
            className="rounded-md border px-3 py-2 text-sm"
            placeholder="Case title"
            value={caseTitle}
            onChange={(event) => setCaseTitle(event.target.value)}
          />
          <textarea
            className="min-h-20 rounded-md border px-3 py-2 text-sm"
            placeholder="Steps"
            value={steps}
            onChange={(event) => setSteps(event.target.value)}
          />
          <textarea
            className="min-h-20 rounded-md border px-3 py-2 text-sm"
            placeholder="Expected result"
            value={expectedResult}
            onChange={(event) => setExpectedResult(event.target.value)}
          />
          <button
            className="w-fit rounded-md bg-clinical px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            disabled={!selectedSuiteId || !caseTitle || !steps || !expectedResult}
            onClick={() => createCase.mutate()}
            type="button"
          >
            Add case
          </button>
        </div>
      </section>
      <section className="rounded-lg border border-slate-200 bg-white shadow-panel">
        <h2 className="p-5 text-lg font-semibold text-ink">Suites</h2>
        {suites.data?.map((suite) => (
          <div
            key={suite.id}
            className="grid gap-3 border-t border-slate-100 p-5 md:grid-cols-[1fr_260px]"
          >
            <div>
              <p className="font-medium text-ink">{suite.name}</p>
              <p className="text-sm text-slate-500">
                {suite.featureArea} - {suite.testCases.length} cases
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {suite.testCases.map((testCase) => (
                  <Link
                    key={testCase.id}
                    className="text-xs font-semibold text-clinical"
                    href={`/dashboard/qa/test-cases/${testCase.id}`}
                  >
                    {testCase.title}
                  </Link>
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              <input
                className="min-w-0 rounded-md border px-3 py-2 text-sm"
                placeholder="Run name"
                value={selectedSuiteId === suite.id ? runName : ''}
                onChange={(event) => {
                  setSelectedSuiteId(suite.id);
                  setRunName(event.target.value);
                }}
              />
              <button
                className="rounded-md border px-3 py-2 text-sm font-semibold"
                disabled={selectedSuiteId !== suite.id || !runName}
                onClick={() => startRun.mutate()}
                type="button"
              >
                Start
              </button>
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}
