-- Forge bootstrap migration — matches services/api/prisma/schema.prisma
-- Run once against a fresh Postgres 16 database before starting the API.
-- Subsequent schema changes should use prisma migrate dev.

BEGIN;

-- ── Extensions ────────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── api_keys ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "ApiKey" (
    "id"        TEXT        NOT NULL PRIMARY KEY,
    "key"       TEXT        NOT NULL UNIQUE,
    "label"     TEXT,
    "userId"    TEXT        NOT NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "revokedAt" TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS "ApiKey_userId_idx" ON "ApiKey" ("userId");

-- ── projects ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "Project" (
    "id"          UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    "name"        TEXT        NOT NULL,
    "description" TEXT,
    "userId"      TEXT        NOT NULL,
    "createdAt"   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updatedAt"   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "Project_userId_idx" ON "Project" ("userId");

-- ── tasks ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "Task" (
    "id"              UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    "projectId"       UUID        NOT NULL REFERENCES "Project"("id") ON DELETE CASCADE,
    "status"          TEXT        NOT NULL DEFAULT 'todo',
    "instructions"    TEXT        NOT NULL,
    "taskKnowledge"   TEXT,
    "role"            TEXT,
    "runId"           TEXT,
    "assignedAgentId" TEXT,
    "createdAt"       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updatedAt"       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "Task_projectId_idx" ON "Task" ("projectId");

-- ── agents ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "Agent" (
    "id"           UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    "projectId"    UUID        NOT NULL REFERENCES "Project"("id") ON DELETE CASCADE,
    "name"         TEXT        NOT NULL,
    "systemPrompt" TEXT        NOT NULL,
    "model"        TEXT        NOT NULL DEFAULT 'claude-opus-4-7',
    "cliBinary"    TEXT        NOT NULL DEFAULT 'claude',
    "cliArgs"      TEXT,
    "createdAt"    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updatedAt"    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "Agent_projectId_idx" ON "Agent" ("projectId");

-- ── swarms ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "Swarm" (
    "id"        UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    "projectId" UUID        NOT NULL REFERENCES "Project"("id") ON DELETE CASCADE,
    "goal"      TEXT        NOT NULL,
    "status"    TEXT        NOT NULL DEFAULT 'running',
    "roles"     TEXT        NOT NULL,
    "mailboxId" TEXT        NOT NULL UNIQUE,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "Swarm_projectId_idx" ON "Swarm" ("projectId");

-- ── messages ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "Message" (
    "id"          UUID   NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    "swarmId"     UUID   NOT NULL REFERENCES "Swarm"("id") ON DELETE CASCADE,
    "fromAgentId" TEXT   NOT NULL,
    "toAgentId"   TEXT,
    "body"        TEXT   NOT NULL,
    "sig"         TEXT   NOT NULL,
    "ts"          BIGINT NOT NULL
);

CREATE INDEX IF NOT EXISTS "Message_swarmId_idx" ON "Message" ("swarmId");

-- ── run_traces ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "RunTrace" (
    "id"        UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    "taskId"    UUID        NOT NULL,
    "events"    TEXT        NOT NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "RunTrace_taskId_idx" ON "RunTrace" ("taskId");

-- ── updatedAt trigger ─────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW."updatedAt" = NOW();
    RETURN NEW;
END;
$$;

DO $$
DECLARE
    tbl TEXT;
BEGIN
    FOREACH tbl IN ARRAY ARRAY['Project', 'Task', 'Agent', 'Swarm'] LOOP
        EXECUTE format(
            'CREATE OR REPLACE TRIGGER set_updated_at
             BEFORE UPDATE ON %I
             FOR EACH ROW EXECUTE FUNCTION set_updated_at()',
            tbl
        );
    END LOOP;
END;
$$;

-- ── bench_results ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "BenchResult" (
    "id"         UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    "category"   TEXT        NOT NULL,
    "model"      TEXT        NOT NULL,
    "taskId"     TEXT        NOT NULL,
    "score"      FLOAT8      NOT NULL CHECK ("score" >= 0 AND "score" <= 1),
    "durationMs" INTEGER     NOT NULL CHECK ("durationMs" >= 0),
    "output"     TEXT,
    "createdAt"  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS "BenchResult_category_model_idx" ON "BenchResult" ("category", "model");

COMMIT;
