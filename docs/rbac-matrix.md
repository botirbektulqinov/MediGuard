# RBAC Matrix

This matrix defines the planned role and permission model. Backend authorization is authoritative. Frontend role checks are only user experience helpers.

| Role             | Implemented Access Through Sprint 7                                                                    |
| ---------------- | ------------------------------------------------------------------------------------------------------ |
| Super Admin      | All permissions, including clinic configuration, staff, patients, and audit logs                       |
| Clinic Admin     | Assigned clinic setup, doctor availability, appointment analytics, staff, patients, reports            |
| Receptionist     | Patient intake, appointment booking, arrival, queue intake, rescheduling, and cancellation             |
| Doctor           | Assigned patient profile access, assigned queue workflow, visit records, prescriptions, and lab orders |
| Lab Technician   | Assigned-clinic lab order review, validated result upload, and result publishing                       |
| QA Manager       | Test suites, test cases, test runs, bug reports, and release quality gates                             |
| Security Officer | Audit logs, failed-login monitor, suspicious activity events, incidents, findings, and session revoke  |
| Patient          | Own linked profile, appointments, visit history, ready lab results, and allowed attachments            |

## Planned Permission Keys

```txt
users.read
users.manage
roles.read
roles.manage
permissions.read
permissions.manage
auth.me
clinic.manage
branch.manage
room.manage
service.manage
staff.read
staff.manage
roles.manage
patient.read
patient.create
patient.update
patient.sensitive.read
appointment.read
appointment.create
appointment.update
appointment.cancel
doctor-schedule.manage
queue.read
queue.manage
visit.read
visit.create
visit.update
lab.read
lab.upload
lab.publish
audit.read
qa.read
qa.manage
qa.execute
security.read
security.incident.manage
reports.read
```

Sprint 6 seeds the listed roles, permissions, demo clinic, branch, room, service, staff profiles, doctor profile, doctor schedules, patient profile, sample QA regression suite, suspicious activity rules, and a sample security finding. `SUPER_ADMIN` receives all permissions. Other roles receive only the permissions needed for their implemented or planned workflows.

## Ownership Rules

- Patients may only access their own linked profile.
- Receptionists may create patient profiles, search patient basic/contact data, and update non-medical contact fields.
- Doctors may access assigned patient basic profiles only and cannot browse all patients.
- Patients may book and cancel their own appointments before the cancellation deadline.
- Receptionists may create, confirm, reschedule, cancel, mark arrived, and queue appointments within their assigned clinic.
- Doctors may view today's assigned queue and move assigned appointments through consultation outcomes.
- Doctors may create and update visit records only for appointments assigned to their doctor profile.
- Doctors may create prescription notes and lab orders only inside their assigned active visits.
- Clinic admins may view appointment analytics and manage doctor availability within their assigned clinic.
- Staff access is scoped by assigned clinic for Sprint 2 clinic configuration, staff, and patient endpoints.
- Lab technicians may view lab orders, upload allowed file types, and publish lab results only within assigned clinic scope.
- Patients may view only their own visit history, ready lab results, and allowed attachments; internal file paths are never returned.
- QA managers may create and execute test runs, manage bug reports, and create release quality gates.
- Assigned users may update bugs assigned to them even without broad QA management permission, but they may only move defects to `IN_PROGRESS` or `READY_FOR_QA`. QA Managers retain authority to close, reopen, retest, and triage defects.
- Security officers may inspect security events, audit logs, failed login attempts, and session records within their authorized scope but cannot edit patient records.
- Security officers with `security.incident.manage` may create and update security incidents, create and update security findings, and revoke suspicious sessions.
- Operational report endpoints require `reports.read` and are scoped to the assigned clinic for non-super staff. Non-super users without a clinic staff profile receive no cross-clinic operational analytics.
- QA report endpoints, including test pass rate and open bugs by severity, require `qa.read`.
- Security report endpoints, including incident severity and failed-login trends, require `security.read`.
