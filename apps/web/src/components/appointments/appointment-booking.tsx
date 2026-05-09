'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useMemo, useState } from 'react';

import {
  bookAppointment,
  fetchAppointments,
  fetchBranches,
  fetchClinicServices,
  fetchStaff,
  type AppointmentSummary,
} from '@/lib/clinic-api';

export function AppointmentBooking() {
  const queryClient = useQueryClient();
  const branches = useQuery({ queryKey: ['branches'], queryFn: fetchBranches });
  const services = useQuery({ queryKey: ['clinic-services'], queryFn: fetchClinicServices });
  const staff = useQuery({ queryKey: ['staff'], queryFn: fetchStaff });
  const appointments = useQuery({ queryKey: ['appointments'], queryFn: fetchAppointments });

  const doctors = useMemo(
    () => staff.data?.filter((member) => member.doctorProfile) ?? [],
    [staff.data],
  );

  const [doctorId, setDoctorId] = useState('');
  const [branchId, setBranchId] = useState('');
  const [serviceId, setServiceId] = useState('');
  const [startAt, setStartAt] = useState('');
  const [reason, setReason] = useState('');
  const [created, setCreated] = useState<AppointmentSummary | null>(null);

  const booking = useMutation({
    mutationFn: () =>
      bookAppointment({
        doctorId,
        branchId,
        ...(serviceId ? { serviceId } : {}),
        startAt: new Date(startAt).toISOString(),
        ...(reason ? { reason } : {}),
      }),
    onSuccess: (appointment) => {
      setCreated(appointment);
      void queryClient.invalidateQueries({ queryKey: ['appointments'] });
    },
  });

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink">Appointments</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Book appointments and review status history across the clinic workflow.
        </p>
      </div>

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-panel">
        <h2 className="text-lg font-semibold text-ink">Book appointment</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <select
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
            value={doctorId}
            onChange={(event) => setDoctorId(event.target.value)}
          >
            <option value="">Doctor</option>
            {doctors.map((doctor) => (
              <option key={doctor.id} value={doctor.doctorProfile?.id}>
                {doctor.user.firstName} {doctor.user.lastName} - {doctor.doctorProfile?.specialty}
              </option>
            ))}
          </select>
          <select
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
            value={branchId}
            onChange={(event) => setBranchId(event.target.value)}
          >
            <option value="">Branch</option>
            {branches.data?.map((branch) => (
              <option key={branch.id} value={branch.id}>
                {branch.name}
              </option>
            ))}
          </select>
          <select
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
            value={serviceId}
            onChange={(event) => setServiceId(event.target.value)}
          >
            <option value="">Service</option>
            {services.data?.map((service) => (
              <option key={service.id} value={service.id}>
                {service.name}
              </option>
            ))}
          </select>
          <input
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
            type="datetime-local"
            value={startAt}
            onChange={(event) => setStartAt(event.target.value)}
          />
          <input
            className="rounded-md border border-slate-300 px-3 py-2 text-sm md:col-span-2"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="Reason"
          />
        </div>
        {booking.isError ? (
          <p className="mt-3 text-sm text-red-700">Unable to book this appointment.</p>
        ) : null}
        {created ? (
          <p className="mt-3 text-sm text-clinical">
            Booked. <Link href={`/dashboard/appointments/${created.id}`}>Open timeline</Link>
          </p>
        ) : null}
        <button
          className="mt-4 rounded-md bg-clinical px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          type="button"
          disabled={!doctorId || !branchId || !startAt || booking.isPending}
          onClick={() => booking.mutate()}
        >
          Book
        </button>
      </section>

      <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-panel">
        <h2 className="p-5 text-lg font-semibold text-ink">Appointments</h2>
        {appointments.isLoading ? (
          <p className="px-5 pb-5 text-sm text-slate-500">Loading appointments...</p>
        ) : null}
        {appointments.data?.map((appointment) => (
          <Link
            key={appointment.id}
            href={`/dashboard/appointments/${appointment.id}`}
            className="grid gap-2 border-t border-slate-100 p-5 hover:bg-slate-50 md:grid-cols-[1fr_1fr_120px]"
          >
            <div>
              <p className="font-medium text-ink">
                {appointment.patient.firstName} {appointment.patient.lastName}
              </p>
              <p className="text-sm text-slate-500">
                {new Date(appointment.startAt).toLocaleString()}
              </p>
            </div>
            <p className="text-sm text-slate-600">
              {appointment.doctor.staffProfile.user.firstName}{' '}
              {appointment.doctor.staffProfile.user.lastName}
            </p>
            <p className="text-sm font-semibold text-clinical">{appointment.status}</p>
          </Link>
        ))}
      </section>
    </div>
  );
}
