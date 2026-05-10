# Development Setup

## Requirements

- Node.js 22+
- Corepack
- Docker Desktop

## Install Dependencies

```bash
corepack enable
pnpm install
pnpm --filter @mediguard/api prisma generate
```

If the shell cannot create the global `pnpm` shim, prefix pnpm commands with Corepack:

```bash
corepack pnpm install
corepack pnpm --filter @mediguard/api prisma generate
```

## Environment

```bash
cp .env.example .env
```

Use development-only secrets locally. Never commit real secrets.

## Environment Variables

| Variable              | Used by | Purpose                                      |
| --------------------- | ------- | -------------------------------------------- |
| `POSTGRES_USER`       | Docker  | Local PostgreSQL username                    |
| `POSTGRES_PASSWORD`   | Docker  | Local PostgreSQL password                    |
| `POSTGRES_DB`         | Docker  | Local PostgreSQL database                    |
| `DATABASE_URL`        | API     | Prisma PostgreSQL connection string          |
| `JWT_ACCESS_SECRET`   | API     | Access-token signing secret                  |
| `JWT_REFRESH_SECRET`  | API     | Refresh-token signing secret                 |
| `CORS_ORIGIN`         | API     | Comma-separated allowed frontend origins     |
| `SWAGGER_ENABLED`     | API     | Enables or disables Swagger                  |
| `SWAGGER_USERNAME`    | API     | Basic Auth username for protected Swagger    |
| `SWAGGER_PASSWORD`    | API     | Basic Auth password for protected Swagger    |
| `FILE_STORAGE_DIR`    | API     | Local lab-result attachment storage location |
| `NEXT_PUBLIC_API_URL` | Web     | Browser-visible API base URL                 |

## Start PostgreSQL

```bash
docker compose up postgres
```

## Start Applications

```bash
pnpm dev:api
pnpm dev:web
```

## Docker Compose

```bash
docker compose up --build
```

The API container runs `prisma db push` and then the demo seed script when it starts.
If PostgreSQL credentials fail after changing `.env.example` values, the local Docker volume was
likely initialized with older credentials. Stop the stack and recreate the development volume before
retrying:

```bash
docker compose down -v
docker compose up --build
```

## Useful URLs

- Web: `http://localhost:3000`
- API health: `http://localhost:4000/api/health`
- API liveness: `http://localhost:4000/api/health/live`
- API readiness: `http://localhost:4000/api/health/ready`
- Swagger: `http://localhost:4000/api/docs` when `SWAGGER_ENABLED=true`

## Verification

```bash
pnpm format
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

Run API integration tests against the Compose PostgreSQL service:

```bash
docker compose build api
docker compose run --rm api sh -c "pnpm --filter @mediguard/api prisma db push && pnpm --filter @mediguard/api test:integration"
```

Docker builds use the checked-in `pnpm-lock.yaml` and `--frozen-lockfile` so container
dependency resolution matches the repository state.

The checked-in Dockerfiles expose development and production targets. Docker Compose uses the
development targets so hot reload works locally; production targets build compiled artifacts and
run `start` commands.

## Production-Like Compose

Use `docker-compose.prod.yml` for a production-style local run:

```bash
cp .env.production.example .env.production
# Replace every placeholder in .env.production.
docker compose --env-file .env.production -f docker-compose.prod.yml up --build
```

The production compose file:

- Builds the `production` targets from the API and web Dockerfiles.
- Runs API and web containers as the non-root `node` user.
- Requires production secrets and deployment URLs instead of silently using development defaults.
- Runs `prisma migrate deploy` for the API before startup.
- Does not run the demo seed script automatically.
- Requires `SWAGGER_USERNAME` and `SWAGGER_PASSWORD` if `SWAGGER_ENABLED=true` in production.

See [production runbook](production-runbook.md) for backup, restore, TLS, monitoring, and database
hardening expectations.
