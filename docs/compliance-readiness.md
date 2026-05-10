# Compliance Readiness

MediGuard is a portfolio project and is not certified for HIPAA, GDPR, SOC 2, ISO 27001, or local healthcare regulation out of the box. This document shows the controls that are implemented and the work required before use with real clinic data.

## Implemented Technical Controls

- RBAC and permission guards.
- Patient ownership checks.
- Assigned-doctor and clinic-scoped access checks.
- Audit logs for sensitive workflows.
- Failed-login tracking and account lockout.
- Refresh token rotation with hashed persistence.
- File upload validation.
- Security Center incident and finding workflows.
- QA Center release gate workflows.
- Environment validation and ignored secret files.

## Required Before Real Clinic Use

- Legal review for the jurisdiction where the clinic operates.
- Data processing agreements with hosting, database, email, SMS, file storage, and monitoring providers.
- Written retention policy for patient records, audit logs, files, backups, and security events.
- Data subject request workflow if privacy law requires it.
- Disaster recovery plan with tested restore evidence.
- Access review process for staff accounts and privileged roles.
- Production incident response process.
- Security awareness and operational training for clinic staff.
- External vulnerability assessment or penetration test.

## Data Protection Requirements

- Encrypt traffic with TLS.
- Encrypt database, file storage, and backups at rest.
- Use a secret manager for production secrets.
- Restrict database and storage access by network and IAM policy.
- Avoid storing patient data in third-party analytics tools.
- Avoid sending patient data to logs, crash reports, or browser analytics.
- Use least-privilege roles for operators and application runtime accounts.

## Evidence To Keep

- CI results.
- Test reports.
- Release gate decisions.
- Backup and restore test logs.
- Access reviews.
- Security incident records.
- Vulnerability scan and penetration test reports.
- Change approvals for production deployments.

## Residual Risks

- Refresh tokens are currently client-managed; HttpOnly Secure SameSite cookie storage remains the stronger production pattern.
- Uploaded files are validated but not malware-scanned by an external scanner.
- Audit logs are mutable database records; immutable append-only retention remains future hardening.
- Production alert delivery is documented but not wired to a provider in this repository.
