'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';

import { fetchPatients } from '@/lib/clinic-api';

export function PatientList() {
  const [search, setSearch] = useState('');
  const patients = useQuery({
    queryKey: ['patients', search],
    queryFn: () => fetchPatients(search),
  });

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink">Patients</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Authorized patient search with basic profile and contact information only.
        </p>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-panel">
        <label className="text-sm font-medium text-slate-700" htmlFor="patient-search">
          Search patients
        </label>
        <input
          id="patient-search"
          className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-clinical"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Name, MRN, phone, or email"
        />
      </div>

      <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-panel">
        {patients.isLoading ? (
          <p className="p-5 text-sm text-slate-500">Loading patients...</p>
        ) : null}
        {patients.isError ? (
          <p className="p-5 text-sm text-red-700">Patient search is not available for this role.</p>
        ) : null}
        {!patients.isLoading && patients.data?.length === 0 ? (
          <p className="p-5 text-sm text-slate-500">No matching patients found.</p>
        ) : null}
        {patients.data?.map((patient) => (
          <Link
            key={patient.id}
            href={`/dashboard/patients/${patient.id}`}
            className="grid gap-2 border-b border-slate-100 p-5 last:border-b-0 hover:bg-slate-50 md:grid-cols-[1fr_1fr_1fr]"
          >
            <div>
              <p className="font-medium text-ink">
                {patient.firstName} {patient.lastName}
              </p>
              <p className="text-sm text-slate-600">{patient.medicalRecordNumber}</p>
            </div>
            <div>
              <p className="text-sm text-slate-600">{patient.contact?.phone ?? 'No phone'}</p>
              <p className="text-sm text-slate-500">{patient.contact?.email ?? 'No email'}</p>
            </div>
            <div>
              <p className="text-sm text-slate-600">{patient.clinic.name}</p>
              <p className="text-xs text-slate-500">Profile opens with audited access</p>
            </div>
          </Link>
        ))}
      </section>
    </div>
  );
}
