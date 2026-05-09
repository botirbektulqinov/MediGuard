'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { fetchCurrentUser, getStoredSession, storeSession, type AuthUser } from '@/lib/auth';

export function AuthGate({ children }: Readonly<{ children: React.ReactNode }>) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const session = getStoredSession();
    if (!session) {
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
      return;
    }

    fetchCurrentUser(session.accessToken)
      .then((currentUser) => {
        storeSession({ ...session, user: currentUser });
        setUser(currentUser);
      })
      .catch(() => {
        router.replace(`/login?next=${encodeURIComponent(pathname)}`);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [pathname, router]);

  if (isLoading || !user) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-5 text-sm text-slate-600 shadow-panel">
        Loading secure workspace...
      </div>
    );
  }

  return <>{children}</>;
}
