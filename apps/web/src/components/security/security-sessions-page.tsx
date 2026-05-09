'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { fetchSecuritySessions, revokeSecuritySession } from '@/lib/clinic-api';

export function SecuritySessionsPage() {
  const queryClient = useQueryClient();
  const sessions = useQuery({ queryKey: ['security', 'sessions'], queryFn: fetchSecuritySessions });
  const revoke = useMutation({
    mutationFn: revokeSecuritySession,
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['security'] }),
  });

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink">Sessions</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Review active sessions and revoke suspicious refresh-token families.
        </p>
      </div>
      <section className="rounded-lg border border-slate-200 bg-white shadow-panel">
        {sessions.data?.map((session) => (
          <div
            key={session.id}
            className="grid gap-3 border-t border-slate-100 p-5 first:border-t-0 md:grid-cols-[1fr_160px]"
          >
            <div>
              <p className="font-medium text-ink">{session.user.email}</p>
              <p className="mt-1 text-sm text-slate-500">
                {session.status} - last seen {new Date(session.lastSeenAt).toLocaleString()}
              </p>
              <p className="mt-1 text-xs text-slate-500">{session.ipAddress ?? 'unknown IP'}</p>
            </div>
            <button
              className="h-fit rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold disabled:opacity-50"
              disabled={session.status !== 'ACTIVE' || revoke.isPending}
              onClick={() => revoke.mutate(session.id)}
              type="button"
            >
              Revoke
            </button>
          </div>
        ))}
      </section>
    </div>
  );
}
