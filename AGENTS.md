# AGENTS.md

Guidance for Codex and future coding agents working in the MediGuard repository.

## Project Overview

MediGuard is a secure clinic operations platform for private clinics. It includes appointment scheduling, queue management, patient portal access, QA Center workflows, Security Center monitoring, audit logging, and role-based clinic administration.

The project is intended to demonstrate production-grade fullstack engineering, QA automation, and defensive cybersecurity practices. Treat patient data, authentication, authorization, auditability, and test coverage as core product requirements.

## Repository Structure

Expected monorepo layout:

```txt
apps/
  api/                 NestJS backend
  web/                 Next.js frontend

packages/
  shared/              Shared TypeScript types, validation schemas, constants

docs/
  architecture.md
  qa-strategy.md
  security-model.md
  security-threat-model.md
  security-checklist.md
  rbac-matrix.md
  api-examples.md
  screenshots/

.github/
  workflows/           CI pipelines
```

Keep new code inside the appropriate app or package. Do not introduce unrelated top-level folders unless there is a clear repository-wide reason.

## Coding Standards

- Use strict TypeScript.
- Prefer explicit types for public APIs, DTOs, service methods, shared schemas, and security-sensitive code.
- Keep modules small, cohesive, and maintainable.
- Prefer clear names over comments. Add comments only where they explain non-obvious decisions.
- Validate all external input.
- Handle errors consistently through established framework patterns.
- Keep business rules deterministic and testable.
- Avoid large files that mix unrelated responsibilities.
- Reuse shared types, schemas, constants, and helpers from `packages/shared` when appropriate.
- Do not leave fake unfinished stubs unless they are clearly marked as `TODO` and documented.

## Backend Conventions

Backend code belongs in `apps/api` and should follow NestJS modular architecture.

- Use NestJS modules grouped by business capability.
- Keep controllers thin. Controllers should handle routing, request binding, guards, and response shape only.
- Keep business logic in services.
- Use DTOs for request input validation.
- Use guards for authentication, RBAC, permissions, and ownership checks.
- Use Prisma for database access.
- Avoid direct database access from controllers.
- Sensitive actions must create audit logs.
- Auth endpoints must support secure JWT access tokens and refresh token rotation.
- Passwords must be hashed with Argon2 or bcrypt.
- Failed login attempts must be tracked.
- Auth-related endpoints should be rate-limited.
- Use centralized error handling and avoid leaking implementation details.
- Swagger/OpenAPI documentation should be updated when API behavior changes.

Sensitive actions include, but are not limited to:

- Login, logout, refresh token reuse, and account lockout events
- Patient record access or updates
- Lab result upload, publish, or access
- Staff role or permission changes
- Appointment status changes
- Security incident updates
- QA quality gate changes

## Frontend Conventions

Frontend code belongs in `apps/web` and should use Next.js with TypeScript.

- Use reusable components for layout, forms, tables, dashboards, and workflow controls.
- Keep role-based UI checks consistent with backend permissions.
- Do not expose unauthorized data in the UI.
- Do not rely on frontend checks as the source of authorization truth.
- Use form validation for all user input.
- Use loading, empty, and error states for async screens.
- Use React Query/TanStack Query patterns consistently for server state.
- Use React Hook Form and Zod where forms require validation.
- Keep screens practical and workflow-focused. This is an operations platform, not a marketing site.
- Ensure role-specific dashboards only show actions appropriate for the current user.
- Avoid leaking sensitive patient data in client logs, error messages, or browser storage.

## Testing Requirements

Run the relevant test suite for every change. Add tests for new behavior and regression tests for bug fixes.

Required test coverage areas:

- Business logic
- Authorization guards
- Ownership checks
- Authentication and refresh token behavior
- Failed login and account lockout behavior
- Patient data access
- Audit logging
- Appointment and queue state transitions
- File upload validation
- QA Center workflows
- Security Center detection and incident workflows

Testing expectations:

