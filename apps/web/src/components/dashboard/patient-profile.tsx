'use client';

import { useQuery } from '@tanstack/react-query';

import { fetchPatient } from '@/lib/clinic-api';

export function PatientProfile({ id }: Readonly<{ id: string }>) {
  const patient = useQuery({ queryKey: ['patient', id], queryFn: () => fetchPatient(id) });

  if (patient.isLoading) {
    return (
      <p className="rounded-lg border border-slate-200 bg-white p-5 text-sm text-slate-500">
        Loading patient profile...
      </p>
    );
  }

  if (patient.isError || !patient.data) {
    return (
      <p className="rounded-lg border border-slate-200 bg-white p-5 text-sm text-red-700">
        Unable to access this patient profile.
      </p>
    );
  }

  const profile = patient.data;

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink">
          {profile.firstName} {profile.lastName}
        </h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          {profile.medicalRecordNumber} - {profile.clinic.name}
        </p>
      </div>

      <section className="grid gap-4 md:grid-cols-2">
        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-panel">
          <h2 className="text-lg font-semibold text-ink">Basic information</h2>
          <dl className="mt-4 grid gap-3 text-sm">
            <Row label="Date of birth" value={new Date(profile.dateOfBirth).toLocaleDateString()} />
            <Row label="Gender" value={profile.gender} />
            <Row label="Primary doctor" value={doctorName(profile)} />
          </dl>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-panel">
          <h2 className="text-lg font-semibold text-ink">Contact</h2>
          <dl className="mt-4 grid gap-3 text-sm">
            <Row label="Phone" value={profile.contact?.phone ?? 'Not configured'} />
            <Row label="Email" value={profile.contact?.email ?? 'Not configured'} />
            <Row label="Address" value={profile.contact?.address ?? 'Not configured'} />
          </dl>
        </div>
      </section>
    </div>
  );
}

function Row({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <div className="grid grid-cols-[140px_1fr] gap-3">
      <dt className="text-slate-500">{label}</dt>
      <dd className="text-slate-800">{value}</dd>
    </div>
  );
}

function doctorName(profile: Awaited<ReturnType<typeof fetchPatient>>): string {
  if (!profile.primaryDoctor) {
    return 'Not assigned';
  }

  const doctor = profile.primaryDoctor.staffProfile.user;
  return `${doctor.firstName} ${doctor.lastName}`;
}
