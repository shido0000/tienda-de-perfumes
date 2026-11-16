import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { z } from "zod";

export const dynamic = "force-dynamic";

const schema = z.object({
  summary: z.string().max(600),
  itemCount: z.number().int().min(0).max(999),
  total: z.number().min(0).max(1_000_000_000),
  currency: z.string().min(2).max(6),
  /// "recovered" marca el intento como cerrado (la reserva se confirmó).
  outcome: z.enum(["open", "recovered"]).optional(),
});

/**
 * Registra que alguien llegó al pago con un carrito armado. Si no confirma, el
 * panel lo lista como "llegó al pago y no terminó" con su WhatsApp a mano.
 */
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ ok: true });

  const profile = await prisma.user.findUnique({
    where: { id: user.id },
    select: { name: true, email: true, phone: true },
  });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: true });
  const { summary, itemCount, total, currency, outcome } = parsed.data;

  if (outcome === "recovered") {
    await prisma.checkoutIntent.updateMany({
      where: { userId: user.id, status: "OPEN" },
      data: { status: "RECOVERED" },
    });
    return NextResponse.json({ ok: true });
  }

  if (itemCount === 0) return NextResponse.json({ ok: true });

  // Un solo intento abierto por cliente: se refresca el resumen, no se duplica.
  const open = await prisma.checkoutIntent.findFirst({
    where: { userId: user.id, status: "OPEN" },
    select: { id: true },
  });

  const data = {
    name: profile?.name ?? null,
    email: profile?.email ?? null,
    phone: profile?.phone ?? null,
    summary: summary.slice(0, 600),
    itemCount,
    total,
    currency,
  };

  if (open) {
    await prisma.checkoutIntent.update({ where: { id: open.id }, data });
  } else {
    await prisma.checkoutIntent.create({ data: { ...data, userId: user.id, status: "OPEN" } });
  }

  return NextResponse.json({ ok: true });
}