- Unit tests for services, guards, validators, state transitions, and utility logic.
- Integration tests for API flows such as auth, appointments, patient access, audit logs, QA, and security incidents.
- E2E tests for critical user workflows.
- Playwright tests for frontend role-based flows where relevant.
- Bug fixes should include regression tests that fail without the fix.

## Security Requirements

MediGuard is defensive-security only. Do not implement offensive tools, exploit workflows, credential harvesting, stealth logic, malware behavior, or instructions that help attack real systems.

Security requirements:

- Use RBAC and permission checks.
- Use ownership checks for patient data.
- Never bypass authorization checks.
- Audit all sensitive patient-data access.
- Validate all external input.
- Validate file uploads by size, MIME type, extension, and intended ownership.
- Rate-limit authentication endpoints.
- Track failed login attempts.
- Lock accounts after repeated failed login attempts.
- Never log passwords, refresh tokens, access tokens, secrets, or raw credentials.
- Never commit secrets.
- Do not expose stack traces or internal error details to normal users.
- Keep environment variable validation strict.
- Treat backend authorization as authoritative. Frontend checks are only UX helpers.

## Documentation Requirements

Update documentation whenever behavior, setup, architecture, security posture, QA strategy, API behavior, or demo data changes.

Documentation locations:

- `README.md` for project overview, setup, demo accounts, commands, and high-level architecture.
- `docs/architecture.md` for system design and module boundaries.
- `docs/qa-strategy.md` for testing approach and quality gates.
- `docs/security-model.md` for authentication, authorization, audit logging, and data protection.
- `docs/security-threat-model.md` for assets, threats, mitigations, and residual risks.
- `docs/security-checklist.md` for OWASP-style defensive checks.
- `docs/rbac-matrix.md` for roles and permissions.
- `docs/api-examples.md` for representative API usage.

Do not let documentation drift from implementation.

## Commands To Run Before Completing Work

Run the strongest applicable verification for the changed code.

Preferred commands:

```bash
pnpm format
pnpm lint
pnpm typecheck
pnpm test
```

When backend behavior changes, also run the relevant API tests:

```bash
pnpm --filter api test
pnpm --filter api test:integration
```

When frontend behavior changes, also run the relevant web checks:

```bash
pnpm --filter web lint
pnpm --filter web typecheck
pnpm --filter web test
pnpm --filter web test:e2e
```

When database schema changes:

```bash
pnpm --filter api prisma validate
pnpm --filter api prisma migrate dev
```

If a command cannot be run because the repository is not yet bootstrapped or dependencies are unavailable, state that clearly in the final summary.

## Definition Of Done

A task is done only when:

- The implementation satisfies the requested behavior.
- Code follows existing project conventions.
- TypeScript remains strict and clean.
- External input is validated.
- Authorization and ownership checks are preserved.
- Sensitive actions are audited where required.
- Errors are handled consistently.
- Tests are added or updated for new behavior.
- Relevant regression tests are added for bug fixes.
- Formatting, linting, typechecking, and applicable tests have been run.
- README or docs are updated when behavior, setup, security, QA, or API contracts change.
- No secrets, tokens, passwords, or private keys are committed.
- The final response summarizes what changed and how it was verified.

## Things Not To Do

- Do not bypass authentication, authorization, permission checks, or ownership checks.
- Do not commit secrets or example secrets that look real.
- Do not log passwords, tokens, secrets, or sensitive patient data.
- Do not expose unauthorized data in API responses or frontend state.
- Do not put business logic in controllers.
- Do not duplicate role or permission logic across unrelated modules.
- Do not create large, mixed-responsibility files.
- Do not skip validation for request bodies, query params, route params, or file uploads.
- Do not add fake placeholder features and present them as complete.
- Do not leave failing tests, lint errors, or type errors without documenting the blocker.
- Do not update generated files manually unless the toolchain requires it.
- Do not introduce new dependencies without a clear reason.
- Do not implement offensive cybersecurity functionality.
