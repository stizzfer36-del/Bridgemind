import type { FastifyRequest, FastifyReply } from "fastify";
import { prisma } from "./index.js";

declare module "fastify" {
  interface FastifyRequest {
    userId?: string;
  }
}

export async function apiKeyAuth(
  req: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  if (req.url === "/health") return;
  const header = req.headers["authorization"];
  if (typeof header !== "string" || !header.toLowerCase().startsWith("bearer ")) {
    return reply.code(401).send({ error: "missing bearer token" });
  }
  const key = header.slice(7).trim();
  if (!key.startsWith("bm_live_") && !key.startsWith("bm_test_")) {
    return reply.code(401).send({ error: "invalid api key prefix" });
  }
  const row = await prisma.apiKey.findUnique({ where: { key } });
  if (!row || row.revokedAt) {
    return reply.code(401).send({ error: "invalid api key" });
  }
  req.userId = row.userId;
}
