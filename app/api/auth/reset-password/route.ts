import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/auth";
import { hashPasswordResetToken } from "@/lib/password-reset";
import { clientIp, rateLimit, tooManyRequests } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const schema = z.object({
  token: z.string().min(20),
  password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres"),
});

export async function POST(req: Request) {
  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Datos inválidos" },
      { status: 400 },
    );
  }

  const ipGate = rateLimit(`reset-ip:${clientIp(req)}`, 10, 10 * 60_000);
  if (!ipGate.ok) return tooManyRequests(ipGate.retryAfterSeconds);

  const tokenHash = hashPasswordResetToken(parsed.data.token);
  const tokenGate = rateLimit(`reset-token:${tokenHash.slice(0, 12)}`, 10, 10 * 60_000);
  if (!tokenGate.ok) return tooManyRequests(tokenGate.retryAfterSeconds);

  try {
    const row = await prisma.passwordResetToken.findUnique({
      where: { tokenHash },
      select: { userId: true },
    });
    const invalid = { error: "El link no es válido o ya venció." };
    if (!row) return NextResponse.json(invalid, { status: 400 });

    const now = new Date();
    const consumed = await prisma.passwordResetToken.updateMany({
      where: {
        tokenHash,
        usedAt: null,
        expiresAt: { gt: now },
      },
      data: { usedAt: now },
    });
    if (consumed.count !== 1) return NextResponse.json(invalid, { status: 400 });

    const passwordHash = await hashPassword(parsed.data.password);
    await prisma.user.update({
      where: { id: row.userId },
      data: { passwordHash },
    });
    await prisma.passwordResetToken.updateMany({
      where: { userId: row.userId, usedAt: null },
      data: { usedAt: now },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[reset-password]", (error as Error).message);
    return NextResponse.json(
      { error: "No pudimos cambiar la contraseña." },
      { status: 500 },
    );
  }
}
