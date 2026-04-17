import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../index.js";

const CreateProjectSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(2000).optional(),
});

export async function projectsRoutes(app: FastifyInstance): Promise<void> {
  app.get("/api/projects", async (req) => {
    const projects = await prisma.project.findMany({
      where: { userId: req.userId! },
      orderBy: { createdAt: "desc" },
    });
    return projects.map(shape);
  });

  app.post("/api/projects", async (req, reply) => {
    const parsed = CreateProjectSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.message });
    const project = await prisma.project.create({
      data: { ...parsed.data, userId: req.userId! },
    });
    return shape(project);
  });
}

function shape(p: {
  id: string;
  name: string;
  description: string | null;
}) {
  return { id: p.id, name: p.name, description: p.description ?? undefined };
}
