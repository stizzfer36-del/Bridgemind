import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../index.js";

const CreateRunSchema = z.object({
  taskId: z.string().min(1),
  events: z.string().min(1),
});

export async function runsRoutes(app: FastifyInstance): Promise<void> {
  app.post("/v1/runs", async (req, reply) => {
    const parsed = CreateRunSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.message });
    const task = await prisma.task.findFirst({
      where: { id: parsed.data.taskId, project: { userId: req.userId! } },
    });
    if (!task) return reply.code(404).send({ error: "task not found" });
    const run = await prisma.runTrace.create({
      data: { taskId: parsed.data.taskId, events: parsed.data.events },
    });
    const events = run.events.split("\n").filter(Boolean).map((l: string) => JSON.parse(l) as unknown);
    return reply.code(201).send({ id: run.id, taskId: run.taskId, createdAt: run.createdAt, events });
  });

  app.get<{ Params: { id: string } }>("/v1/runs/:id", async (req, reply) => {
    const run = await loadOwnedRun(req.params.id, req.userId!);
    if (!run) return reply.code(404).send({ error: "run not found" });

    const events = run.events.split("\n").filter(Boolean).map((l: string) => JSON.parse(l) as unknown);
    return { id: run.id, taskId: run.taskId, events };
  });

  app.get<{ Params: { id: string } }>("/v1/runs/:id/replay.sh", async (req, reply) => {
    const run = await loadOwnedRun(req.params.id, req.userId!);
    if (!run) return reply.code(404).send({ error: "run not found" });
    const script = buildReplayScript(run.id, run.events.split("\n").filter(Boolean));
    reply.header("content-type", "text/x-shellscript");
    return script;
  });
}

async function loadOwnedRun(id: string, userId: string) {
  const run = await prisma.runTrace.findUnique({ where: { id } });
  if (!run) return null;
  const task = await prisma.task.findFirst({
    where: { id: run.taskId, project: { userId } },
  });
  return task ? run : null;
}

function escapeForPrintf(bytes: Buffer): string {
  let out = "";
  for (const byte of bytes) {
    if (byte === 0x27) {
      // single quote
      out += "'\\''";
    } else if ((byte >= 0x20 && byte <= 0x7e) || byte === 0x09 || byte === 0x0a || byte === 0x0d) {
      out += String.fromCharCode(byte);
    } else {
      out += `\\x${byte.toString(16).padStart(2, "0")}`;
    }
  }
  return out;
}

function buildReplayScript(runId: string, jsonlLines: string[]): string {
  return [
    "#!/usr/bin/env bash",
    `# Forge run replay ${runId}`,
    "# Pipe this to a shell inside a pane to replay byte-for-byte:",
    "#   bash replay.sh",
    "set -u",
    ...jsonlLines.map((line) => {
      const e = JSON.parse(line) as { type: string; bytes?: string; ts: number };
      if (e.type === "pty" && e.bytes) {
        const b64 = Buffer.from(e.bytes, "base64");
        const esc = escapeForPrintf(b64);
        return `printf '%b' '${esc}'`;
      }
      return `# ${line}`;
    }),
    "",
  ].join("\n");
}
