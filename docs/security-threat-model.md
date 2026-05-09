# Security Threat Model

MediGuard handles clinic operations and sensitive patient workflows. The security model is defensive-only and focuses on authentication hardening, authorization correctness, auditability, monitoring, and incident response.

## Assets

- User credentials and account status
- JWT access tokens and refresh-token families
- Patient demographics, contact data, appointments, visits, prescriptions, lab orders, lab results, and attachments
- Staff, role, and permission assignments
- Audit logs, login attempts, sessions, suspicious activity events, incidents, and findings
- QA release evidence and quality gates
- Environment configuration and CI/CD secrets

## Actors

- Super Admin: platform-wide administrative access
- Clinic Admin: assigned-clinic operations and reporting
- Receptionist: intake, appointment, and queue workflow
- Doctor: assigned patient and visit workflow
- Lab Technician: assigned-clinic lab workflow
- QA Manager: QA Center workflow and release evidence
- Security Officer: security monitoring, audit review, incident response, and session revocation
- Patient: own portal data only
- Unauthenticated user: login, registration, and public health/API docs paths

## Trust Boundaries

- Browser to API over HTTP in local development and HTTPS in production deployments
- API authentication boundary between unauthenticated and authenticated routes
- API authorization boundary between role/permission scopes and patient ownership scopes
- API to PostgreSQL for durable records
- API to local or future external file storage for medical attachments
- API to future notification providers
- CI environment to repository and deployment secrets

## Main Threats

- Credential stuffing or brute-force login attempts
- Disabled or locked account access attempts
- Refresh-token replay or stolen browser tokens
- Broken access control between clinic roles or patient-owned records
- Patient records viewed without valid operational context
- Excessive patient profile browsing by an insider
- Repeated lab result downloads by a suspicious account
- Privilege escalation through role or permission changes
- Upload of executable or misleading lab-result files
- Sensitive data leakage through logs, errors, API responses, or frontend state
- Incident evidence lost because security findings and response actions are not durable

## Mitigations

- Passwords are hashed with bcrypt and never returned.
- Access tokens are short-lived JWTs.
- Refresh tokens are opaque, stored hashed, rotated, and revoked by token family on reuse.
- Session records track refresh-token families, are marked revoked or expired when no longer usable, and can be revoked by Security Officers.
- Auth endpoints have route-specific throttling.
- Failed login attempts are persisted with IP and user-agent metadata.
- Accounts lock after repeated failed login attempts.
- Disabled accounts cannot authenticate or refresh tokens.
- NestJS DTO validation rejects unknown fields and invalid external input.
- RBAC and permission guards protect privileged endpoints.
- Patient ownership and assigned-doctor checks protect patient and medical data.
- Clinic-scoped access prevents assigned staff from crossing clinic boundaries.
- File upload validation enforces size, MIME type, extension, randomized storage names, and no internal path exposure.
- Sensitive actions create audit logs, including auth events, role/permission changes, patient access, medical record actions, QA changes, security incidents, findings, session revocation, and suspicious activity evaluation.
- Security Center detects suspicious patterns from login attempts and audit logs.

## Audit Strategy

Audit logs are the evidence source for sensitive workflows:

- Authentication: login success, login failure, logout, invalid logout token, refresh-token reuse.
- Authorization administration: user role assignment and role permission assignment.
- Patient data: patient profile view/update, patient portal access, visit and lab result views, file downloads.
- Clinic operations: staff, clinic, branch, room, service, appointment, queue, and visit changes.
- QA: test suite/case/run/result, bug lifecycle, and release quality gate changes.
- Security: suspicious activity evaluation, incident creation/update, finding creation/update, and session revocation.

Security Center exposes searchable audit logs and a focused sensitive-patient-access view for monitoring.

## Suspicious Activity Rules

Implemented rule types:

- Too many failed logins
- User views too many patient profiles in a short time
- Disabled user attempts login
- Role or permission changed
- Lab result downloaded repeatedly
- Patient record accessed outside appointment context

Rules persist as `SuspiciousActivityRule` records. Evaluations create deduplicated `SuspiciousActivityEvent` records with evidence payloads.

## Incident Response Workflow

Incident lifecycle:

```txt
DETECTED -> INVESTIGATING -> CONTAINED -> RESOLVED
                         -> FALSE_POSITIVE
```

Security Officers can:

- Review failed logins, sessions, audit logs, and suspicious events.
- Create incidents from suspicious events or manually.
- Assign severity and remediation notes.
- Update incident status.
- Revoke suspicious sessions.
- Record security findings with evidence and remediation.

## Residual Risks

- The demo frontend stores tokens in browser localStorage. Production deployment should move refresh tokens to HttpOnly Secure SameSite cookies.
- File upload malware scanning is not integrated yet; current protection validates MIME type, extension, size, and executable upload rejection.
- Current Security Center detection is rule-based. Production systems should add risk scoring, alert delivery, and immutable log retention.
