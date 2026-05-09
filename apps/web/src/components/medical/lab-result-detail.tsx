'use client';

import { useMutation, useQuery } from '@tanstack/react-query';

import { downloadAttachment, fetchPatientPortalLabResult } from '@/lib/clinic-api';

export function LabResultDetail({ id }: Readonly<{ id: string }>) {
  const result = useQuery({
    queryKey: ['patient-portal', 'lab-results', id],
    queryFn: () => fetchPatientPortalLabResult(id),
  });
  const download = useMutation({
    mutationFn: async () => {
      const attachment = result.data?.attachment;
      if (!attachment) return;
      const blob = await downloadAttachment(attachment.id);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = attachment.originalName;
      anchor.click();
      URL.revokeObjectURL(url);
    },
  });

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink">Lab Result</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">View the published result details.</p>
      </div>

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-panel">
        {result.isLoading ? <p className="text-sm text-slate-500">Loading result...</p> : null}
        {result.data ? (
          <div className="grid gap-4">
            <div>
              <p className="text-sm font-semibold text-slate-500">Test</p>
              <p className="text-lg font-semibold text-ink">{result.data.labOrder?.testName}</p>
            </div>
            <p className="text-sm leading-6 text-slate-700">{result.data.resultSummary}</p>
            {result.data.attachment ? (
              <button
                className="w-fit rounded-md bg-clinical px-4 py-2 text-sm font-semibold text-white"
                type="button"
                onClick={() => download.mutate()}
              >
                Download attachment
              </button>
            ) : null}
          </div>
        ) : null}
        {result.isError ? (
          <p className="text-sm text-red-700">Unable to load this result.</p>
        ) : null}
      </section>
    </div>
  );
}
