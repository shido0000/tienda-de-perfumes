import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getGoogleClientId, verifyGoogleIdToken } from "@/lib/google-auth";
import { hashPassword } from "@/lib/auth";
import { setAuthCookie } from "@/lib/auth-cookie";
import { clientIp, rateLimit, tooManyRequests } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const schema = z.object({
  credential: z.string().min(10),
  nonce: z.string().min(10),
});

const userSelect = {
  id: true,
  email: true,
  name: true,
  role: true,
};

function isUniqueError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "P2002"
  );
}

export async function POST(req: Request) {
  if (!getGoogleClientId()) {
    return NextResponse.json(
      { error: "El ingreso con Google todavía no está configurado." },
      { status: 503 },
    );
  }

  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  }

  const gate = rateLimit(`google:${clientIp(req)}`, 20, 5 * 60_000);
  if (!gate.ok) return tooManyRequests(gate.retryAfterSeconds);

  let identity;
  try {
    identity = await verifyGoogleIdToken(parsed.data.credential, parsed.data.nonce);
  } catch {
    return NextResponse.json(
      { error: "No pudimos verificar tu cuenta de Google." },
      { status: 401 },
    );
  }

  const normalizedEmail = identity.email.trim().toLowerCase();
  const emails = [...new Set([normalizedEmail, identity.email.trim()])];

  try {
    let user = await prisma.user.findUnique({
      where: { googleSub: identity.sub },
      select: userSelect,
    });

    if (!user) {
      for (const email of emails) {
        const byEmail = await prisma.user.findUnique({
          where: { email },
          select: userSelect,
        });
        if (!byEmail) continue;
        try {
          user = await prisma.user.update({
            where: { id: byEmail.id },
            data: { googleSub: identity.sub },
            select: userSelect,
          });
        } catch (error) {
          if (!isUniqueError(error)) throw error;
          user = await prisma.user.findUnique({
            where: { googleSub: identity.sub },
            select: userSelect,
          });
        }
        break;
      }
    }

    if (!user) {
      const unusableHash = await hashPassword(randomBytes(32).toString("hex"));
      try {
        user = await prisma.user.create({
          data: {
            email: normalizedEmail,
            name: identity.name,
            googleSub: identity.sub,
            passwordHash: unusableHash,
            passwordSet: false,
          },
          select: userSelect,
        });
      } catch (error) {
        if (!isUniqueError(error)) throw error;
        user = await prisma.user.findUnique({
          where: { googleSub: identity.sub },
          select: userSelect,
        });
        if (!user) {
          for (const email of emails) {
            user = await prisma.user.findUnique({
              where: { email },
              select: userSelect,
            });
            if (user) break;
          }
        }
      }
    }

    if (!user) {
      return NextResponse.json(
        { error: "No pudimos crear tu cuenta." },
        { status: 409 },
      );
    }

    const res = NextResponse.json({ user });
    return setAuthCookie(res, user.id, req);
  } catch (error) {
    console.error("[auth/google]", (error as Error).message);
    return NextResponse.json(
      { error: "No pudimos completar el ingreso con Google." },
      { status: 500 },
    );
  }
}
