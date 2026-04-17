import { createHmac, timingSafeEqual } from "node:crypto";

const ISS = "forge-api";
const AUD = "forge-client";

function getSecrets(): string[] {
  return (process.env.JWT_SECRET ?? "dev-secret").split(",").map(s => s.trim()).filter(Boolean);
}

function b64url(s: string): string {
  return Buffer.from(s).toString("base64url");
}

function sign(header: string, payload: string, secret: string): string {
  return createHmac("sha256", secret).update(`${header}.${payload}`).digest("base64url");
}

export type JwtPayload = { sub: string; iat: number; exp: number; nbf?: number; iss?: string; aud?: string };

export function signJwt(sub: string, expiresInSeconds = 86400): string {
  const now = Math.floor(Date.now() / 1000);
  const payload: JwtPayload = { sub, iat: now, exp: now + expiresInSeconds, iss: ISS, aud: AUD };
  const h = b64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const p = b64url(JSON.stringify(payload));
  const [first] = getSecrets();
  return `${h}.${p}.${sign(h, p, first)}`;
}

export function verifyJwt(token: string): JwtPayload {
  const parts = token.split(".");
  if (parts.length !== 3) throw new Error("malformed jwt");
  const [h, p, sig] = parts;
  const secrets = getSecrets();
  let payload: JwtPayload;
  try {
    payload = JSON.parse(Buffer.from(p, "base64url").toString());
  } catch {
    throw new Error("malformed payload");
  }
  const now = Math.floor(Date.now() / 1000);
  let valid = false;
  for (const secret of secrets) {
    const expected = sign(h, p, secret);
    try {
      if (timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) {
        valid = true;
        break;
      }
    } catch {
      /* length mismatch */
    }
  }
  if (!valid) throw new Error("invalid signature");
  if (payload.exp < now) throw new Error("token expired");
  if (payload.nbf !== undefined && payload.nbf > now) throw new Error("token not yet valid");
  if (payload.iss && payload.iss !== ISS) throw new Error("invalid issuer");
  if (payload.aud && payload.aud !== AUD) throw new Error("invalid audience");
  return payload;
}
