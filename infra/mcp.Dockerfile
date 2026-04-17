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
CMD ["node", "dist/server.js"]
