import Fastify from "fastify";
import cors from "@fastify/cors";
import rateLimit from "@fastify/rate-limit";
import { PrismaClient } from "@prisma/client";
import { auth } from "./auth.js";
import { projectsRoutes } from "./routes/projects.js";
import { tasksRoutes } from "./routes/tasks.js";
import { agentsRoutes } from "./routes/agents.js";
import { swarmsRoutes } from "./routes/swarms.js";
import { runsRoutes } from "./routes/runs.js";

export const prisma = new PrismaClient();

const app = Fastify({ logger: true });

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

app.get("/health", async () => ({ ok: true }));

const port = Number(process.env.PORT ?? 4000);
await app.listen({ port, host: "0.0.0.0" });
