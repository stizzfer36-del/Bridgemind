import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../index.js";

const CreateAgentSchema = z.object({
  projectId: z.string().min(1),
  name: z.string().min(1).max(255),
  systemPrompt: z.string().max(100000),
  cliBinary: z.string().max(255).optional(),
  cliArgs: z.array(z.string()).optional(),
});

const UpdateAgentSchema = z.object({
  name: z.string().max(255).optional(),
  systemPrompt: z.string().max(100000).optional(),
  cliBinary: z.string().max(255).optional(),
  cliArgs: z.array(z.string()).optional(),
});

export async function agentsRoutes(app: FastifyInstance): Promise<void> {
  app.get<{ Params: { id: string } }>("/api/projects/:id/agents", async (req, reply) => {
    const project = await prisma.project.findFirst({
      where: { id: req.params.id, userId: req.userId! },
    });
    if (!project) return reply.code(404).send({ error: "project not found" });
    const agents = await prisma.agent.findMany({
      where: { projectId: project.id },
      orderBy: { createdAt: "asc" },
    });
    return agents.map(shape);
  });

  app.get<{ Params: { id: string } }>("/api/agents/:id", async (req, reply) => {
    const agent = await loadOwnedAgent(req.params.id, req.userId!);
    if (!agent) return reply.code(404).send({ error: "agent not found" });
    return shape(agent);
  });

  app.post("/api/agents", async (req, reply) => {
    const parsed = CreateAgentSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.message });
    const project = await prisma.project.findFirst({
      where: { id: parsed.data.projectId, userId: req.userId! },
    });
    if (!project) return reply.code(404).send({ error: "project not found" });
    const agent = await prisma.agent.create({
      data: {
        projectId: project.id,
        name: parsed.data.name,
        systemPrompt: parsed.data.systemPrompt,
        cliBinary: parsed.data.cliBinary,
        cliArgs: parsed.data.cliArgs ? JSON.stringify(parsed.data.cliArgs) : null,
      },
    });
    return shape(agent);
  });

  app.patch<{ Params: { id: string } }>("/api/agents/:id", async (req, reply) => {
    const parsed = UpdateAgentSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.message });
    const existing = await loadOwnedAgent(req.params.id, req.userId!);
    if (!existing) return reply.code(404).send({ error: "agent not found" });
    const agent = await prisma.agent.update({
      where: { id: existing.id },
      data: {
        name: parsed.data.name,
        systemPrompt: parsed.data.systemPrompt,
        cliBinary: parsed.data.cliBinary,
        cliArgs: parsed.data.cliArgs ? JSON.stringify(parsed.data.cliArgs) : undefined,
      },
    });
    return shape(agent);
  });

  app.delete<{ Params: { id: string } }>("/api/agents/:id", async (req, reply) => {
    const existing = await loadOwnedAgent(req.params.id, req.userId!);
    if (!existing) return reply.code(404).send({ error: "agent not found" });
    await prisma.agent.delete({ where: { id: existing.id } });
    return reply.code(204).send();
  });
}

async function loadOwnedAgent(id: string, userId: string) {
  return prisma.agent.findFirst({
    where: { id, project: { userId } },
  });
}

function shape(a: {
  id: string;
  name: string;
  systemPrompt: string;
  cliBinary: string | null;
  cliArgs: string | null;
}) {
  return {
    id: a.id,
    name: a.name,
    systemPrompt: a.systemPrompt,
    cliBinary: a.cliBinary ?? undefined,
    cliArgs: a.cliArgs ? (JSON.parse(a.cliArgs) as string[]) : undefined,
  };
}
