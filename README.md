# MediGuard

MediGuard is a secure clinic operations platform for private clinics. It centralizes appointment scheduling, queue management, patient portal access, QA Center workflows, Security Center monitoring, audit logs, and role-based administration.

This repository is a production-style fullstack portfolio project designed to demonstrate:

- Middle fullstack engineering with NestJS, Next.js, PostgreSQL, Prisma, and TypeScript
- Senior QA engineering through unit, integration, E2E, and workflow-focused testing
- Defensive cybersecurity practices such as RBAC, ownership checks, audit logging, failed-login monitoring, and secure input handling

## Business Problem

Small and mid-sized private clinics often run appointments, patient intake, queues, lab results, complaints, QA evidence, and staff access across disconnected tools or manual spreadsheets. That creates duplicated work, weak auditability, unclear ownership of patient data, and poor visibility into operational and security risk.

## Solution Overview

MediGuard centralizes the core clinic workflow in one secure platform:

- Clinic admins configure clinics, branches, rooms, services, staff, and doctor schedules.
- Reception teams manage patient intake, appointments, arrival, and queues.
- Doctors handle assigned consultations, visit notes, prescriptions, and lab orders.
- Lab technicians upload validated lab results.
- Patients access only their own appointments, visits, lab results, and allowed attachments.
- QA managers manage test cases, test runs, bug reports, and release gates.
- Security officers review audit logs, suspicious activity, incidents, findings, and sessions.

## Tech Stack

| Area       | Stack                                                                 |
| ---------- | --------------------------------------------------------------------- |
| Backend    | NestJS, TypeScript, Prisma, PostgreSQL, JWT, Swagger/OpenAPI          |
| Frontend   | Next.js App Router, TypeScript, Tailwind CSS, TanStack Query          |
| Validation | class-validator DTOs, strict environment validation, Zod where useful |
| Testing    | Jest, Supertest, Playwright                                           |
| DevOps     | Docker Compose, production-target Dockerfiles, GitHub Actions         |
| Security   | RBAC, permission guards, ownership checks, audit logs, rate limiting  |

## Repository Structure

```txt
apps/
  api/                 NestJS API
  web/                 Next.js web app
packages/
  shared/              Shared types, constants, and validation helpers
docs/                  Architecture, QA, security, RBAC, and setup documentation
.github/workflows/    CI pipeline
```

## Features By Role

| Role             | Main Capabilities                                                                  |
| ---------------- | ---------------------------------------------------------------------------------- |
| Super Admin      | Platform-wide roles, permissions, users, reports, and system visibility            |
| Clinic Admin     | Clinic configuration, staff, doctor schedules, patient operations, reports         |
| Receptionist     | Patient intake, appointment booking, arrival, queue intake, rescheduling           |
| Doctor           | Assigned queue, consultation workflow, visit notes, prescriptions, lab requests    |
| Lab Technician   | Lab order review, validated upload, result publishing                              |
| QA Manager       | Test suites, test runs, bugs, release quality gates, QA dashboards                 |
| Security Officer | Failed-login monitor, audit search, suspicious activity, incidents, session revoke |
| Patient          | Own portal profile, appointments, visit history, ready lab results, downloads      |

## Security Features

- JWT access tokens with refresh token rotation and hashed persisted refresh tokens
- Account disabled status, failed-login tracking, lockout, and auth rate limiting
- RBAC, permission guards, clinic scoping, assigned-doctor checks, and patient ownership checks
- Audit logs for sensitive authentication, patient, appointment, medical, QA, and security actions
- File upload validation by size, MIME type, extension, randomized storage name, and ownership
- Security Center for failed logins, sensitive patient access, suspicious activity, incidents, findings, and session revocation

## QA Features

- Unit tests for deterministic business rules, guards, policies, and quality gate calculation
- API integration tests for auth, patient access, appointments, QA, security, and reports
- Playwright smoke tests for role dashboard workflows
- In-app QA Center for test suites, test cases, test runs, bug lifecycle, and release gates
- Professional QA strategy covering test pyramid, regression strategy, release gates, and severity definitions

## Prerequisites

- Node.js 22+
- Corepack
- Docker Desktop

This project uses `pnpm` through Corepack. If `pnpm` is not available, run:

```bash
corepack enable
```

On locked-down Windows shells where Corepack cannot create the global `pnpm` shim, use
`corepack pnpm` instead of `pnpm`, for example:

```bash
corepack pnpm install
corepack pnpm lint
corepack pnpm typecheck
```

