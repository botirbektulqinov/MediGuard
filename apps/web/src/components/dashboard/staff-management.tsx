'use client';

import { useQuery } from '@tanstack/react-query';

import { fetchStaff } from '@/lib/clinic-api';

export function StaffManagement() {
  const staff = useQuery({ queryKey: ['staff'], queryFn: fetchStaff });

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink">Staff Management</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Role-linked staff profiles, doctor base schedules, and clinic assignments.
        </p>
      </div>

      <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-panel">
        {staff.isLoading ? <p className="p-5 text-sm text-slate-500">Loading staff...</p> : null}
        {staff.isError ? <p className="p-5 text-sm text-red-700">Unable to load staff.</p> : null}
        {!staff.isLoading && staff.data?.length === 0 ? (
          <p className="p-5 text-sm text-slate-500">No staff profiles configured.</p>
        ) : null}
        {staff.data?.map((member) => (
          <div
            key={member.id}
            className="grid gap-2 border-b border-slate-100 p-5 last:border-b-0 md:grid-cols-[1.2fr_1fr_1fr]"
          >
            <div>
              <p className="font-medium text-ink">
                {member.user.firstName} {member.user.lastName}
              </p>
              <p className="text-sm text-slate-600">{member.user.email}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-slate-700">{member.jobTitle}</p>
              <p className="text-sm text-slate-500">{member.department}</p>
            </div>
            <div>
              <p className="text-sm text-slate-600">{member.branch?.name ?? member.clinic.name}</p>
              <p className="text-xs text-slate-500">
                {member.doctorProfile ? member.doctorProfile.specialty : member.employeeCode}
              </p>
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}
