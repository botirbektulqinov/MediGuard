const demoAccounts = [
  ['Clinic Admin', 'clinic.admin@demo.com', 'Configure clinic, staff, reports'],
  ['Receptionist', 'reception@demo.com', 'Book appointment, mark arrived, queue patient'],
  ['Doctor', 'doctor@demo.com', 'Open queue, start consultation, request lab'],
  ['Lab Technician', 'lab@demo.com', 'Upload and publish lab result'],
  ['QA Manager', 'qa@demo.com', 'Run failed test, create bug, evaluate gate'],
  ['Security Officer', 'security@demo.com', 'Review failed logins, create incident'],
  ['Patient', 'patient@demo.com', 'Book appointment, view visits and lab results'],
] as const;

const workflow = [
  'Sign in as Patient and book an appointment.',
  'Switch to Receptionist, confirm the appointment, mark arrived, and add to queue.',
  'Switch to Doctor, start consultation, create visit notes, and request a lab test.',
  'Switch to Lab Technician, upload a safe lab-result file, and mark it ready.',
  'Switch back to Patient and confirm the lab result is visible in the portal.',
  'Switch to QA Manager and review the QA Center release gate workflow.',
  'Switch to Security Officer, evaluate suspicious activity, and review audit evidence.',
] as const;

export default function DemoScenarioPage() {
  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink">Demo Scenario</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
          Use these accounts and workflow steps to present MediGuard as a realistic clinic
          operations, QA, and defensive security platform.
        </p>
      </div>

      <section className="rounded-lg border border-slate-200 bg-white shadow-panel">
        <h2 className="p-5 text-lg font-semibold text-ink">Demo accounts</h2>
        <div className="grid gap-0">
          {demoAccounts.map(([role, email, scope]) => (
            <div
              key={email}
              className="grid gap-2 border-t border-slate-100 p-5 md:grid-cols-[180px_240px_1fr]"
            >
              <p className="font-medium text-ink">{role}</p>
              <p className="text-sm text-slate-600">{email}</p>
              <p className="text-sm text-slate-500">{scope}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-panel">
        <h2 className="text-lg font-semibold text-ink">Recommended workflow</h2>
        <ol className="mt-4 grid gap-3 text-sm leading-6 text-slate-600">
          {workflow.map((step, index) => (
            <li key={step} className="flex gap-3">
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-teal-50 text-xs font-semibold text-clinical">
                {index + 1}
              </span>
              <span>{step}</span>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
