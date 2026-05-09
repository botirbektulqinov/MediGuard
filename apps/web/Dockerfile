FROM node:22-alpine AS base

WORKDIR /workspace
RUN corepack enable

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/web/package.json apps/web/package.json
COPY packages/shared/package.json packages/shared/package.json

FROM base AS dependencies
RUN pnpm install --filter @mediguard/web... --frozen-lockfile

FROM dependencies AS development
COPY . .
EXPOSE 3000
CMD ["pnpm", "--filter", "@mediguard/web", "dev"]

FROM dependencies AS build
ARG NEXT_PUBLIC_API_URL=http://localhost:4000
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_TELEMETRY_DISABLED=1
COPY . .
RUN pnpm --filter @mediguard/web build

FROM node:22-alpine AS production

ENV NODE_ENV=production
ARG NEXT_PUBLIC_API_URL=http://localhost:4000
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_TELEMETRY_DISABLED=1
WORKDIR /workspace
RUN corepack enable

COPY --chown=node:node package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY --chown=node:node apps/web/package.json apps/web/package.json
COPY --chown=node:node packages/shared/package.json packages/shared/package.json
COPY --chown=node:node --from=build /workspace/node_modules ./node_modules
COPY --chown=node:node --from=build /workspace/apps/web/node_modules ./apps/web/node_modules
COPY --chown=node:node --from=build /workspace/apps/web/.next ./apps/web/.next
COPY --chown=node:node --from=build /workspace/apps/web/next.config.mjs ./apps/web/next.config.mjs
COPY --chown=node:node --from=build /workspace/apps/web/package.json ./apps/web/package.json
COPY --chown=node:node --from=build /workspace/packages/shared ./packages/shared
USER node

EXPOSE 3000
CMD ["pnpm", "--filter", "@mediguard/web", "start"]
