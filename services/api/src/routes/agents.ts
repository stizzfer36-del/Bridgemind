import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../index.js";

const KNOWN_MODELS = [
  "claude-opus-4-7",
  "claude-sonnet-4-6",
  "gpt-4o",
  "gpt-4o-mini",
  "gemini-2.0-flash",
  "gemini-1.5-pro",
];

const CreateAgentSchema = z.object({
  projectId: z.string().min(1),
  name: z.string().min(1).max(255),
  systemPrompt: z.string().max(100000),
  model: z.string().max(128),
  cliBinary: z.string().max(255),
  cliArgs: z.array(z.string()).optional(),
});

const UpdateAgentSchema = z.object({
  name: z.string().max(255).optional(),
  systemPrompt: z.string().max(100000).optional(),
  model: z.string().max(128).optional(),
  cliBinary: z.string().max(255).optional(),
  cliArgs: z.array(z.string()).optional(),
});

const ListQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  cursor: z.string().optional(),
});

export async function agentsRoutes(app: FastifyInstance): Promise<void> {
  app.get<{ Params: { id: string } }>("/v1/projects/:id/agents", async (req, reply) => {
    const project = await prisma.project.findFirst({
      where: { id: req.params.id, userId: req.userId! },
    });
    if (!project) return reply.code(404).send({ error: "project not found" });

    const q = ListQuerySchema.parse(req.query);
    const limit = Math.min(q.limit, 100);
    const agents = await prisma.agent.findMany({
      where: { projectId: project.id },
      orderBy: { createdAt: "asc" },
      take: limit,
      ...(q.cursor ? { cursor: { id: q.cursor }, skip: 1 } : {}),
    });
    return agents.map(shape);
  });

  app.get<{ Params: { id: string } }>("/v1/agents/:id", async (req, reply) => {
    const agent = await loadOwnedAgent(req.params.id, req.userId!);
    if (!agent) return reply.code(404).send({ error: "agent not found" });
    return shape(agent);
  });

  app.post("/v1/agents", async (req, reply) => {
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
        model: parsed.data.model,
        cliBinary: parsed.data.cliBinary,
        cliArgs: JSON.stringify(parsed.data.cliArgs ?? []),
      },
    });
    const out = shape(agent);
    if (!KNOWN_MODELS.includes(agent.model)) {
      return { ...out, _warning: "unknown model" };
    }
    return out;
  });

  app.patch<{ Params: { id: string } }>("/v1/agents/:id", async (req, reply) => {
    const parsed = UpdateAgentSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.message });
    const existing = await loadOwnedAgent(req.params.id, req.userId!);
    if (!existing) return reply.code(404).send({ error: "agent not found" });
    const agent = await prisma.agent.update({
      where: { id: existing.id },
      data: {
        name: parsed.data.name,
        systemPrompt: parsed.data.systemPrompt,
        model: parsed.data.model,
        cliBinary: parsed.data.cliBinary,
        cliArgs: parsed.data.cliArgs !== undefined ? JSON.stringify(parsed.data.cliArgs) : undefined,
      },
    });
    const out = shape(agent);
    if (agent.model && !KNOWN_MODELS.includes(agent.model)) {
      return { ...out, _warning: "unknown model" };
    }
    return out;
  });

  app.delete<{ Params: { id: string } }>("/v1/agents/:id", async (req, reply) => {
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
  model: string;
  cliBinary: string;
  cliArgs: string | null;
}) {
  return {
    id: a.id,
    name: a.name,
    systemPrompt: a.systemPrompt,
    model: a.model,
    cliBinary: a.cliBinary,
    cliArgs: JSON.parse(a.cliArgs ?? "[]") as string[],
  };
}
