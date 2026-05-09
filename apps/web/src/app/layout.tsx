import type { Metadata } from 'next';
import Link from 'next/link';

import { QueryProvider } from '@/components/query-provider';
import { ThemeToggle } from '@/components/theme-toggle';

import './globals.css';

export const metadata: Metadata = {
  title: 'MediGuard',
  description: 'Secure clinic operations platform.',
};

const themeScript = `
(() => {
  try {
    const stored = window.localStorage.getItem('mediguard-theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const mode = stored === 'dark' || stored === 'light' ? stored : prefersDark ? 'dark' : 'light';
    document.documentElement.classList.toggle('dark', mode === 'dark');
    document.documentElement.dataset.theme = mode;
  } catch {
    document.documentElement.dataset.theme = 'light';
  }
})();
`;

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-surface text-ink antialiased">
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <header className="sticky top-0 z-30 border-b border-line bg-panel/95 backdrop-blur">
          <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
            <Link
              href="/"
              className="flex items-center gap-3 text-lg font-semibold tracking-normal text-ink"
            >
              <span className="grid h-9 w-9 place-items-center rounded-md bg-clinical text-sm font-bold text-white shadow-lift">
                MG
              </span>
              <span>MediGuard</span>
            </Link>
            <div className="flex items-center gap-2 text-sm font-medium sm:gap-3">
              <ThemeToggle />
              <Link
                href="/login"
                className="rounded-md px-3 py-2 text-muted hover:bg-panelSoft hover:text-ink"
              >
                Login
              </Link>
              <Link
                href="/dashboard"
                className="rounded-md bg-clinical px-3 py-2 text-white shadow-sm hover:opacity-90"
              >
                Dashboard
              </Link>
            </div>
          </nav>
        </header>
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  );
}
