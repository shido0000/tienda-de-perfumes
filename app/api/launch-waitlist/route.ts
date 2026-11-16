import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { clientIp, rateLimit, tooManyRequests } from "@/lib/rate-limit";
import { z } from "zod";

export const dynamic = "force-dynamic";

const schema = z.object({
  name: z.string().max(120).optional(),
  email: z.string().email().max(160).optional().or(z.literal("")),
  phone: z.string().max(40).optional(),
  interest: z.string().max(80).optional(),
});

/**
 * Lista de espera de lanzamientos.
 *
 * El cliente deja su contacto para enterarse primero cuando llegue una novedad.
 * Se acepta correo o WhatsApp (al menos uno). Si ya existe un aviso abierto con
 * el mismo contacto, se reutiliza en vez de duplicarlo, así quien aprieta dos
 * veces no aparece dos veces en el panel.
 */
export async function POST(req: Request) {
  const limited = rateLimit(`launch:${clientIp(req)}`, 10, 60_000);
  if (!limited.ok) return tooManyRequests(limited.retryAfterSeconds);

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Revisá los datos." }, { status: 400 });
  }

  const cleanEmail = parsed.data.email?.trim().toLowerCase() || null;
  const cleanPhone = parsed.data.phone?.replace(/[^\d+]/g, "") || null;
  if (!cleanEmail && !cleanPhone) {
    return NextResponse.json(
      { error: "Dejá un correo o un WhatsApp para poder avisarte." },
      { status: 400 },
    );
  }

  const user = await getCurrentUser().catch(() => null);

  const existing = await prisma.launchWaitlist.findFirst({
    where: {
      status: { in: ["NEW", "NOTIFIED"] },
      OR: [
        ...(cleanEmail ? [{ email: cleanEmail }] : []),
        ...(cleanPhone ? [{ phone: cleanPhone }] : []),
      ],
    },
    select: { id: true },
  });

  if (existing) {
    await prisma.launchWaitlist.update({
      where: { id: existing.id },
      data: {
        name: parsed.data.name?.trim() || undefined,
        interest: parsed.data.interest?.trim() || undefined,
      },
    });
    return NextResponse.json({ ok: true, already: true });
  }

  await prisma.launchWaitlist.create({
    data: {
      userId: user?.id ?? null,
      name: parsed.data.name?.trim() || null,
      email: cleanEmail,
      phone: cleanPhone,
      interest: parsed.data.interest?.trim() || "general",
    },
  });

  return NextResponse.json({ ok: true }, { status: 201 });
}