## Environment Setup

Create a local environment file from the example:

```bash
cp .env.example .env
```

The values in `.env.example` are development-only placeholders. Do not commit real secrets.

Key environment variables are documented in [development setup](docs/development-setup.md).

## Install

```bash
corepack enable
pnpm install
pnpm --filter @mediguard/api prisma generate
```

## Run Locally Without Docker

Start PostgreSQL with Docker:

```bash
docker compose up postgres
```

In separate terminals, start the API and web app:

```bash
pnpm dev:api
pnpm dev:web
```

Local URLs:

- Web: `http://localhost:3000`
- API health: `http://localhost:4000/api/health`
- Swagger: `http://localhost:4000/api/docs` when `SWAGGER_ENABLED=true`

## Run With Docker Compose

```bash
docker compose up --build
```

This starts:

- PostgreSQL on port `5432`
- API on port `4000`
- Web app on port `3000`

The API container pushes the Prisma schema and runs the seed script on startup.

## Production-Like Docker Run

Use the production compose file to build compiled API and web images, run containers as the
non-root `node` user, enforce required secrets, and apply Prisma migrations instead of `db push`:

```bash
cp .env.production.example .env.production
# Replace every placeholder in .env.production before starting the stack.
docker compose --env-file .env.production -f docker-compose.prod.yml up --build
```

Production notes:

