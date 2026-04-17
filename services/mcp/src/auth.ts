import type { Request, Response, NextFunction } from "express";

/**
 * Extracts the caller's API key or JWT from the request.
 *
 * Precedence:
 *   1. Authorization: Bearer <token>
 *   2. ?apiKey=<token>   (query-string fallback for SSE clients)
 */
export function extractToken(req: Request): string | null {
  const header = req.headers["authorization"];
  if (typeof header === "string") {
    const lower = header.toLowerCase();
    if (lower.startsWith("bearer ")) {
      const t = header.slice(7).trim();
      if (t) return t;
    }
  }
  const q = (req.query as Record<string, string | undefined>).apiKey;
  if (typeof q === "string" && q) return q;
  return null;
}

const TOKEN_CACHE = new Map<string, { ok: boolean; expiresAt: number }>();
const CACHE_TTL_MS = 60_000;

async function validateToken(token: string): Promise<boolean> {
  const now = Date.now();
  const cached = TOKEN_CACHE.get(token);
  if (cached && cached.expiresAt > now) return cached.ok;
  const apiUrl = process.env.FORGE_API_URL ?? "http://localhost:4000";
  let ok = false;
  try {
    const res = await fetch(`${apiUrl}/health`, { headers: { Authorization: `Bearer ${token}` } });
    ok = res.ok;
  } catch { ok = false; }
  TOKEN_CACHE.set(token, { ok, expiresAt: now + CACHE_TTL_MS });
  // cap cache size
  if (TOKEN_CACHE.size > 1000) {
    const oldest = TOKEN_CACHE.keys().next().value;
    if (oldest) TOKEN_CACHE.delete(oldest);
  }
  return ok;
}

/**
 * Express middleware that enforces authentication on all routes except /health.
 * Attaches the token to `res.locals.token` for downstream use.
 * Responds 401 if no token is present or token is invalid.
 */
export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  if (req.path === "/health") {
    next();
    return;
  }
  const token = extractToken(req);
  if (!token) {
    res.status(401).json({ error: "missing credentials" });
    return;
  }
  const valid = await validateToken(token);
  if (!valid) {
    res.status(401).json({ error: "invalid credentials" });
    return;
  }
  res.locals.token = token;
  next();
}
