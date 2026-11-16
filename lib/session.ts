import { cookies } from "next/headers";
import { AUTH_COOKIE, verifyToken } from "./auth";
import { prisma } from "./db";

export type SessionUser = {
  id: string;
  email: string;
  name: string | null;
  role: string;
};

/**
 * Who is calling, from the cookie only.
 *
 * NEVER derive the user from a request body or query parameter. An id the
 * caller supplies is an id the caller can change, which is how one account
 * ends up reading another's rows.
 */
export async function getCurrentUser(): Promise<SessionUser | null> {
  const token = cookies().get(AUTH_COOKIE)?.value;
  const userId = verifyToken(token);
  if (!userId) return null;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, name: true, role: true },
  });
  return user ?? null;
}

/** Throws-nothing guard for API routes: returns null when unauthenticated. */
export async function requireUser(): Promise<SessionUser | null> {
  return getCurrentUser();
}

export async function isAdmin(): Promise<boolean> {
  const user = await getCurrentUser();
  return user?.role === "ADMIN";
}

/**
 * Server-side admin guard for API routes. Role is re-read from the database on
 * every call — a cookie only proves identity, never authority.
 */
export async function requireAdmin(): Promise<SessionUser | null> {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") return null;
  return user;
}