- `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `DATABASE_URL`, `CORS_ORIGIN`, and
  `NEXT_PUBLIC_API_URL` are required.
- `NEXT_PUBLIC_API_URL` is passed at web image build time because it is used by browser code.
- The production compose file does not run the demo seed automatically.
- Swagger should stay disabled in production-like runs with `SWAGGER_ENABLED=false`.
- Real deployments should terminate HTTPS at a reverse proxy or platform load balancer.

## Verification Commands

Run these before completing work:

```bash
pnpm format
pnpm lint
pnpm typecheck
pnpm test
pnpm test:integration
pnpm test:e2e
pnpm build
```

API-specific checks:

```bash
pnpm --filter @mediguard/api prisma generate
pnpm --filter @mediguard/api test:integration
pnpm --filter @mediguard/api test
```

Web-specific checks:

```bash
pnpm --filter @mediguard/web lint
pnpm --filter @mediguard/web typecheck
pnpm --filter @mediguard/web test
pnpm --filter @mediguard/web test:e2e
pnpm --filter @mediguard/web build
```

## CI/CD

GitHub Actions runs separate backend and frontend jobs:

- Backend: install, Prisma validation/generation, migration deploy, seed, format check, lint, typecheck, unit tests, integration tests, and build.
- Frontend: install, lint, typecheck, unit tests, build, Playwright browser install, Playwright smoke tests, and Playwright report upload.

The workflow uses the checked-in lockfile and a PostgreSQL service container so a clean clone has the same verification path as CI.

## Sprint 0 Scope

Sprint 0 establishes the project foundation:

- Monorepo workspace
- NestJS API with strict TypeScript
- Global request validation
- Environment validation
- Health endpoint with database connectivity check
- Swagger setup
- Next.js frontend with Tailwind CSS
- Landing page, authenticated login flow, and role-based dashboard shell
- Prisma setup
- Docker Compose for API, web, and PostgreSQL
- GitHub Actions CI
- Initial architecture, QA, security, RBAC, and setup docs

## Security Notes

- No production secrets are committed.
- `.env` files are ignored by Git.
- API configuration is validated at startup.
- Swagger is controlled by `SWAGGER_ENABLED` and defaults off when `NODE_ENV=production`.
- Sprint 1 implements JWT authentication, refresh token rotation, RBAC guards, failed-login tracking, account lockout, and audit logging.
- Sprint 2 adds clinic, branch, room, service, staff, doctor, and patient profile foundations with audited patient access controls.
- Sprint 6 adds Security Center monitoring, suspicious activity detection, incident response, findings, and session revocation.

## Documentation

- [Architecture](docs/architecture.md)
- [API overview](docs/api-overview.md)
- [Development setup](docs/development-setup.md)
- [QA strategy](docs/qa-strategy.md)
- [Security threat model](docs/security-threat-model.md)
- [Security checklist](docs/security-checklist.md)
- [RBAC matrix](docs/rbac-matrix.md)
- [Demo script](docs/demo-script.md)

## Screenshots

Screenshots should be added under `docs/screenshots/` as the UI stabilizes:

- Role dashboard overview
- Appointment and queue workflow
- Patient portal lab result detail
- QA Center release gate
- Security Center incident workflow

## Current Status

Sprint 8 CI/CD hardening, Docker production targets, final documentation polish, API overview, and portfolio readiness updates are implemented. Advanced alert delivery, immutable audit retention, malware scanning integrations, and production cookie-based refresh-token storage remain planned hardening work.

## Demo Workflow

1. Start with `clinic.admin@demo.com` to show clinic configuration, reports, staff, patients, and role-based navigation.
2. Use `patient@demo.com` to book or view appointments and inspect the patient portal.
3. Use `reception@demo.com` to confirm arrival and manage queue intake.
4. Use `doctor@demo.com` to open the assigned queue, start consultation, create a visit, and request labs.
5. Use `lab@demo.com` to upload and publish a lab result.
6. Use `qa@demo.com` to run QA Center workflows and show release gates.
7. Use `security@demo.com` to review failed logins, suspicious activity, audit logs, incidents, findings, and sessions.

See [demo script](docs/demo-script.md) for a presenter-ready walkthrough.

## Future Improvements

- Move refresh tokens from browser storage to HttpOnly Secure SameSite cookies.
- Add immutable audit log retention and export controls.
- Add malware scanning for uploaded lab-result files.
- Add alert delivery for high-severity security events.
- Add visual regression testing and real portfolio screenshots.
- Add deployment manifests for a cloud target such as Fly.io, Render, AWS ECS, or Kubernetes.

## Sprint 1 Auth

Implemented:

- User, role, permission, user-role, refresh-token, login-attempt, and audit-log models
- Registration with default patient role
- Login, logout, current-user endpoint, and refresh token rotation
- Password hashing with bcrypt
- Hashed refresh token persistence
- Atomic refresh token rotation with token-family revocation on reuse
- Failed login tracking and account lockout
- Disabled account rejection
- JWT auth guard, role guard, permission guard, and ownership helper
- Auth-specific throttling on register, login, refresh, and logout
- Audit logs for login success, login failure, logout, invalid logout token attempts, role assignment, permission assignment, and user status changes
- Role-based frontend login and dashboard redirects

Demo password for all seeded users:

```txt
DemoPass123!
```

Demo accounts:

| Email                   | Role               |
| ----------------------- | ------------------ |
| `admin@demo.com`        | `SUPER_ADMIN`      |
| `clinic.admin@demo.com` | `CLINIC_ADMIN`     |
| `reception@demo.com`    | `RECEPTIONIST`     |
| `doctor@demo.com`       | `DOCTOR`           |
| `lab@demo.com`          | `LAB_TECHNICIAN`   |
| `qa@demo.com`           | `QA_MANAGER`       |
| `security@demo.com`     | `SECURITY_OFFICER` |
| `patient@demo.com`      | `PATIENT`          |

## Sprint 2 Clinic, Staff, And Patient Core

Implemented:

- Clinic, branch, room, clinic service, staff profile, doctor profile, patient profile, patient contact, and emergency contact models
- Clinic configuration APIs protected by `clinic.manage`, `branch.manage`, `room.manage`, and `service.manage`
- Staff profile APIs protected by `staff.read` and `staff.manage`
- Patient creation and search APIs for authorized clinic roles
- Patient ownership checks for self-service patient access
- Doctor access limited to assigned patient profiles
- Clinic-tenant scoping for clinic configuration, staff, and patient endpoints
- Receptionist contact updates limited to non-medical fields
- Security officer audit log access without patient-edit capability
- Audit logs for patient profile views, patient contact updates, staff changes, and clinic configuration changes
- Frontend clinic admin overview, staff management page, patient search page, patient profile page, and role-aware navigation

Sprint 2 API groups are available in Swagger:

```txt
/api/clinics
/api/branches
/api/rooms
/api/clinic-services
/api/staff
/api/patients
```

## Sprint 3 Appointment And Queue System

Implemented:

- Doctor availability schedules
- Patient and receptionist appointment booking
- Doctor schedule validation and doctor time-slot collision prevention
- Appointment status history
- Audited appointment status changes
- Reception confirm, arrival, queue intake, reschedule, and cancellation flows
- Doctor assigned queue, consultation start, lab-required outcome, and completion flows
- In-app notification records for appointment and queue updates
- Frontend appointment booking, appointment detail timeline, reception queue dashboard, and doctor queue dashboard

Sprint 3 API groups are available in Swagger:

```txt
/api/doctor-schedules
/api/appointments
/api/queue
/api/notifications
```

## Sprint 4 Visit Records, Lab Results, And Patient Portal

Implemented:

- Visit records linked to assigned appointments
- Doctor diagnosis notes, recommendations, prescription notes, lab orders, and visit completion
- Lab technician order dashboard, validated file upload, and result publishing
- Patient portal visit history and ready lab result access
- Attachment download with ownership, assigned-doctor, or clinic-scoped lab authorization
- File upload validation for MIME type, extension, and max size
- Randomized storage names with internal file paths excluded from API responses
- Audit logs for medical record views, updates, lab result workflow events, portal reads, and downloads
- Frontend doctor consultation page, lab dashboard, patient portal dashboard, and lab result detail page

Demo flow:

```txt
doctor@demo.com starts an assigned queue consultation
doctor@demo.com creates a visit and lab order
lab@demo.com uploads a PDF/PNG/JPEG/TXT result and marks it ready
patient@demo.com opens Patient Portal and views/downloads the ready result
```

Sprint 4 API groups are available in Swagger:

```txt
/api/visits
/api/visits/{visitId}/prescriptions
/api/lab-results
/api/patient-portal
/api/files
```

## Sprint 5 QA Center

Implemented:

- Test suites and test cases with feature areas, priorities, and required-case flags
- Test run creation with generated pending results for active cases
- Test execution statuses: `PASSED`, `FAILED`, `BLOCKED`, and `SKIPPED`
- Bug reports linked to failed test results
- Bug lifecycle: `OPEN`, `TRIAGED`, `IN_PROGRESS`, `READY_FOR_QA`, `RETEST`, `CLOSED`, and `REOPENED`
- Assigned-user bug status updates for developer-style workflows
- Release quality gates that block on open critical bugs, non-passed required tests, and low pass rate
- QA audit logs for suites, cases, runs, result updates, bugs, and release gates
- Frontend QA dashboard, test suites, test case detail, test run execution, bug reports, and release gate pages

Sprint 5 API groups are available in Swagger:

```txt
/api/qa/test-suites
/api/qa/test-cases
/api/qa/test-runs
/api/qa/bug-reports
/api/qa/release-gates
```

## Sprint 6 Security Center

Implemented:

- Session tracking for refresh-token families with revoked and expired states plus Security Officer revocation
- Failed login monitor backed by persisted login attempts
- Searchable audit log viewer and sensitive patient access monitor
- Suspicious activity rules for failed login bursts, excessive patient profile views, disabled-user login attempts, role/permission changes, repeated lab-result downloads, and patient record access without appointment-context evidence
- Persistent suspicious activity events with evidence payloads
- Security incident workflow: `DETECTED`, `INVESTIGATING`, `CONTAINED`, `RESOLVED`, and `FALSE_POSITIVE`
- Security findings with title, description, severity, affected module, evidence, remediation, and status
- Audit logs for suspicious activity evaluation, incident changes, finding changes, and session revocation
- Frontend Security dashboard, audit log viewer, failed login monitor, suspicious activity page, incident detail page, findings page, and sessions page

Sprint 6 API groups are available in Swagger:

```txt
/api/security/dashboard
/api/security/failed-logins
/api/security/audit-logs
/api/security/patient-access
/api/security/suspicious-activity
/api/security/incidents
/api/security/findings
/api/security/sessions
```

## Sprint 7 Reports, Dashboards, And UX Polish

Implemented:

- Reporting endpoints for appointment volume, queue waiting time, doctor workload, test pass rate, open bugs by severity, security incidents by severity, and failed-login trends
- Role dashboard summary endpoints for Clinic Admin, Reception, Doctor, QA, Security, and Patient
- Polished responsive dashboard shell with sidebar, top bar, role badge, active navigation, and mobile menu
- Role dashboards with operational metrics, chart-style visualizations, loading states, empty states, and error states
- Demo scenario page at `/dashboard/demo`
- Demo script documentation in `docs/demo-script.md`

Sprint 7 API groups are available in Swagger:

```txt
/api/reports/appointments-per-day
/api/reports/queue-waiting-time
/api/reports/doctor-workload
/api/reports/test-pass-rate
/api/reports/open-bugs-by-severity
/api/reports/security-incidents-by-severity
/api/reports/failed-login-trends
/api/dashboards/clinic-admin
/api/dashboards/reception
/api/dashboards/doctor
/api/dashboards/qa
/api/dashboards/security
/api/dashboards/patient
```
