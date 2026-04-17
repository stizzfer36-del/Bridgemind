# Migrations

Schema lives in `services/api/prisma/schema.prisma`. Create migrations with:

```
pnpm --filter @forge/api prisma:migrate --name <label>
```

Applied migrations are checked in under `services/api/prisma/migrations/`.
This directory is reserved for infra-level SQL (views, triggers, extensions)
that live outside Prisma's generator.
