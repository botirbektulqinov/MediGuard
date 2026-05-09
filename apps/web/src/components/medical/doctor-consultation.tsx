'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import {
  completeVisit,
  createLabOrder,
  createVisit,
  fetchTodayQueue,
  type VisitSummary,
} from '@/lib/clinic-api';

export function DoctorConsultation() {
  const queryClient = useQueryClient();
  const queue = useQuery({ queryKey: ['queue', 'today'], queryFn: fetchTodayQueue });
  const [appointmentId, setAppointmentId] = useState('');
  const [diagnosisNote, setDiagnosisNote] = useState('');
  const [recommendation, setRecommendation] = useState('');
  const [prescriptionNote, setPrescriptionNote] = useState('');
  const [testName, setTestName] = useState('');
  const [instructions, setInstructions] = useState('');
  const [visit, setVisit] = useState<VisitSummary | null>(null);

  const create = useMutation({
    mutationFn: () =>
      createVisit({
        appointmentId,
        ...(diagnosisNote ? { diagnosisNote } : {}),
        ...(recommendation ? { recommendation } : {}),
        ...(prescriptionNote ? { prescriptionNote } : {}),
      }),
    onSuccess: (created) => setVisit(created),
  });
  const order = useMutation({
    mutationFn: () =>
      createLabOrder(visit?.id ?? '', { testName, ...(instructions ? { instructions } : {}) }),
    onSuccess: (updated) => {
      setVisit(updated);
      setTestName('');
      setInstructions('');
    },
  });
  const complete = useMutation({
    mutationFn: () => completeVisit(visit?.id ?? ''),
    onSuccess: (updated) => {
      setVisit(updated);
      void queryClient.invalidateQueries({ queryKey: ['queue', 'today'] });
    },
  });

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink">Consultation</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Create visit records for active assigned appointments and request lab tests.
        </p>
      </div>

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-panel">
        <h2 className="text-lg font-semibold text-ink">Active queue</h2>
        <div className="mt-4 grid gap-3">
          {queue.data?.map((entry) => (
            <button
              key={entry.id}
              className="rounded-md border border-slate-200 px-3 py-2 text-left text-sm hover:bg-slate-50"
              type="button"
              onClick={() => setAppointmentId(entry.appointment.id)}
            >
              {entry.appointment.patient.firstName} {entry.appointment.patient.lastName} -{' '}
              {entry.appointment.status}
            </button>
          ))}
          {!queue.isLoading && !queue.data?.length ? (
            <p className="text-sm text-slate-500">No assigned queue entries.</p>
          ) : null}
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-panel">
        <h2 className="text-lg font-semibold text-ink">Visit record</h2>
        <div className="mt-4 grid gap-4">
          <input
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
            value={appointmentId}
            onChange={(event) => setAppointmentId(event.target.value)}
            placeholder="Appointment ID"
          />
          <textarea
            className="min-h-24 rounded-md border border-slate-300 px-3 py-2 text-sm"
            value={diagnosisNote}
            onChange={(event) => setDiagnosisNote(event.target.value)}
            placeholder="Diagnosis note"
          />
          <textarea
            className="min-h-20 rounded-md border border-slate-300 px-3 py-2 text-sm"
            value={recommendation}
            onChange={(event) => setRecommendation(event.target.value)}
            placeholder="Recommendation"
          />
          <textarea
            className="min-h-20 rounded-md border border-slate-300 px-3 py-2 text-sm"
            value={prescriptionNote}
            onChange={(event) => setPrescriptionNote(event.target.value)}
            placeholder="Prescription note"
          />
        </div>
        {create.isError ? (
          <p className="mt-3 text-sm text-red-700">Unable to create visit.</p>
        ) : null}
        <button
          className="mt-4 rounded-md bg-clinical px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          type="button"
          disabled={!appointmentId || create.isPending}
          onClick={() => create.mutate()}
        >
          Create visit
        </button>
      </section>

      {visit ? (
        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-panel">
          <h2 className="text-lg font-semibold text-ink">Lab and completion</h2>
          <p className="mt-1 text-sm text-slate-500">
            {visit.patient.firstName} {visit.patient.lastName} - {visit.status}
          </p>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <input
              className="rounded-md border border-slate-300 px-3 py-2 text-sm"
              value={testName}
              onChange={(event) => setTestName(event.target.value)}
              placeholder="Lab test"
            />
            <input
              className="rounded-md border border-slate-300 px-3 py-2 text-sm"
              value={instructions}
              onChange={(event) => setInstructions(event.target.value)}
              placeholder="Instructions"
            />
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold"
              type="button"
              disabled={!testName || order.isPending}
              onClick={() => order.mutate()}
            >
              Request lab
            </button>
            <button
              className="rounded-md bg-clinical px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              type="button"
              disabled={complete.isPending || visit.status === 'COMPLETED'}
              onClick={() => complete.mutate()}
            >
              Complete visit
            </button>
          </div>
          <div className="mt-4 grid gap-2 text-sm text-slate-600">
            {visit.labOrders.map((labOrder) => (
              <p key={labOrder.id}>
                {labOrder.testName}: {labOrder.status}
              </p>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
