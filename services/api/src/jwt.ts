import { createHmac, timingSafeEqual } from "node:crypto";

const SECRET = process.env.JWT_SECRET ?? "dev-secret-change-me";

/**
 * Minimal HS256 JWT verify. Production would use @fastify/jwt with RS256 + a
 * real OAuth issuer; this keeps the service dependency-light for local dev.
 */
export async function verifyJwt(token: string): Promise<{ sub: string; exp: number }> {
  const parts = token.split(".");
  if (parts.length !== 3) throw new Error("bad jwt");
  const [h, p, s] = parts;
  const expected = sign(`${h}.${p}`);
  if (!timingSafeEqual(b64urlDecode(s), b64urlDecode(expected))) {
    throw new Error("bad signature");
  }
  const payload = JSON.parse(b64urlDecode(p).toString("utf8")) as {
    sub?: string;
    exp?: number;
  };
  if (!payload.sub) throw new Error("no sub");
  if (payload.exp && Date.now() / 1000 > payload.exp) throw new Error("expired");
  return { sub: payload.sub, exp: payload.exp ?? 0 };
}

export function signJwt(sub: string, ttlSec = 900): string {
  const header = { alg: "HS256", typ: "JWT" };
  const payload = { sub, iat: Math.floor(Date.now() / 1000), exp: Math.floor(Date.now() / 1000) + ttlSec };
  const h = b64urlEncode(Buffer.from(JSON.stringify(header)));
  const p = b64urlEncode(Buffer.from(JSON.stringify(payload)));
  const s = sign(`${h}.${p}`);
  return `${h}.${p}.${s}`;
}

function sign(input: string): string {
  return b64urlEncode(createHmac("sha256", SECRET).update(input).digest());
}

function b64urlEncode(b: Buffer): string {
  return b.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function b64urlDecode(s: string): Buffer {
  const pad = s.length % 4 === 0 ? "" : "=".repeat(4 - (s.length % 4));
  return Buffer.from(s.replace(/-/g, "+").replace(/_/g, "/") + pad, "base64");
}
