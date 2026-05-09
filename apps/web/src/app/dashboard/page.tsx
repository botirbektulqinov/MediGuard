'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

import { dashboardPathForRoles, getStoredSession } from '@/lib/auth';

export default function DashboardPage() {
  const router = useRouter();

  useEffect(() => {
    const session = getStoredSession();
    if (session) {
      router.replace(dashboardPathForRoles(session.user.roles));
    }
  }, [router]);

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5 text-sm text-slate-600 shadow-panel">
      Preparing your role dashboard...
    </div>
  );
}
