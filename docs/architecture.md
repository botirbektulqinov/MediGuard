# Architecture

MediGuard is a TypeScript monorepo with a NestJS API, a Next.js frontend, a shared package, PostgreSQL, Prisma, and Docker Compose for local development.

## System Context

The platform supports private clinic operations:

- Clinic administration
- Staff and role management
- Patient management
- Appointment and queue management
- Doctor visit records
- Lab result access
- QA Center workflows
- Security Center monitoring
- Audit logging

## Monorepo Layout

```txt
apps/api
apps/web
packages/shared
docs
.github/workflows
```

## Backend

The backend uses NestJS modular architecture. Controllers stay thin and delegate business logic to services. Guards enforce authentication, roles, and permissions. Patient ownership and assigned-doctor checks are enforced in the patient service through a unit-tested access policy because patient self-access and staff access require different rules. Sprint 2 clinic operations use a shared clinic-access service to scope non-platform staff to their assigned clinic.

Current backend modules:

- `ConfigModule` for environment loading and validation
- `PrismaModule` for database access
- `HealthModule` for API and database health checks
- `AuthModule` for registration, login, logout, refresh rotation, and current-user access
- `UsersModule` for user status and user listing
- `RolesModule` and `PermissionsModule` for RBAC administration
- `AuditLogModule` for sensitive-action audit records
- `ClinicsModule`, `BranchesModule`, `RoomsModule`, and `ClinicServicesModule` for clinic configuration
- `StaffModule` for staff and doctor profile administration
- `PatientsModule` for patient profile creation, search, ownership checks, and contact updates
- `DoctorScheduleModule` for clinic-admin managed doctor availability
- `AppointmentsModule` for booking, rescheduling, cancellation, analytics, status history, and status audit logs
- `QueueModule` for reception queue intake and doctor consultation workflow
- `NotificationsModule` for in-app appointment and queue notifications
- `VisitsModule` and `PrescriptionsModule` for assigned-doctor visit records, notes, prescriptions, lab orders, and visit completion
- `LabResultsModule` for lab order queues, validated result uploads, result publishing, and lab-result access checks
- `FilesModule` for randomized file storage, upload validation, and authorized attachment downloads
- `PatientPortalModule` for patient-owned visit history and ready lab result views
- `QaTestCasesModule`, `QaTestRunsModule`, `QaBugReportsModule`, and `QaReleaseGatesModule` for QA Center test design, execution evidence, defect lifecycle, and release quality gates
- `SecurityCenterModule`, `SuspiciousActivityModule`, `SecurityIncidentsModule`, and `AuditLogViewerModule` for failed-login monitoring, audit search, suspicious activity detection, incident response, findings, and session revocation
- `ReportsModule` for cross-module reporting endpoints and role-specific dashboard summary APIs
- Swagger/OpenAPI setup at `/api/docs`

## Appointment Workflow

```txt
Patient or Receptionist
  -> BOOKED
Receptionist
  -> CONFIRMED
  -> ARRIVED
  -> IN_QUEUE
Doctor
  -> IN_CONSULTATION
  -> LAB_REQUIRED or COMPLETED

Cancellation paths:
  BOOKED/CONFIRMED -> CANCELLED
  Patient cancellation is allowed only before the configured deadline.
```

Every status transition writes `AppointmentStatusHistory` and an `APPOINTMENT_STATUS_CHANGED` audit log. Queue actions write queue-specific audit logs as well.
Server-side scheduling rules reject appointments outside active doctor availability and reject overlapping active appointments for the same doctor. Queue actions enforce their own state preconditions before changing appointment status so invalid consultation outcomes do not partially update queue entries.

## Frontend

The frontend uses Next.js App Router, TypeScript, Tailwind CSS, and TanStack Query. It includes the application shell, login flow, protected dashboard layout, logout flow, role-based dashboard redirects, role-aware navigation, polished role dashboards, lightweight chart visualizations, clinic admin overview, staff management, patient search, patient profile views, QA Center screens, Security Center monitoring screens, and an in-app demo scenario page.

## Database

PostgreSQL is the system of record. Prisma owns schema modeling, migrations, and type-safe database access.

The current schema includes identity and audit tables, Sprint 2 clinic operations tables, and Sprint 3 workflow tables: doctor schedules, appointments, appointment status history, queue entries, and notifications.
Sprint 4 adds EMR-lite tables for visits, visit notes, prescriptions, lab orders, lab results, and file attachments. File paths remain server-side only; API responses expose attachment metadata and authorized download endpoints.
Sprint 5 adds QA Center tables for test suites, test cases, test runs, test run results, bug reports, release gates, and gate checks.
Sprint 6 adds Security Center tables for sessions, suspicious activity rules and events, security incidents, and security findings.

Sprint 7 adds report and dashboard endpoints over existing operational, QA, and security tables. Reports are computed from source-of-truth workflow records instead of maintaining duplicate analytics tables. Operational reports require `reports.read`, QA reports require `qa.read`, and security reports require `security.read`.

## Deployment Model

Local development runs with Docker Compose:

- PostgreSQL
- API
- Web

The Dockerfiles include development targets for Compose and production targets that build the NestJS API and Next.js web app before running their respective start commands.

CI is split into backend and frontend jobs:

- Backend: install, Prisma validation, Prisma generation, migration deploy, seed, format check, lint, typecheck, unit tests, integration tests, and build.
- Frontend: install, lint, typecheck, unit tests, build, Playwright browser install, Playwright smoke tests, and Playwright report upload.
