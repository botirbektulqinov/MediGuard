'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { ThemeToggle } from '@/components/theme-toggle';
import { getStoredSession, logout, type AuthSession } from '@/lib/auth';
import { canUseNavigationItem, dashboardNavigation } from '@/lib/navigation';

export function DashboardShell({ children }: Readonly<{ children: React.ReactNode }>) {
  const router = useRouter();
  const pathname = usePathname();
  const [session, setSession] = useState<AuthSession | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    setSession(getStoredSession());
  }, []);

  async function handleLogout(): Promise<void> {
    if (session) {
      await logout(session);
    }
    router.replace('/login');
  }

  return (
    <main className="min-h-screen bg-surface">
      <header className="sticky top-0 z-20 border-b border-line bg-panel/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <div className="min-w-0">
            <p className="flex items-center gap-2 text-sm font-semibold text-ink">
              <span className="h-2 w-2 rounded-full bg-clinical" />
              MediGuard Control Center
            </p>
            {session ? (
              <p className="mt-1 truncate text-xs text-muted">{session.user.email}</p>
            ) : null}
          </div>
          <div className="flex items-center gap-3">
            {session ? (
              <span className="hidden rounded-full border border-clinical/30 bg-clinicalSoft px-3 py-1 text-xs font-semibold text-clinical sm:inline-flex">
                {session.user.roles[0]?.replaceAll('_', ' ') ?? 'USER'}
              </span>
            ) : null}
            <ThemeToggle />
            <button
              className="rounded-md border border-line bg-panel px-3 py-2 text-sm font-semibold text-ink hover:bg-panelSoft lg:hidden"
              type="button"
              onClick={() => setIsMenuOpen((value) => !value)}
            >
              Menu
            </button>
            <button
              className="hidden rounded-md border border-line bg-panel px-3 py-2 text-sm font-semibold text-ink hover:bg-panelSoft lg:block"
              type="button"
              onClick={() => void handleLogout()}
            >
              Logout
            </button>
          </div>
        </div>
      </header>
      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[260px_1fr]">
        <aside className={`${isMenuOpen ? 'block' : 'hidden'} lg:block`}>
          <div className="overflow-hidden rounded-lg border border-line bg-panel shadow-panel">
            <div className="border-b border-line bg-panelSoft px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted">Workspace</p>
              <p className="mt-1 text-sm font-semibold text-ink">
                {session?.user.roles[0]?.replaceAll('_', ' ') ?? 'Loading'}
              </p>
            </div>
            <nav className="grid gap-1 p-3 text-sm text-muted">
              {session
                ? dashboardNavigation
                    .filter((item) => canUseNavigationItem(session.user, item))
                    .map((item) => {
                      const isActive =
                        pathname === item.href || pathname.startsWith(`${item.href}/`);
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          className={`rounded-md border px-3 py-2 font-medium ${
                            isActive
                              ? 'border-clinical/30 bg-clinicalSoft text-clinical shadow-sm'
                              : 'border-transparent text-muted hover:bg-panelSoft hover:text-ink'
                          }`}
                          onClick={() => setIsMenuOpen(false)}
                        >
                          {item.label}
                        </Link>
                      );
                    })
                : null}
            </nav>
            <button
              className="mx-3 mb-3 w-[calc(100%-1.5rem)] rounded-md border border-line px-3 py-2 text-sm font-semibold text-ink hover:bg-panelSoft lg:hidden"
              type="button"
              onClick={() => void handleLogout()}
            >
              Logout
            </button>
          </div>
        </aside>
        <section className="min-w-0">{children}</section>
      </div>
    </main>
  );
}
