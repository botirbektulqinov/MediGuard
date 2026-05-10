# Production Runbook

This runbook documents the minimum production controls required before MediGuard is used with real clinic data. It is written for deployment operators, not demo users.

## Deployment Model

Recommended production split:

- Web: Vercel or another managed Next.js platform.
- API: container platform that can run a long-lived NestJS process.
- Database: managed PostgreSQL with automated backups, TLS, point-in-time recovery, and private networking where available.
- File storage: managed object storage with private buckets, signed access, malware scanning, and retention rules.

The included `docker-compose.prod.yml` is a production-like local or single-host baseline. It is not a complete regulated healthcare hosting environment by itself.

## Required Environment Controls

- Store secrets in the deployment platform secret manager.
- Never commit `.env.production`.
- Rotate `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET` before real use.
- Use different secrets for production, staging, and local development.
- Set `CORS_ORIGIN` to exact HTTPS frontend origins only.
- Keep `SWAGGER_ENABLED=false` in production unless documentation access is explicitly needed.
- If Swagger is enabled in production, set `SWAGGER_USERNAME` and `SWAGGER_PASSWORD`; the API will fail startup without them.

## TLS

- Terminate HTTPS at the platform load balancer, reverse proxy, or CDN.
- Redirect HTTP to HTTPS.
- Enable HSTS after the domain and certificate renewal path are stable.
- Use managed certificates and monitor expiration.
- Ensure `NEXT_PUBLIC_API_URL` uses `https://`.

## Health And Observability

API health endpoints:

- `/api/health/live`: process liveness; does not touch downstream services.
- `/api/health/ready`: readiness; checks PostgreSQL connectivity.
- `/api/health`: compatibility alias for readiness.

Operational expectations:

- Configure uptime checks against `/api/health/ready`.
- Collect container stdout logs centrally.
- Preserve `X-Request-Id` from incoming requests where possible; the API emits this header and logs it.
- Do not log request bodies, passwords, tokens, raw credentials, uploaded file contents, or sensitive patient data.
- Alert on repeated 5xx responses, degraded readiness, failed login bursts, suspicious activity events, and high-severity security incidents.

## Database Migrations

Production startup uses:

```bash
pnpm --filter @mediguard/api prisma migrate deploy
```

Do not use `prisma db push` against production. Review migrations before deployment and back up the database before applying schema changes.

## Backup And Restore

For the production-like Compose stack:

```bash
COMPOSE_FILE=docker-compose.prod.yml ENV_FILE=.env.production scripts/postgres-backup.sh
COMPOSE_FILE=docker-compose.prod.yml ENV_FILE=.env.production scripts/postgres-restore.sh backups/<backup-file>.dump
```

Production requirements:

- Use managed PostgreSQL automated backups and point-in-time recovery.
- Test restore at least monthly in a non-production environment.
- Encrypt backups at rest.
- Restrict backup access to operators who need it.
- Store backup restore evidence for audit review.
- Define retention by legal and clinic policy requirements.

## Cloud Database Hardening

- Require TLS for database connections.
- Use private networking or trusted source restrictions.
- Use a dedicated least-privilege application database user.
- Keep administrative DB credentials out of the application runtime.
- Enable automated backups and PITR.
- Enable query and connection monitoring.
- Review slow queries and connection pool usage before scaling traffic.
- Patch minor PostgreSQL versions through the managed provider.

## Swagger In Production

Default: disabled.

If temporarily required:

```env
SWAGGER_ENABLED=true
SWAGGER_USERNAME=<operator-username>
SWAGGER_PASSWORD=<long-random-password>
```

Additional safeguards:

- Limit by IP or VPN at the reverse proxy if the platform supports it.
- Disable immediately after use.
- Never expose Swagger as a substitute for proper API documentation review.

## Incident Response

Minimum workflow:

1. Triage Security Center suspicious activity and failed login monitors.
2. Create a Security Incident with severity and evidence.
3. Contain by revoking suspicious sessions or disabling affected accounts.
4. Preserve audit logs and backup evidence.
5. Document remediation and close only after verification.
6. Add a regression test or detection rule when appropriate.

## Release Gate

Before production deployment:

- CI passes.
- Prisma migration reviewed.
- Backup completed or managed PITR verified.
- No critical or high open bugs.
- No unresolved high-severity security incidents.
- Required QA regression suite passes.
- Environment variables reviewed.
- Demo seed is not run against production.
