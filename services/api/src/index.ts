import Fastify from "fastify";
import cors from "@fastify/cors";
import rateLimit from "@fastify/rate-limit";
import { PrismaClient } from "@prisma/client";
import { randomUUID } from "node:crypto";
import { auth } from "./auth.js";
import { projectsRoutes } from "./routes/projects.js";
import { tasksRoutes } from "./routes/tasks.js";
import { agentsRoutes } from "./routes/agents.js";
import { swarmsRoutes } from "./routes/swarms.js";
import { runsRoutes } from "./routes/runs.js";
import { benchRoutes } from "./routes/bench.js";
import { keysRoutes } from "./routes/keys.js";

export const prisma = new PrismaClient();

const app = Fastify({ logger: true });

// Request ID hook
app.addHook("onRequest", async (req, reply) => {
  const existing = req.headers["x-request-id"];
  const id = typeof existing === "string" && existing.length > 0 ? existing : randomUUID();
  (req as unknown as Record<string, unknown>)["requestId"] = id;
  reply.header("x-request-id", id);
});

// Error serializer
app.setErrorHandler(async (err, _req, reply) => {
  const errAny = err as unknown as Record<string, unknown>;
  // Zod validation errors
  if ("issues" in err && Array.isArray(errAny.issues)) {
    return reply.code(400).send({
      error: "Validation failed",
      code: "VALIDATION_ERROR",
      details: errAny.issues,
    });
  }
  // Prisma errors
  const code = errAny.code as string | undefined;
  if (code === "P2002") {
    return reply.code(409).send({ error: err.message, code: "CONFLICT" });
  }
  if (code === "P2025") {
    return reply.code(404).send({ error: err.message, code: "NOT_FOUND" });
  }
  return reply.code(500).send({ error: err.message, code: "INTERNAL_ERROR" });
});

await app.register(cors, { origin: true });
await app.register(rateLimit, {
  global: true,
  max: 120,
  timeWindow: "1 minute",
  keyGenerator: (req) => {
    const h = req.headers["authorization"];
    if (typeof h === "string") return h.slice(7, 64);
    return req.ip;
  },
});

app.addHook("preHandler", auth);

await app.register(projectsRoutes);
await app.register(tasksRoutes);
await app.register(agentsRoutes);
await app.register(swarmsRoutes);
await app.register(runsRoutes);
await app.register(benchRoutes);
await app.register(keysRoutes);

app.get("/health", async () => ({
  ok: true,
  version: "0.1.0",
  uptime: process.uptime(),
  db: await prisma.$queryRaw`SELECT 1`.then(() => "ok").catch(() => "error"),
}));

const port = Number(process.env.PORT ?? 4000);

const shutdown = async () => {
  await app.close();
  await prisma.$disconnect();
  process.exit(0);
};

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);

await app.listen({ port, host: "0.0.0.0" });
