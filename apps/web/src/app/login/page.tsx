import { Suspense } from 'react';

import { LoginForm } from '@/components/login-form';

const demoRoles = [
  'Super Admin',
  'Clinic Admin',
  'Reception',
  'Doctor',
  'Lab',
  'QA',
  'Security',
  'Patient',
];

export default function LoginPage() {
  return (
    <main className="mx-auto grid max-w-5xl gap-6 px-6 py-12 lg:grid-cols-[0.9fr_1.1fr]">
      <section className="rounded-lg border border-line bg-panel p-6 shadow-panel">
        <p className="text-sm font-semibold uppercase tracking-wide text-clinical">
          Secure workspace
        </p>
        <h1 className="mt-3 text-2xl font-semibold text-ink">Login to MediGuard</h1>
        <p className="mt-2 text-sm leading-6 text-muted">
          Sign in with one of the seeded demo accounts to open the matching role workspace.
        </p>
        <Suspense
          fallback={<div className="mt-6 text-sm text-muted">Preparing secure login...</div>}
        >
          <LoginForm />
        </Suspense>
      </section>

      <aside className="rounded-lg border border-line bg-panel shadow-panel">
        <div className="border-b border-line bg-panelSoft px-6 py-5">
          <h2 className="text-base font-semibold text-ink">Demo coverage</h2>
          <p className="mt-1 text-sm text-muted">
            Each role lands on a dedicated dashboard with scoped navigation.
          </p>
        </div>
        <div className="grid gap-3 p-6 sm:grid-cols-2">
          {demoRoles.map((role) => (
            <div key={role} className="rounded-md border border-line bg-panel px-4 py-3">
              <p className="text-sm font-semibold text-ink">{role}</p>
              <p className="mt-1 text-xs text-muted">RBAC guarded access</p>
            </div>
          ))}
        </div>
      </aside>
    </main>
  );
}
