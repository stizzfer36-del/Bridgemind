FROM node:20-alpine AS base
WORKDIR /repo

FROM base AS deps
RUN corepack enable
COPY pnpm-workspace.yaml package.json ./
COPY services/api/package.json services/api/
COPY packages ./packages
RUN pnpm install --frozen-lockfile=false

FROM deps AS build
COPY . .
RUN pnpm --filter @forge/api exec prisma generate
RUN pnpm --filter @forge/api build

FROM node:20-alpine AS run
WORKDIR /app
COPY --from=build /repo/services/api /app

HEALTHCHECK --interval=10s --timeout=5s --retries=3 \
  CMD wget -qO- http://localhost:4000/health || exit 1

RUN addgroup --system --gid 1001 forge && adduser --system --uid 1001 --ingroup forge forge
USER forge

CMD ["node", "dist/index.js"]
