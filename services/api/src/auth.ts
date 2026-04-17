import type { FastifyRequest, FastifyReply } from "fastify";
import { prisma } from "./index.js";
import { verifyJwt } from "./jwt.js";

declare module "fastify" {
  interface FastifyRequest {
    userId?: string;
    authKind?: "api-key" | "jwt";
  }
}

/**
 * Accepts either:
 *   Authorization: Bearer forge_live_<hex32>   — API key
 *   Authorization: Bearer <jwt>                — OAuth2 PKCE session
 *   ?apiKey=forge_live_...                     — query fallback
 */
export async function auth(
  req: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  if (req.url === "/health") return;

  const header = req.headers["authorization"];
  const tokenFromHeader =
    typeof header === "string" && header.toLowerCase().startsWith("bearer ")
      ? header.slice(7).trim()
      : null;
  const tokenFromQuery =
    typeof (req.query as Record<string, string>).apiKey === "string"
      ? (req.query as Record<string, string>).apiKey
      : null;
  const token = tokenFromHeader ?? tokenFromQuery;

  if (!token) {
    return reply.code(401).send({ error: "missing credentials" });
  }

  if (token.startsWith("forge_live_") || token.startsWith("forge_test_")) {
    const row = await prisma.apiKey.findUnique({ where: { key: token } });
    if (!row || row.revokedAt) {
      return reply.code(401).send({ error: "invalid api key" });
    }
    req.userId = row.userId;
    req.authKind = "api-key";
    return;
  }

  try {
    const payload = await verifyJwt(token);
    req.userId = payload.sub;
    req.authKind = "jwt";
  } catch {
    return reply.code(401).send({ error: "invalid token" });
  }
}
