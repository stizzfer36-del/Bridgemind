import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { createHmac, randomUUID } from "node:crypto";
import { prisma } from "../index.js";

const MAILBOX_SECRET = process.env.MAILBOX_SECRET ?? "dev-mailbox-secret";

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

export async function swarmsRoutes(app: FastifyInstance): Promise<void> {
  app.post("/v1/swarms", async (req, reply) => {
    const parsed = CreateSwarmSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.message });
    const project = await prisma.project.findFirst({
      where: { id: parsed.data.projectId, userId: req.userId! },
    });
    if (!project) return reply.code(404).send({ error: "project not found" });
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

  app.post<{ Params: { id: string } }>("/v1/swarms/:id/messages", async (req, reply) => {
    const parsed = MessageSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.message });
    const swarm = await prisma.swarm.findFirst({
      where: { id: req.params.id, project: { userId: req.userId! } },
    });
    if (!swarm) return reply.code(404).send({ error: "swarm not found" });

    const ts = BigInt(Date.now());
    const sig = sign(
      `${swarm.id}|${parsed.data.from}|${parsed.data.to ?? ""}|${ts}|${parsed.data.body}`
    );

    const msg = await prisma.message.create({
      data: {
        swarmId: swarm.id,
        fromAgentId: parsed.data.from,
        toAgentId: parsed.data.to,
        body: parsed.data.body,
        sig,
        ts,
      },
    });
    return messageShape(msg);
  });
}

function sign(payload: string): string {
  return createHmac("sha256", MAILBOX_SECRET).update(payload).digest("hex");
}

function shape(
  s: {
    id: string;
    projectId: string;
    goal: string;
    status: string;
    roles: string;
    mailboxId: string;
  },
  messages: {
    id: string;
    swarmId: string;
    fromAgentId: string;
    toAgentId: string | null;
    body: string;
    sig: string;
    ts: bigint;
  }[]
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
  id: string;
  swarmId: string;
  fromAgentId: string;
  toAgentId: string | null;
  body: string;
  sig: string;
  ts: bigint;
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
