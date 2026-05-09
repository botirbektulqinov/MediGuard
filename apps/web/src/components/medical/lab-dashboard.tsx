'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { fetchLabOrders, markLabResultReady, uploadLabResult } from '@/lib/clinic-api';

export function LabDashboard() {
  const queryClient = useQueryClient();
  const orders = useQuery({ queryKey: ['lab-orders'], queryFn: fetchLabOrders });
  const [selectedOrderId, setSelectedOrderId] = useState('');
  const [summary, setSummary] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const upload = useMutation({
    mutationFn: () => {
      if (!file) throw new Error('Missing file.');
      return uploadLabResult(selectedOrderId, { resultSummary: summary, file });
    },
    onSuccess: () => {
      setSummary('');
      setFile(null);
      void queryClient.invalidateQueries({ queryKey: ['lab-orders'] });
    },
  });
  const ready = useMutation({
    mutationFn: markLabResultReady,
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['lab-orders'] }),
  });

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink">Lab Dashboard</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Upload validated lab result files and publish ready results to patient portals.
        </p>
      </div>

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-panel">
        <h2 className="text-lg font-semibold text-ink">Upload result</h2>
        <div className="mt-4 grid gap-4">
          <select
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
            value={selectedOrderId}
            onChange={(event) => setSelectedOrderId(event.target.value)}
          >
            <option value="">Lab order</option>
            {orders.data?.map((order) => (
              <option key={order.id} value={order.id}>
                {order.testName} - {order.status}
              </option>
            ))}
          </select>
          <textarea
            className="min-h-20 rounded-md border border-slate-300 px-3 py-2 text-sm"
            value={summary}
            onChange={(event) => setSummary(event.target.value)}
            placeholder="Result summary"
          />
          <input
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
            type="file"
            accept="application/pdf,image/png,image/jpeg,text/plain"
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
          />
        </div>
        {upload.isError ? (
          <p className="mt-3 text-sm text-red-700">Upload failed. Check file type and size.</p>
        ) : null}
        <button
          className="mt-4 rounded-md bg-clinical px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          type="button"
          disabled={!selectedOrderId || !file || upload.isPending}
          onClick={() => upload.mutate()}
        >
          Upload
        </button>
      </section>

      <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-panel">
        <h2 className="p-5 text-lg font-semibold text-ink">Orders</h2>
        {orders.isLoading ? (
          <p className="px-5 pb-5 text-sm text-slate-500">Loading orders...</p>
        ) : null}
        {orders.data?.map((order) => (
          <div
            key={order.id}
            className="grid gap-3 border-t border-slate-100 p-5 md:grid-cols-[1fr_160px_160px]"
          >
            <div>
              <p className="font-medium text-ink">{order.testName}</p>
              <p className="text-sm text-slate-500">
                {order.patient?.firstName} {order.patient?.lastName}
              </p>
            </div>
            <p className="text-sm font-semibold text-clinical">{order.status}</p>
            {order.result?.id && order.result.status !== 'READY' ? (
              <button
                className="rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold"
                type="button"
                onClick={() => ready.mutate(order.result?.id ?? '')}
              >
                Mark ready
              </button>
            ) : null}
          </div>
        ))}
      </section>
    </div>
  );
}
