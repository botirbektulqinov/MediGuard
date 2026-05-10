# Vercel Deployment Guidance

Vercel is a good fit for the MediGuard Next.js web app. It is not the recommended place to run the NestJS API for this project because the API is designed as a long-lived server with Prisma migrations, health checks, file upload workflows, and operational monitoring.

## Recommended Split

- Deploy `apps/web` to Vercel.
- Deploy `apps/api` as a Docker service on Render, Fly.io, Railway, AWS ECS, Azure Container Apps, Google Cloud Run, or another container platform.
- Use managed PostgreSQL from the same provider or a dedicated database provider.

## Vercel Web Settings

When importing the repository into Vercel:

- Root Directory: `apps/web`
- Install Command: `corepack enable && corepack pnpm install --frozen-lockfile`
- Build Command: `corepack pnpm --filter @mediguard/web build`
- Output: Next.js default

Environment variables:

```env
NEXT_PUBLIC_API_URL=https://<your-api-domain>
```

Because `NEXT_PUBLIC_API_URL` is browser-visible, it must be the public HTTPS URL of the API.

## API Deployment Requirements

The API platform must support:

- A persistent Node.js process.
- Docker image deployment or equivalent Node runtime.
- `prisma migrate deploy` before startup.
- HTTPS via load balancer or reverse proxy.
- Environment secret management.
- Health checks against `/api/health/ready`.
- Centralized logs.
- Persistent or object-backed file storage.

## Database Requirements

- Managed PostgreSQL.
- TLS required.
- Automated backups and point-in-time recovery.
- Restricted network access.
- Separate application credentials from admin credentials.

## Domain Strategy

For a portfolio demo, you can start with provider-generated HTTPS domains:

- Vercel preview or production URL for web.
- API provider URL for backend.

For a real clinic, use owned domains:

- `https://clinic.example.com` for web.
- `https://api.clinic.example.com` for API.

Set `CORS_ORIGIN` to the exact web domain and `NEXT_PUBLIC_API_URL` to the exact API domain.
