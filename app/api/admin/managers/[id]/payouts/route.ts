import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { round2 } from "@/lib/currency";
import { z } from "zod";

export const dynamic = "force-dynamic";

const payoutSchema = z.object({
  amount: z.number().positive("El pago debe ser mayor que cero"),
  currency: z.string().trim().min(1).default("CUP"),
  note: z.string().trim().max(200).optional(),
});

/**
 * Registra un pago al gestor y liquida sus comisiones pendientes.
 *
 * Las comisiones se liquidan de la más antigua a la más nueva hasta cubrir el
 * importe pagado: así cada reserva queda marcada (payoutId) y el panel puede
 * decir exactamente qué ventas ya están pagadas y cuáles no.
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const parsed = payoutSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Datos inválidos" },
      { status: 400 },
    );
  }
  const { amount, currency, note } = parsed.data;

  const manager = await prisma.user.findFirst({
    where: { id, role: "GESTOR" },
    select: { id: true },
  });
  if (!manager) return NextResponse.json({ error: "Gestor no encontrado" }, { status: 404 });

  // Reservas con comisión aún sin liquidar, de la más vieja a la más nueva.
  const outstanding = await prisma.reservation.findMany({
    where: {
      managerId: manager.id,
      payoutId: null,
      status: { not: "CANCELLED" },
      managerCommission: { gt: 0 },
    },
    orderBy: { createdAt: "asc" },
    select: { id: true, managerCommission: true },
  });

  const pendingTotal = round2(
    outstanding.reduce((sum, r) => sum + Number(r.managerCommission), 0),
  );
  if (pendingTotal <= 0) {
    return NextResponse.json(
      { error: "Este gestor no tiene comisiones pendientes de pago." },
      { status: 409 },
    );
  }
  if (amount > pendingTotal + 0.01) {
    return NextResponse.json(
      {
        error: `El pago supera lo pendiente (${pendingTotal.toFixed(2)}). Ajusta el importe.`,
      },
      { status: 400 },
    );
  }

  const result = await prisma.$transaction(async (tx) => {
    const payout = await tx.managerPayout.create({
      data: { managerId: manager.id, amount: round2(amount), currency, note: note || null },
      select: { id: true, amount: true, currency: true, createdAt: true },
    });

    // Marca las reservas que cubre este pago.
    let remaining = round2(amount);
    const covered: string[] = [];
    for (const r of outstanding) {
      if (remaining <= 0) break;
      const commission = Number(r.managerCommission);
      if (commission <= remaining + 0.01) {
        covered.push(r.id);
        remaining = round2(remaining - commission);
      }
    }
    if (covered.length) {
      await tx.reservation.updateMany({
        where: { id: { in: covered } },
        data: { payoutId: payout.id },
      });
    }

    return { payout, coveredCount: covered.length };
  });

  return NextResponse.json(
    {
      payout: {
        id: result.payout.id,
        amount: Number(result.payout.amount),
        currency: result.payout.currency,
        createdAt: result.payout.createdAt.toISOString(),
      },
      coveredCount: result.coveredCount,
    },
    { status: 201 },
  );
}
