import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

/**
 * Password hashing and token signing. NODE RUNTIME ONLY — both libraries need
 * Node's crypto, so never import this from middleware.ts (see lib/edge-auth.ts).
 */

const TOKEN_TTL = "7d";

function getSecret(): string {
  const configured = process.env.JWT_SECRET;
  if (
    process.env.NODE_ENV === "production" &&
    (!configured || configured === "dev-secret-change-me")
  ) {
    throw new Error("JWT_SECRET no configurado en el entorno de producción");
  }
  return configured || "dev-secret-change-me";
}

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 10);
}

export async function verifyPassword(
  plain: string,
  hash: string,
): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

export function signToken(userId: string): string {
  return jwt.sign({ sub: userId }, getSecret(), { expiresIn: TOKEN_TTL });
}

/** Returns the user id, or null when the token is missing or invalid. */
export function verifyToken(token: string | undefined): string | null {
  if (!token) return null;
  try {
    const payload = jwt.verify(token, getSecret()) as { sub?: string };
    return payload.sub ?? null;
  } catch {
    return null;
  }
}

export const AUTH_COOKIE = "auth_token";
