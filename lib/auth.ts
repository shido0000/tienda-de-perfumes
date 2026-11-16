import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

/**
 * Password hashing and token signing. NODE RUNTIME ONLY — both libraries need
 * Node's crypto, so never import this from middleware.ts (see lib/edge-auth.ts).
 */

const SECRET = process.env.JWT_SECRET || "dev-secret-change-me";
const TOKEN_TTL = "7d";

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
  return jwt.sign({ sub: userId }, SECRET, { expiresIn: TOKEN_TTL });
}

/** Returns the user id, or null when the token is missing or invalid. */
export function verifyToken(token: string | undefined): string | null {
  if (!token) return null;
  try {
    const payload = jwt.verify(token, SECRET) as { sub?: string };
    return payload.sub ?? null;
  } catch {
    return null;
  }
}

export const AUTH_COOKIE = "auth_token";
