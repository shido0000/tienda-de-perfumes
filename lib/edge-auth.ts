import { jwtVerify } from "jose";

/**
 * Token verification that works in middleware.
 *
 * Next.js middleware runs on the EDGE runtime, which has no Node crypto, so
 * `jsonwebtoken` throws on every request there. The failure is nasty because
 * it looks like a login bug: the API returns 200 and sets the cookie, then the
 * middleware rejects the token and redirects to /login forever.
 *
 * `jose` is Edge-native. Use this in middleware.ts and lib/auth.ts everywhere
 * else.
 */
export async function verifyTokenEdge(
  token: string | undefined,
): Promise<string | null> {
  if (!token) return null;

  const configured = process.env.JWT_SECRET;
  if (
    process.env.NODE_ENV === "production" &&
    (!configured || configured === "dev-secret-change-me")
  ) {
    return null;
  }

  try {
    const secret = new TextEncoder().encode(configured || "dev-secret-change-me");
    const { payload } = await jwtVerify(token, secret);
    return (payload.sub as string) ?? null;
  } catch {
    return null;
  }
}
