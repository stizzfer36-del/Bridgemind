import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../index.js";

const CreateProjectSchema = z.object({
  name: z.string().min(1).max(255).transform(s => s.trim()),
  description: z.string().max(2000).transform(s => s.trim()).optional(),
});

const PatchProjectSchema = z.object({
  name: z.string().min(1).max(255).transform(s => s.trim()).optional(),
  description: z.string().max(2000).transform(s => s.trim()).optional(),
});

const ListQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  cursor: z.string().optional(),
});

export async function projectsRoutes(app: FastifyInstance): Promise<void> {
  app.get("/v1/projects", async (req) => {
    const q = ListQuerySchema.parse(req.query);
    const limit = Math.min(q.limit, 100);
    const projects = await prisma.project.findMany({
      where: { userId: req.userId! },
      orderBy: { createdAt: "desc" },
      take: limit,
      ...(q.cursor ? { cursor: { id: q.cursor }, skip: 1 } : {}),
    });
    return projects.map(shape);
  });

  app.post("/v1/projects", async (req, reply) => {
    const parsed = CreateProjectSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.message });
    const project = await prisma.project.create({
      data: { ...parsed.data, userId: req.userId! },
    });
    return shape(project);
  });

  app.get<{ Params: { id: string } }>("/v1/projects/:id", async (req, reply) => {
    const project = await prisma.project.findFirst({
      where: { id: req.params.id, userId: req.userId! },
    });
    if (!project) return reply.code(404).send({ error: "project not found" });
    return shape(project);
  });

  app.patch<{ Params: { id: string } }>("/v1/projects/:id", async (req, reply) => {
    const parsed = PatchProjectSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.message });
    const existing = await prisma.project.findFirst({
      where: { id: req.params.id, userId: req.userId! },
    });
    if (!existing) return reply.code(404).send({ error: "project not found" });
    const project = await prisma.project.update({
      where: { id: existing.id },
      data: parsed.data,
    });
    return shape(project);
  });

  app.delete<{ Params: { id: string } }>("/v1/projects/:id", async (req, reply) => {
    const existing = await prisma.project.findFirst({
      where: { id: req.params.id, userId: req.userId! },
    });
    if (!existing) return reply.code(404).send({ error: "project not found" });
    await prisma.project.delete({ where: { id: existing.id } });
    return reply.code(204).send();
  });
}

function shape(p: {
  id: string;
  name: string;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: p.id,
    name: p.name,
    description: p.description ?? undefined,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  };
}
