import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { createHmac, randomUUID } from "node:crypto";
import { prisma } from "../index.js";

const MAILBOX_SECRET = process.env.MAILBOX_SECRET ?? "dev-secret";

const RoleSchema = z.object({
  id: z.string(),
  name: z.string(),
  agentId: z.string(),
});

const CreateSwarmSchema = z.object({
  projectId: z.string().min(1),
  goal: z.string().min(1).max(5000),
  roles: z.array(RoleSchema).min(1).max(16),
});

const MessageSchema = z.object({
  from: z.string().min(1),
  to: z.string().optional(),
  body: z.string().min(1).max(10000),
});

const PatchSwarmSchema = z.object({
  status: z.enum(["done", "failed"]),
});

const VerifySchema = z.object({ messageId: z.string() });

export async function swarmsRoutes(app: FastifyInstance): Promise<void> {
  app.post("/v1/swarms", async (req, reply) => {
    const parsed = CreateSwarmSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.message });
    const project = await prisma.project.findFirst({
      where: { id: parsed.data.projectId, userId: req.userId! },
    });
    if (!project) return reply.code(404).send({ error: "project not found" });

    const agentIds = parsed.data.roles.map(r => r.agentId);
    const foundAgents = await prisma.agent.findMany({
      where: { id: { in: agentIds }, projectId: project.id },
    });
    if (foundAgents.length !== agentIds.length) {
      return reply.code(422).send({ error: "one or more agentIds not found in project", code: "INVALID_AGENTS" });
    }

    const swarm = await prisma.swarm.create({
      data: {
        projectId: project.id,
        goal: parsed.data.goal,
        status: "running",
        roles: JSON.stringify(parsed.data.roles),
        mailboxId: randomUUID(),
      },
    });
    return shape(swarm, []);
  });

  app.get<{ Params: { id: string } }>("/v1/swarms/:id", async (req, reply) => {
    const swarm = await prisma.swarm.findFirst({
      where: { id: req.params.id, project: { userId: req.userId! } },
    });
    if (!swarm) return reply.code(404).send({ error: "swarm not found" });
    const messages = await prisma.message.findMany({
      where: { swarmId: swarm.id },
      orderBy: { ts: "asc" },
    });
    return shape(swarm, messages);
  });

  app.patch<{ Params: { id: string } }>("/v1/swarms/:id", async (req, reply) => {
    const parsed = PatchSwarmSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.message });
    const swarm = await prisma.swarm.findFirst({
      where: { id: req.params.id },
      include: { project: true },
    });
    if (!swarm || swarm.project.userId !== req.userId!) {
      return reply.code(404).send({ error: "swarm not found" });
    }
    const updated = await prisma.swarm.update({
      where: { id: swarm.id },
      data: { status: parsed.data.status },
    });
    const messages = await prisma.message.findMany({
      where: { swarmId: swarm.id },
      orderBy: { ts: "asc" },
    });
    return shape(updated, messages);
  });

  app.post<{ Params: { id: string } }>("/v1/swarms/:id/messages", async (req, reply) => {
    const parsed = MessageSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.message });
    const swarm = await prisma.swarm.findFirst({
      where: { id: req.params.id, project: { userId: req.userId! } },
    });
    if (!swarm) return reply.code(404).send({ error: "swarm not found" });

    const ts = BigInt(Date.now());
    const hmacSig = createHmac("sha256", MAILBOX_SECRET)
      .update(`${swarm.id}|${parsed.data.from}|${parsed.data.to ?? ""}|${ts}|${parsed.data.body}`)
      .digest("hex");

    const msg = await prisma.message.create({
      data: {
        swarmId: swarm.id,
        fromAgentId: parsed.data.from,
        toAgentId: parsed.data.to,
        body: parsed.data.body,
        sig: hmacSig,
        ts,
      },
    });
    return messageShape(msg);
  });

  app.get<{ Params: { id: string } }>("/v1/swarms/:id/messages", async (req, reply) => {
    const swarm = await prisma.swarm.findFirst({
      where: { id: req.params.id, project: { userId: req.userId! } },
    });
    if (!swarm) return reply.code(404).send({ error: "swarm not found" });

    const q = req.query as Record<string, string>;
    const limit = Math.min(Number(q.limit ?? 50) || 50, 200);
    const since = q.since ? BigInt(q.since) : undefined;

    const messages = await prisma.message.findMany({
      where: {
        swarmId: swarm.id,
        ...(since ? { ts: { gt: since } } : {}),
      },
      orderBy: { ts: "asc" },
      take: limit,
    });
    return messages.map(messageShape);
  });

  app.post<{ Params: { id: string } }>("/v1/swarms/:id/verify", async (req, reply) => {
    const parsed = VerifySchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.message });
    const swarm = await prisma.swarm.findFirst({
      where: { id: req.params.id, project: { userId: req.userId! } },
    });
    if (!swarm) return reply.code(404).send({ error: "swarm not found" });

    const msg = await prisma.message.findFirst({
      where: { id: parsed.data.messageId, swarmId: swarm.id },
    });
    if (!msg) return reply.code(404).send({ error: "message not found" });

    const expected = createHmac("sha256", process.env.MAILBOX_SECRET ?? "dev-secret")
      .update(msg.fromAgentId + msg.body + msg.ts.toString())
      .digest("hex");
    return { valid: msg.sig === expected };
  });
}

function shape(
  s: { id: string; projectId: string; goal: string; status: string; roles: string; mailboxId: string },
  messages: { id: string; swarmId: string; fromAgentId: string; toAgentId: string | null; body: string; sig: string; ts: bigint }[]
) {
  return {
    id: s.id,
    projectId: s.projectId,
    goal: s.goal,
    status: s.status,
    roles: JSON.parse(s.roles),
    mailboxId: s.mailboxId,
    mailbox: messages.map(messageShape),
  };
}

function messageShape(m: {
  id: string; swarmId: string; fromAgentId: string; toAgentId: string | null;
  body: string; sig: string; ts: bigint;
}) {
  return {
    id: m.id,
    swarmId: m.swarmId,
    fromAgentId: m.fromAgentId,
    toAgentId: m.toAgentId ?? undefined,
    body: m.body,
    sig: m.sig,
    ts: Number(m.ts),
  };
}
