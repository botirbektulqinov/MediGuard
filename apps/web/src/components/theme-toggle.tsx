'use client';

import { useEffect, useState } from 'react';

type ThemeMode = 'light' | 'dark';

const storageKey = 'mediguard-theme';

function preferredTheme(): ThemeMode {
  if (typeof window === 'undefined') {
    return 'light';
  }

  const stored = window.localStorage.getItem(storageKey);
  if (stored === 'dark' || stored === 'light') {
    return stored;
  }

  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyTheme(mode: ThemeMode): void {
  document.documentElement.classList.toggle('dark', mode === 'dark');
  document.documentElement.dataset.theme = mode;
}

export function ThemeToggle() {
  const [mode, setMode] = useState<ThemeMode>('light');

  useEffect(() => {
    const nextMode = preferredTheme();
    setMode(nextMode);
    applyTheme(nextMode);
  }, []);

  function toggleTheme(): void {
    const nextMode = mode === 'dark' ? 'light' : 'dark';
    setMode(nextMode);
    window.localStorage.setItem(storageKey, nextMode);
    applyTheme(nextMode);
  }

  const isDark = mode === 'dark';

  return (
    <button
      aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
      aria-pressed={isDark}
      className="inline-flex h-10 items-center gap-2 rounded-md border border-line bg-panel px-3 text-sm font-semibold text-ink shadow-sm hover:bg-panelSoft"
      type="button"
      onClick={toggleTheme}
    >
      <span className="relative h-4 w-8 rounded-full bg-line">
        <span
          className={`absolute top-0.5 h-3 w-3 rounded-full bg-clinical shadow-sm ${
            isDark ? 'left-4' : 'left-0.5'
          }`}
        />
      </span>
      <span>{isDark ? 'Dark' : 'Light'}</span>
    </button>
  );
}
