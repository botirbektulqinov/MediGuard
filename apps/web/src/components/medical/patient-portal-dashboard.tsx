'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';

import {
  fetchPatientPortalLabResults,
  fetchPatientPortalVisits,
  fetchRoleDashboard,
} from '@/lib/clinic-api';
import { ErrorState, MetricGrid } from '../dashboard/dashboard-widgets';

export function PatientPortalDashboard() {
  const summary = useQuery({
    queryKey: ['dashboard-summary', 'patient'],
    queryFn: () => fetchRoleDashboard('patient'),
  });
  const visits = useQuery({
    queryKey: ['patient-portal', 'visits'],
    queryFn: fetchPatientPortalVisits,
  });
  const labResults = useQuery({
    queryKey: ['patient-portal', 'lab-results'],
    queryFn: fetchPatientPortalLabResults,
  });

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink">Patient Portal</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Review completed visit records and ready lab results for your patient profile.
        </p>
      </div>

      {summary.data ? <MetricGrid metrics={summary.data.metrics} /> : null}
      {summary.isError ? <ErrorState label="Unable to load patient dashboard summary." /> : null}

      <section className="rounded-lg border border-slate-200 bg-white shadow-panel">
        <h2 className="p-5 text-lg font-semibold text-ink">Visit history</h2>
        {visits.isLoading ? (
          <p className="px-5 pb-5 text-sm text-slate-500">Loading visits...</p>
        ) : null}
        {visits.data?.map((visit) => (
          <div key={visit.id} className="border-t border-slate-100 p-5">
            <p className="font-medium text-ink">{new Date(visit.createdAt).toLocaleString()}</p>
            <p className="mt-1 text-sm text-slate-600">
              {visit.diagnosis ?? 'No diagnosis note available.'}
            </p>
            <p className="mt-1 text-sm text-slate-500">{visit.recommendation}</p>
          </div>
        ))}
        {!visits.isLoading && !visits.data?.length ? (
          <p className="px-5 pb-5 text-sm text-slate-500">No visits are available.</p>
        ) : null}
      </section>

      <section className="rounded-lg border border-slate-200 bg-white shadow-panel">
        <h2 className="p-5 text-lg font-semibold text-ink">Lab results</h2>
        {labResults.isLoading ? (
          <p className="px-5 pb-5 text-sm text-slate-500">Loading lab results...</p>
        ) : null}
        {labResults.data?.map((result) => (
          <Link
            key={result.id}
            className="grid gap-2 border-t border-slate-100 p-5 hover:bg-slate-50 md:grid-cols-[1fr_160px]"
            href={`/dashboard/patient/lab-results/${result.id}`}
          >
            <div>
              <p className="font-medium text-ink">{result.labOrder?.testName}</p>
              <p className="text-sm text-slate-500">{result.resultSummary}</p>
            </div>
            <p className="text-sm font-semibold text-clinical">{result.status}</p>
          </Link>
        ))}
        {!labResults.isLoading && !labResults.data?.length ? (
          <p className="px-5 pb-5 text-sm text-slate-500">No lab results are ready.</p>
        ) : null}
      </section>
    </div>
  );
}
