import type { FastifyInstance } from "fastify";
import { prisma } from "../index.js";

export async function runsRoutes(app: FastifyInstance): Promise<void> {
  app.get<{ Params: { id: string } }>("/v1/runs/:id", async (req, reply) => {
    const run = await prisma.runTrace.findFirst({
      where: {
        id: req.params.id,
        // ownership check via task → project → user
        task: { project: { userId: req.userId! } } as never,
      } as never,
    }).catch(async () => {
      // fall back — schema does not currently join runs to tasks via relation;
      // filter in memory
      const r = await prisma.runTrace.findUnique({ where: { id: req.params.id } });
      if (!r) return null;
      const t = await prisma.task.findFirst({
        where: { id: r.taskId, project: { userId: req.userId! } },
      });
      return t ? r : null;
    });
    if (!run) return reply.code(404).send({ error: "run not found" });

    const events = run.events
      .split("\n")
      .filter(Boolean)
      .map((l) => JSON.parse(l));

    return { id: run.id, taskId: run.taskId, events };
  });

  app.get<{ Params: { id: string } }>("/v1/runs/:id/replay.sh", async (req, reply) => {
    const run = await prisma.runTrace.findUnique({ where: { id: req.params.id } });
    if (!run) return reply.code(404).send({ error: "run not found" });
    const script = buildReplayScript(run.id, run.events.split("\n").filter(Boolean));
    reply.header("content-type", "text/x-shellscript");
    return script;
  });
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
        const esc = b64.toString("utf8").replace(/'/g, "'\\''");
        return `printf '%s' '${esc}'`;
      }
      return `# ${line}`;
    }),
    "",
  ].join("\n");
}
