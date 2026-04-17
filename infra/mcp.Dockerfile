FROM node:20-alpine AS base
WORKDIR /repo

FROM base AS deps
RUN corepack enable
COPY pnpm-workspace.yaml package.json ./
COPY services/mcp/package.json services/mcp/
RUN pnpm install --frozen-lockfile=false

FROM deps AS build
COPY . .
RUN pnpm --filter @forge/mcp build

FROM node:20-alpine AS run
WORKDIR /app
COPY --from=build /repo/services/mcp /app

HEALTHCHECK --interval=10s --timeout=5s --retries=3 \
  CMD wget -qO- http://localhost:4100/health || exit 1

RUN addgroup --system --gid 1001 forge && adduser --system --uid 1001 --ingroup forge forge
USER forge

CMD ["node", "dist/server.js"]
