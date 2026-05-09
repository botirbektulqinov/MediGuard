import Link from 'next/link';

export function DashboardHeader({
  title,
  description,
  action,
}: Readonly<{
  title: string;
  description: string;
  action?: React.ReactNode;
}>) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-clinical">MediGuard</p>
        <h1 className="mt-1 text-2xl font-semibold text-ink">{title}</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">{description}</p>
      </div>
      {action}
    </div>
  );
}

export function MetricGrid({ metrics }: Readonly<{ metrics: Record<string, number> }>) {
  return (
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {Object.entries(metrics).map(([label, value]) => (
        <article
          key={label}
          className="overflow-hidden rounded-lg border border-line bg-panel shadow-panel"
        >
          <div className="h-1 bg-clinical" />
          <div className="p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">
              {humanize(label)}
            </p>
            <p className="mt-2 text-2xl font-semibold text-ink">{value}</p>
          </div>
        </article>
      ))}
    </section>
  );
}

export function LoadingState({ label = 'Loading dashboard...' }: Readonly<{ label?: string }>) {
  return (
    <div className="rounded-lg border border-line bg-panel p-5 text-sm text-muted shadow-panel">
      <div className="h-2 w-32 animate-pulse rounded-full bg-panelSoft" />
      <p className="mt-4">{label}</p>
    </div>
  );
}

export function ErrorState({
  label = 'Unable to load dashboard data.',
}: Readonly<{ label?: string }>) {
  return (
    <div className="rounded-lg border border-red-200 bg-red-50 p-5 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200">
      {label}
    </div>
  );
}

export function EmptyState({ label }: Readonly<{ label: string }>) {
  return <p className="p-5 text-sm text-muted">{label}</p>;
}

export function BarChart({
  data,
  labelKey,
  valueKey,
  title,
}: Readonly<{
  title: string;
  data: object[];
  labelKey: string;
  valueKey: string;
}>) {
  const max = Math.max(
    1,
    ...data.map((item) => Number((item as Record<string, unknown>)[valueKey] ?? 0)),
  );
  return (
    <section className="rounded-lg border border-line bg-panel p-5 shadow-panel">
      <h2 className="text-lg font-semibold text-ink">{title}</h2>
      <div className="mt-4 grid gap-3">
        {data.map((item) => {
          const datum = item as Record<string, unknown>;
          const value = Number(datum[valueKey] ?? 0);
          return (
            <div key={String(datum[labelKey])} className="grid gap-2">
              <div className="flex items-center justify-between gap-3 text-xs text-muted">
                <span>{String(datum[labelKey])}</span>
                <span className="font-semibold text-ink">{value}</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-panelSoft">
                <div
                  className="h-full rounded-full bg-clinical"
                  style={{ width: `${Math.max(4, Math.round((value / max) * 100))}%` }}
                />
              </div>
            </div>
          );
        })}
        {data.length === 0 ? <p className="text-sm text-muted">No chart data.</p> : null}
      </div>
    </section>
  );
}

export function DonutStat({
  title,
  value,
  detail,
}: Readonly<{ title: string; value: number; detail: string }>) {
  return (
    <section className="rounded-lg border border-line bg-panel p-5 shadow-panel">
      <h2 className="text-lg font-semibold text-ink">{title}</h2>
      <div className="mt-5 flex items-center gap-5">
        <div
          className="grid h-24 w-24 place-items-center rounded-full"
          style={{
            background: `conic-gradient(var(--color-clinical-hex) ${value}%, var(--color-track-hex) ${value}% 100%)`,
          }}
        >
          <div className="grid h-16 w-16 place-items-center rounded-full bg-panel text-lg font-semibold text-ink">
            {value}%
          </div>
        </div>
        <p className="text-sm leading-6 text-muted">{detail}</p>
      </div>
    </section>
  );
}

export function QuickLink({ href, label }: Readonly<{ href: string; label: string }>) {
  return (
    <Link
      className="group rounded-lg border border-line bg-panel p-4 text-sm font-semibold text-clinical shadow-panel hover:border-clinical hover:shadow-lift"
      href={href}
    >
      <span className="flex items-center justify-between gap-3">
        {label}
        <span className="text-muted group-hover:text-clinical">-&gt;</span>
      </span>
    </Link>
  );
}

export function humanize(value: string): string {
  return value
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (letter) => letter.toUpperCase())
    .trim();
}
