import type { FastifyRequest, FastifyReply } from "fastify";
import Redis from "ioredis";
import { prisma } from "./index.js";
import { verifyJwt } from "./jwt.js";

declare module "fastify" {
  interface FastifyRequest {
    userId?: string;
    authKind?: "api-key" | "jwt";
  }
}

const redis = new Redis(process.env.REDIS_URL ?? "redis://localhost:6379");

function clientIp(req: FastifyRequest): string {
  const fwd = req.headers["x-forwarded-for"];
  if (typeof fwd === "string" && fwd.length > 0) {
    return fwd.split(",")[0].trim();
  }
  return req.ip;
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

  const ip = clientIp(req);
  const failKey = `auth:fail:${ip}`;

  // Rate limit auth failures
  const failCount = await redis.get(failKey);
  if (failCount && parseInt(failCount, 10) >= 10) {
    return reply.code(429).send({ error: "Too many auth failures", code: "RATE_LIMITED" });
  }

  const fail = async () => {
    req.log.warn({ ip, tokenPrefix: token.slice(0, 12), kind: "auth_failure" }, "auth failed");
    const count = await redis.incr(failKey);
    if (count === 1) {
      await redis.expire(failKey, 300);
    }
  };

  if (token.startsWith("forge_live_") || token.startsWith("forge_test_")) {
    const row = await prisma.apiKey.findUnique({ where: { key: token } });
    if (!row || row.revokedAt) {
      await fail();
      return reply.code(401).send({ error: "invalid api key" });
    }
    req.userId = row.userId;
    req.authKind = "api-key";
    await redis.del(failKey);
    req.log.info({ userId: req.userId, kind: req.authKind }, "auth ok");
    return;
  }

  try {
    const payload = verifyJwt(token);
    req.userId = payload.sub;
    req.authKind = "jwt";
    await redis.del(failKey);
    req.log.info({ userId: req.userId, kind: req.authKind }, "auth ok");
  } catch {
    await fail();
    return reply.code(401).send({ error: "invalid token" });
  }
}
