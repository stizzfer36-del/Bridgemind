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
CMD ["node", "dist/index.js"]
