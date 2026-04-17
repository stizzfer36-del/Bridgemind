import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { randomBytes } from "node:crypto";
import { prisma } from "../index.js";

const CreateKeySchema = z.object({ label: z.string().max(128).optional() });

export async function keysRoutes(app: FastifyInstance) {
  app.post("/v1/keys", async (req) => {
    const parsed = CreateKeySchema.safeParse(req.body);
    const label = parsed.success ? parsed.data.label : undefined;
    const key = `forge_live_${randomBytes(16).toString("hex")}`;
    await prisma.apiKey.create({ data: { key, label, userId: req.userId! } });
    return { key, label, message: "Store this key — it will not be shown again." };
  });

  app.get("/v1/keys", async (req) => {
    const keys = await prisma.apiKey.findMany({
      where: { userId: req.userId!, revokedAt: null },
      orderBy: { createdAt: "desc" },
    });
    return keys.map(k => ({
      id: k.id,
      prefix: k.key.slice(0, 16) + "…",
      label: k.label,
      createdAt: k.createdAt,
    }));
  });

  app.delete<{ Params: { id: string } }>("/v1/keys/:id", async (req, reply) => {
    const row = await prisma.apiKey.findFirst({ where: { id: req.params.id, userId: req.userId! } });
    if (!row) return reply.code(404).send({ error: "key not found" });
    await prisma.apiKey.update({ where: { id: row.id }, data: { revokedAt: new Date() } });
    return reply.code(204).send();
  });
}
