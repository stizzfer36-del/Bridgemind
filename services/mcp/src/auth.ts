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

/**
 * Express middleware that enforces authentication on all routes except /health.
 * Attaches the token to `res.locals.token` for downstream use.
 * Responds 401 if no token is present.
 */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if (req.path === "/health") {
    next();
    return;
  }
  const token = extractToken(req);
  if (!token) {
    res.status(401).json({ error: "missing credentials" });
    return;
  }
  res.locals.token = token;
  next();
}
