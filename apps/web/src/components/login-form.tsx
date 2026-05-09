'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { dashboardPathForRoles, login, storeSession } from '@/lib/auth';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: 'admin@demo.com',
      password: 'DemoPass123!',
    },
  });

  async function onSubmit(values: LoginFormValues): Promise<void> {
    setError(null);
    try {
      const session = await login(values.email, values.password);
      storeSession(session);
      const next = searchParams.get('next');
      router.replace(
        next?.startsWith('/dashboard') ? next : dashboardPathForRoles(session.user.roles),
      );
    } catch {
      setError('Invalid email, password, or account status.');
    }
  }

  return (
    <form className="mt-6 grid gap-4" onSubmit={(event) => void handleSubmit(onSubmit)(event)}>
      <label className="grid gap-2 text-sm font-medium text-ink">
        Email
        <input
          className="rounded-md border border-line px-3 py-2 outline-none focus:border-clinical focus:ring-2 focus:ring-clinical/20"
          autoComplete="email"
          type="email"
          {...register('email')}
        />
        {errors.email ? <span className="text-xs text-red-700">{errors.email.message}</span> : null}
      </label>
      <label className="grid gap-2 text-sm font-medium text-ink">
        Password
        <input
          className="rounded-md border border-line px-3 py-2 outline-none focus:border-clinical focus:ring-2 focus:ring-clinical/20"
          autoComplete="current-password"
          type="password"
          {...register('password')}
        />
        {errors.password ? (
          <span className="text-xs text-red-700">{errors.password.message}</span>
        ) : null}
      </label>
      {error ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200">
          {error}
        </p>
      ) : null}
      <button
        className="rounded-md bg-clinical px-4 py-2 text-sm font-semibold text-white shadow-sm hover:opacity-90 disabled:bg-slate-300 disabled:opacity-70"
        type="submit"
        disabled={isSubmitting}
      >
        {isSubmitting ? 'Signing in...' : 'Login'}
      </button>
    </form>
  );
}
