'use client';

import { useQuery } from '@tanstack/react-query';

import { fetchFailedLogins } from '@/lib/clinic-api';

export function FailedLoginMonitor() {
  const failedLogins = useQuery({
    queryKey: ['security', 'failed-logins'],
    queryFn: fetchFailedLogins,
  });

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink">Failed Login Monitor</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Review failed authentication attempts, lockout reasons, and disabled-account attempts.
        </p>
      </div>
      <section className="rounded-lg border border-slate-200 bg-white shadow-panel">
        {failedLogins.data?.map((attempt) => (
          <div
            key={attempt.id}
            className="grid gap-2 border-t border-slate-100 p-5 first:border-t-0 md:grid-cols-5"
          >
            <div>
              <p className="font-medium text-ink">{attempt.email}</p>
              <p className="text-xs text-slate-500">
                {new Date(attempt.createdAt).toLocaleString()}
              </p>
            </div>
            <p className="text-sm text-slate-600">{attempt.failureReason ?? 'UNKNOWN'}</p>
            <p className="text-sm text-slate-600">{attempt.ipAddress ?? 'unknown IP'}</p>
            <p className="text-sm text-slate-600">{attempt.user?.status ?? 'unlinked'}</p>
            <p className="truncate text-sm text-slate-500">
              {attempt.userAgent ?? 'unknown agent'}
            </p>
          </div>
        ))}
        {failedLogins.data?.length === 0 ? (
          <p className="p-5 text-sm text-slate-500">No failed logins found.</p>
        ) : null}
      </section>
    </div>
  );
}
