import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { sendEmail } from "@/lib/email";
import {
  createPasswordResetToken,
  getCanonicalSiteUrl,
} from "@/lib/password-reset";
import { clientIp, rateLimit, tooManyRequests } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const schema = z.object({
  email: z.string().email("Ingresá un email válido"),
});

const TOKEN_TTL_MS = 30 * 60_000;
const MAX_ACTIVE_TOKENS = 3;

export async function POST(req: Request) {
  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ ok: true });
  }

  const ip = clientIp(req);
  const ipGate = rateLimit(`forgot-ip:${ip}`, 10, 10 * 60_000);
  if (!ipGate.ok) return tooManyRequests(ipGate.retryAfterSeconds);

  const email = parsed.data.email.trim();
  const emailGate = rateLimit(`forgot-email:${ip}:${email.toLowerCase()}`, 5, 10 * 60_000);
  if (!emailGate.ok) return tooManyRequests(emailGate.retryAfterSeconds);

  try {
    const candidates = [...new Set([email, email.toLowerCase()])];
    let user = null;
    for (const candidate of candidates) {
      user = await prisma.user.findUnique({ where: { email: candidate } });
      if (user) break;
    }

    if (user) {
      const recentCount = await prisma.passwordResetToken.count({
        where: {
          userId: user.id,
          usedAt: null,
          expiresAt: { gt: new Date() },
          createdAt: { gt: new Date(Date.now() - 60 * 60_000) },
        },
      });

      if (recentCount < MAX_ACTIVE_TOKENS) {
        const baseUrl = await getCanonicalSiteUrl();
        if (baseUrl) {
          const { token, tokenHash } = createPasswordResetToken();
          const now = new Date();

          await prisma.passwordResetToken.updateMany({
            where: { userId: user.id, usedAt: null },
            data: { usedAt: now },
          });
          await prisma.passwordResetToken.create({
            data: {
              userId: user.id,
              tokenHash,
              expiresAt: new Date(now.getTime() + TOKEN_TTL_MS),
            },
          });

          const link = new URL("/recuperar/nueva", baseUrl);
          link.searchParams.set("token", token);
          const settings = await getSettings().catch(() => null);
          const brand = settings?.brand || "Mist & Mood";

          await sendEmail({
            to: user.email,
            subject: `Restablecé tu contraseña en ${brand}`,
            text: [
              `Hola${user.name ? ` ${user.name}` : ""}:`,
              "",
              `Recibimos una solicitud para cambiar la contraseña de tu cuenta en ${brand}.`,
              `Abrí este link dentro de los próximos 30 minutos:`,
              link.toString(),
              "",
              "Si no fuiste vos, ignorá este correo y tu contraseña seguirá igual.",
            ].join("\n"),
          });
        }
      }
    }
  } catch (error) {
    console.error("[forgot-password]", (error as Error).message);
  }

  return NextResponse.json({ ok: true });
}
