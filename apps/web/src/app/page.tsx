import Link from 'next/link';

const capabilities = [
  ['Appointments', 'Booked, confirmed, arrived, consultation, lab, and completion tracking'],
  ['Patient Portal', 'Owned access to visit history, lab results, and allowed attachments'],
  ['QA Center', 'Test suites, runs, bugs, release gates, and pass-rate reporting'],
  ['Security Center', 'Audit logs, failed login monitoring, incidents, and findings'],
];

const signalRows = [
  ['Queue', '12 active', 'Stable'],
  ['QA gate', '92% pass', 'Review'],
  ['Security', '3 alerts', 'Triage'],
];

export default function HomePage() {
  return (
    <main>
      <section className="border-b border-line bg-panel">
        <div className="mx-auto grid max-w-7xl gap-10 px-6 py-14 lg:grid-cols-[1fr_0.95fr] lg:items-center">
          <div>
            <p className="text-sm font-semibold uppercase tracking-widest text-clinical">
              Secure clinic operations
            </p>
            <h1 className="mt-4 max-w-3xl text-4xl font-semibold tracking-normal text-ink sm:text-5xl">
              MediGuard
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-muted">
              A fullstack clinic operations platform for queues, appointments, patient access,
              quality management, and defensive security auditing.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/login"
                className="rounded-md bg-clinical px-5 py-3 text-sm font-semibold text-white shadow-lift hover:opacity-90"
              >
                Open login
              </Link>
              <Link
                href="/dashboard"
                className="rounded-md border border-line bg-panel px-5 py-3 text-sm font-semibold text-ink hover:bg-panelSoft"
              >
                View dashboard
              </Link>
            </div>
          </div>
          <div className="overflow-hidden rounded-lg border border-line bg-panel shadow-panel">
            <div className="border-b border-line bg-panelSoft px-5 py-4">
              <p className="text-sm font-semibold text-ink">Operations snapshot</p>
              <p className="mt-1 text-xs text-muted">Role-aware dashboards and audited workflows</p>
            </div>
            <div className="grid gap-3 p-5">
              {signalRows.map(([label, value, status]) => (
                <div
                  key={label}
                  className="grid grid-cols-[1fr_auto_auto] items-center gap-3 rounded-md border border-line bg-panel px-4 py-3"
                >
                  <span className="text-sm font-medium text-ink">{label}</span>
                  <span className="text-sm text-muted">{value}</span>
                  <span className="rounded-full bg-clinicalSoft px-2.5 py-1 text-xs font-semibold text-clinical">
                    {status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-4 px-6 py-10 md:grid-cols-2 xl:grid-cols-4">
        {capabilities.map(([title, detail]) => (
          <article key={title} className="rounded-lg border border-line bg-panel p-5 shadow-panel">
            <div className="mb-4 h-1 w-12 rounded-full bg-clinical" />
            <h2 className="text-base font-semibold text-ink">{title}</h2>
            <p className="mt-2 text-sm leading-6 text-muted">{detail}</p>
          </article>
        ))}
      </section>
    </main>
  );
}
