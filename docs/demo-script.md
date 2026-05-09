# MediGuard Demo Script

Use password `DemoPass123!` for all seeded demo accounts.

## Presenter Flow

1. Sign in as `clinic.admin@demo.com`.
   - Open the Clinic Admin dashboard.
   - Show staff, patient, appointment, and queue metrics.
   - Explain that reports are permission protected.

2. Sign in as `patient@demo.com`.
   - Book an appointment from the Appointments page.
   - Open the Patient dashboard and portal.

3. Sign in as `reception@demo.com`.
   - Confirm the appointment.
   - Mark the patient as arrived.
   - Add the patient to the queue.

4. Sign in as `doctor@demo.com`.
   - Open the Doctor dashboard and queue.
   - Start the consultation.
   - Create a visit, add notes, and request a lab test.

5. Sign in as `lab@demo.com`.
   - Open the Lab dashboard.
   - Upload an allowed lab-result file.
   - Mark the result as ready.

6. Sign in again as `patient@demo.com`.
   - Confirm the ready lab result appears in the patient portal.
   - Open the lab-result detail page.

7. Sign in as `qa@demo.com`.
   - Open QA Center.
   - Show suites, runs, bug reports, pass rate, and release gates.
   - Explain how failed tests can create bugs and block release gates.

8. Sign in as `security@demo.com`.
   - Generate several failed login attempts with a bad password.
   - Open Security Center.
   - Evaluate suspicious activity.
   - Create an incident from the failed-login event.
   - Review audit logs and session revocation.

## What To Emphasize

- Backend authorization is authoritative; frontend role checks are only UX.
- Patient and medical data access is scoped by ownership, assignment, and clinic.
- Sensitive actions create audit records.
- QA and Security Centers are first-class product modules, not external notes.
- Dashboards and reports provide a presenter-friendly overview of operational health.
