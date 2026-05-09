# QA Strategy

MediGuard treats quality engineering as a product capability. The QA Center supports planned test design, execution evidence, bug lifecycle tracking, and release gate decisions for a clinic platform that handles sensitive patient workflows.

## Test Pyramid

MediGuard uses layered coverage so defects are caught at the cheapest reliable layer:

- Unit tests cover deterministic business rules, guards, validators, access policies, state transitions, and quality gate calculation.
- Integration tests cover API workflows with authentication, RBAC, ownership checks, database persistence, audit logs, and negative cases.
- E2E tests cover role-based critical paths across multiple modules.
- Playwright tests cover browser workflows, navigation visibility, form behavior, loading states, error states, and smoke-level release readiness.

## Manual Testing Strategy

Manual testing is focused on exploratory and workflow validation that automation does not express well:

- Role-based walkthroughs for Super Admin, Clinic Admin, Receptionist, Doctor, Lab Technician, QA Manager, Security Officer, and Patient.
- Exploratory testing around patient-data boundaries, appointment status transitions, and error recovery.
- UI review for operational clarity, empty states, validation messaging, and accidental data exposure.
- Security-focused manual checks for unauthorized links, browser storage, sensitive logs, and download behavior.

Manual test cases are stored in QA Center as `TestSuite` and `TestCase` records. Required cases are marked explicitly so release gates can block shipment when core workflows are not passed.

## Automation Strategy

Automation targets business and security risk first:

- Authentication: login, refresh rotation, token reuse detection, logout, disabled accounts, lockout, invalid tokens.
- Authorization: RBAC, permission guards, patient ownership, assigned-doctor access, clinic scoping.
- Clinic operations: staff, patient search, contact updates, audit visibility.
- Appointment and queue: booking constraints, schedule validation, queue transitions, status history, audit logs.
- EMR-lite: assigned visit creation, lab order creation, upload validation, ready lab result publishing, patient portal ownership.
- QA Center: test run creation, result execution, bug lifecycle, release gate calculation.
- Security Center: failed login monitoring, audit log filtering, suspicious activity detection, incident workflow, finding workflow, and session revocation.
- Reports and dashboards: role dashboard summaries, chart data, report authorization, and empty/loading/error UI states.

Bug fixes should include regression tests that fail without the fix.

## Regression Strategy

Regression suites are grouped by feature area:

- `Authentication Regression`
- `Patient Access Regression`
- `Appointment Queue Regression`
- `Visit And Lab Regression`
- `QA Center Regression`
- `Security Controls Regression`

Every sprint should add or update regression cases for changed behavior. Before release, QA runs all required cases for impacted areas and records evidence through `TestRunResult`.

## Release Quality Gate

Release gates evaluate a test run and bug state before shipment:

- Blocks release when any critical bug is open.
- Blocks release when any required test case is not passed, including pending, skipped, failed, or blocked cases.
- Blocks release when pass rate is below the configured threshold, default `90%`.
- Shows pass rate, failed checks, non-passed required tests, and blocking bug references.

Release gates are advisory evidence for portfolio use, but the implementation treats them as a real quality control point.

## Example Test Cases

| Feature Area      | Test Case                                                                  | Priority | Required |
| ----------------- | -------------------------------------------------------------------------- | -------- | -------- |
| Authentication    | Invalid login is rejected and failed attempt is tracked                    | Critical | Yes      |
| Patient Access    | Patient cannot access another patient's profile                            | Critical | Yes      |
| Appointment Queue | Patient books appointment, reception queues, doctor completes consultation | Critical | Yes      |
| Visit And Lab     | Doctor requests lab, lab uploads result, patient views ready result        | High     | Yes      |
| File Upload       | Executable lab-result upload is rejected without orphan records            | Critical | Yes      |
| QA Center         | Failed test creates bug and blocked release gate                           | High     | Yes      |
| Security Center   | Failed login burst creates suspicious event and incident                   | High     | Yes      |
| Reports           | Unauthorized patient cannot access cross-role reports                      | High     | Yes      |

## Bug Severity Definitions

| Severity | Definition                                                                                                                        | Examples                                                                                                       |
| -------- | --------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| Critical | Causes patient-data exposure, authentication bypass, unrecoverable workflow failure, data corruption, or release-blocking outage. | Cross-patient lab result access, refresh token reuse not detected, completed appointment missing audit history |
| High     | Breaks a major role workflow or security control with a workaround or limited blast radius.                                       | Doctor cannot complete visits, lab upload leaves inconsistent records, quality gate ignores required failures  |
| Medium   | Degrades usability, reporting, validation, or non-critical workflow correctness.                                                  | Unclear form error, missing empty state, dashboard count mismatch                                              |
| Low      | Cosmetic, documentation, copy, minor layout, or developer-experience issue.                                                       | Misaligned table cell, stale README command, missing tooltip                                                   |

## Quality Gates Before Completing Work

- Formatting passes.
- Lint passes.
- Typecheck passes.
- Relevant unit tests pass.
- Relevant integration or E2E tests pass.
- Regression tests are added for bug fixes.
- Documentation is updated for behavior, security, QA, API, or setup changes.

## Sprint Coverage Summary

- Sprint 0: health-check unit test and CI verification foundation.
- Sprint 1: auth unit and integration coverage.
- Sprint 2: patient access policy tests, clinic scoping, and patient API integration coverage.
- Sprint 3: appointment rules, booking, queue transition, status history, and audit coverage.
- Sprint 4: visit/lab/file/patient portal workflow and negative upload/ownership coverage.
- Sprint 5: QA Center quality gate unit tests plus test run, failed result, bug lifecycle, and release gate integration coverage.
- Sprint 6: suspicious activity rule unit tests plus failed-login detection, incident workflow, audit filtering, and unauthorized security-dashboard integration coverage.
- Sprint 7: report endpoint integration coverage and dashboard smoke-test coverage for role pages.
