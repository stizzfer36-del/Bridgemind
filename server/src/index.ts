import Fastify from "fastify";
import cors from "@fastify/cors";
import { PrismaClient } from "@prisma/client";
import { apiKeyAuth } from "./auth.js";
import { projectsRoutes } from "./routes/projects.js";
import { tasksRoutes } from "./routes/tasks.js";
import { agentsRoutes } from "./routes/agents.js";

export const prisma = new PrismaClient();

const app = Fastify({ logger: true });

await app.register(cors, { origin: true });
app.addHook("preHandler", apiKeyAuth);

await app.register(projectsRoutes);
await app.register(tasksRoutes);
await app.register(agentsRoutes);

app.get("/health", async () => ({ ok: true }));

const port = Number(process.env.PORT ?? 4000);
await app.listen({ port, host: "0.0.0.0" });
