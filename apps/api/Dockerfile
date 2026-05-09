FROM node:22-alpine AS base

WORKDIR /workspace
RUN corepack enable

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/api/package.json apps/api/package.json
COPY packages/shared/package.json packages/shared/package.json

FROM base AS dependencies
RUN pnpm install --filter @mediguard/api... --frozen-lockfile

FROM dependencies AS development
COPY . .
RUN pnpm --filter @mediguard/api prisma generate
EXPOSE 4000
CMD ["pnpm", "--filter", "@mediguard/api", "start:dev"]

FROM dependencies AS build
COPY . .
RUN pnpm --filter @mediguard/api prisma generate
RUN pnpm --filter @mediguard/api build

FROM node:22-alpine AS production

ENV NODE_ENV=production
WORKDIR /workspace
RUN corepack enable

COPY --chown=node:node package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY --chown=node:node apps/api/package.json apps/api/package.json
COPY --chown=node:node packages/shared/package.json packages/shared/package.json
COPY --chown=node:node --from=build /workspace/node_modules ./node_modules
COPY --chown=node:node --from=build /workspace/apps/api/node_modules ./apps/api/node_modules
COPY --chown=node:node --from=build /workspace/apps/api/dist ./apps/api/dist
COPY --chown=node:node --from=build /workspace/apps/api/prisma ./apps/api/prisma
COPY --chown=node:node --from=build /workspace/packages/shared ./packages/shared
RUN mkdir -p storage/uploads && chown -R node:node /workspace
USER node

EXPOSE 4000
CMD ["pnpm", "--filter", "@mediguard/api", "start"]
