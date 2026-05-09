# API Overview

MediGuard exposes a NestJS REST API under the `/api` prefix. Swagger/OpenAPI is available at `/api/docs` when `SWAGGER_ENABLED=true`.

## Authentication

Authentication uses JWT access tokens and opaque refresh tokens.

```txt
POST /api/auth/register
POST /api/auth/login
POST /api/auth/refresh
POST /api/auth/logout
GET  /api/auth/me
```

Security properties:

- Passwords are hashed before persistence and are never returned.
- Refresh tokens are stored in hashed form.
- Refresh token rotation revokes a token family on reuse.
- Failed logins are persisted and can lock accounts after repeated failures.
- Auth endpoints are rate-limited.

## Administration And RBAC

```txt
GET   /api/users
PATCH /api/users/:id/status
GET   /api/roles
POST  /api/roles/:id/users
POST  /api/roles/:id/permissions
GET   /api/permissions
GET   /api/audit-logs
```

Administrative endpoints require role or permission guards. Role and permission changes create audit logs.

## Clinic Operations

```txt
/api/clinics
/api/branches
/api/rooms
/api/clinic-services
/api/staff
/api/patients
```

Clinic, staff, and patient endpoints are scoped by assigned clinic for non-super users. Patient profile reads and updates are audited.

## Appointment And Queue Workflow

```txt
/api/doctor-schedules
/api/appointments
/api/queue
/api/notifications
```

Scheduling enforces doctor availability, prevents double booking, records appointment status history, and audits status changes.

## Visit, Lab, Files, And Patient Portal

```txt
/api/visits
/api/visits/:visitId/prescriptions
/api/lab-results
/api/patient-portal
/api/files
```

Medical data access uses patient ownership, assigned-doctor, and clinic-scoped lab checks. File responses never expose internal storage paths.

## QA Center

```txt
/api/qa/test-suites
/api/qa/test-cases
/api/qa/test-runs
/api/qa/bug-reports
/api/qa/release-gates
```

QA endpoints support test design, execution evidence, defect lifecycle, and release quality gates.

## Security Center

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

Security endpoints require security permissions and support failed-login review, audit search, suspicious activity detection, incident response, findings, and session revocation.

## Reports And Dashboards

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

Operational reports require `reports.read` and are clinic-scoped for non-super staff. QA reports require `qa.read`. Security reports require `security.read`.

## Error And Validation Model

- DTO validation rejects unknown fields and invalid enum or UUID values.
- Business-rule failures use explicit NestJS exceptions.
- Unauthorized and forbidden responses avoid leaking implementation details.
- Sensitive values such as passwords, tokens, secrets, internal file paths, and raw credentials are not returned.
