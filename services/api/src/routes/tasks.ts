import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../index.js";

const TaskStatus = z.enum(["todo", "in-progress", "in-review", "complete", "cancelled"]);

const ALLOWED: Record<string, string[]> = {
  "todo": ["in-progress", "cancelled"],
  "in-progress": ["in-review", "todo", "cancelled"],
  "in-review": ["complete", "in-progress", "cancelled"],
  "complete": ["cancelled"],
  "cancelled": [],
};

const CreateTaskSchema = z.object({
  projectId: z.string().min(1),
  instructions: z.string().min(1).max(5000),
  taskKnowledge: z.string().max(50000).optional(),
  status: TaskStatus.optional(),
  role: z.string().max(64).optional(),
});

const UpdateTaskSchema = z.object({
  instructions: z.string().max(5000).optional(),
  taskKnowledge: z.string().max(50000).optional(),
  status: TaskStatus.optional(),
  assignedAgentId: z.string().optional(),
});

const ListQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  cursor: z.string().optional(),
  status: z.string().optional(),
  sort: z.string().optional(),
});

export async function tasksRoutes(app: FastifyInstance): Promise<void> {
  app.get<{ Params: { id: string } }>("/v1/projects/:id/tasks", async (req, reply) => {
    const project = await prisma.project.findFirst({
      where: { id: req.params.id, userId: req.userId! },
    });
    if (!project) return reply.code(404).send({ error: "project not found" });

    const q = ListQuerySchema.parse(req.query);
    const limit = Math.min(q.limit, 100);

    const statuses = q.status ? q.status.split(",").map(s => s.trim()).filter(Boolean) : undefined;

    let orderBy: Record<string, string> = { createdAt: "asc" };
    if (q.sort) {
      const [field, dir] = q.sort.split(":");
      if ((field === "createdAt" || field === "updatedAt") && (dir === "asc" || dir === "desc")) {
        orderBy = { [field]: dir };
      }
    }

    const tasks = await prisma.task.findMany({
      where: {
        projectId: project.id,
        ...(statuses && statuses.length > 0 ? { status: { in: statuses } } : {}),
      },
      orderBy,
      take: limit,
      ...(q.cursor ? { cursor: { id: q.cursor }, skip: 1 } : {}),
    });
    return tasks.map(shape);
  });

  app.post("/v1/tasks", async (req, reply) => {
    const parsed = CreateTaskSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.message });
    const project = await prisma.project.findFirst({
      where: { id: parsed.data.projectId, userId: req.userId! },
    });
    if (!project) return reply.code(404).send({ error: "project not found" });
    const task = await prisma.task.create({
      data: {
        projectId: project.id,
        instructions: parsed.data.instructions,
        taskKnowledge: parsed.data.taskKnowledge,
        status: parsed.data.status ?? "todo",
        role: parsed.data.role,
      },
    });
    return shape(task);
  });

  app.get<{ Params: { id: string } }>("/v1/tasks/:id", async (req, reply) => {
    const task = await loadOwnedTask(req.params.id, req.userId!);
    if (!task) return reply.code(404).send({ error: "task not found" });
    return shape(task);
  });

  app.patch<{ Params: { id: string } }>("/v1/tasks/:id", async (req, reply) => {
    const parsed = UpdateTaskSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.message });
    const existing = await loadOwnedTask(req.params.id, req.userId!);
    if (!existing) return reply.code(404).send({ error: "task not found" });

    if (parsed.data.status && parsed.data.status !== existing.status) {
      const allowed = ALLOWED[existing.status] ?? [];
      if (!allowed.includes(parsed.data.status)) {
        return reply.code(422).send({
          error: `Cannot transition from ${existing.status} to ${parsed.data.status}`,
          code: "INVALID_TRANSITION",
        });
      }
    }

    const task = await prisma.task.update({
      where: { id: existing.id },
      data: parsed.data,
    });
    return shape(task);
  });

  app.delete<{ Params: { id: string } }>("/v1/tasks/:id", async (req, reply) => {
    const existing = await loadOwnedTask(req.params.id, req.userId!);
    if (!existing) return reply.code(404).send({ error: "task not found" });
    await prisma.task.delete({ where: { id: existing.id } });
    return reply.code(204).send();
  });
}

async function loadOwnedTask(id: string, userId: string) {
  return prisma.task.findFirst({
    where: { id, project: { userId } },
  });
}

function shape(t: {
  id: string;
  projectId: string;
  status: string;
  instructions: string;
  taskKnowledge: string | null;
  role: string | null;
  runId: string | null;
  assignedAgentId: string | null;
}) {
  return {
    id: t.id,
    projectId: t.projectId,
    status: t.status,
    instructions: t.instructions,
    taskKnowledge: t.taskKnowledge ?? undefined,
    role: t.role ?? undefined,
    runId: t.runId ?? undefined,
    assignedAgentId: t.assignedAgentId ?? undefined,
  };
}
