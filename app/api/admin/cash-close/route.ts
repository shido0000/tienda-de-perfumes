import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/session";

export const dynamic = "force-dynamic";

/**
 * Cierre de caja del día: cuántas reservas entraron, cuánto representan, qué se
 * vendió más y qué falta reponer. Se arma con el mismo criterio que el
 * dashboard (las canceladas no cuentan) para que ambos números coincidan.
 *
 * Parámetro opcional `?date=YYYY-MM-DD` (por defecto hoy).
 */
export async function GET(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const url = new URL(req.url);
  const dateParam = url.searchParams.get("date");
  const day = dateParam ? new Date(`${dateParam}T00:00:00`) : new Date();
  if (Number.isNaN(day.getTime())) {
    return NextResponse.json({ error: "Fecha inválida" }, { status: 400 });
  }
  const start = new Date(day);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(start.getDate() + 1);

  const [reservations, products] = await Promise.all([
    prisma.reservation.findMany({
      where: { createdAt: { gte: start, lt: end } },
      include: {
        items: true,
        user: { select: { name: true, email: true } },
      },
      orderBy: { createdAt: "asc" },
    }),
    prisma.product.findMany({
      select: { id: true, name: true, stock: true },
    }),
  ]);

  const active = reservations.filter((r) => r.status !== "CANCELLED");
  const cancelled = reservations.filter((r) => r.status === "CANCELLED");

  // Los importes pueden venir en monedas distintas: se agrupan por moneda para
  // no sumar peras con manzanas.
  const byCurrency: Record<string, number> = {};
  for (const r of active) {
    byCurrency[r.currency] = (byCurrency[r.currency] ?? 0) + Number(r.total);
  }

  const byPayment: Record<string, number> = {};
  for (const r of active) byPayment[r.paymentMethod] = (byPayment[r.paymentMethod] ?? 0) + 1;

  const sold = new Map<string, { name: string; quantity: number }>();
  for (const r of active) {
    for (const it of r.items) {
      const prev = sold.get(it.name) ?? { name: it.name, quantity: 0 };
      prev.quantity += it.quantity;
      sold.set(it.name, prev);
    }
  }
  const topProducts = [...sold.values()].sort((a, b) => b.quantity - a.quantity).slice(0, 6);

  const lowStock = products
    .filter((p) => p.stock !== null && p.stock <= 3)
    .map((p) => ({ id: p.id, name: p.name, stock: p.stock ?? 0 }))
    .sort((a, b) => a.stock - b.stock);

  const pendingProof = reservations.filter(
    (r) => r.status === "PENDING" && r.paymentMethod === "TRANSFER" && !r.transferProofUrl,
  ).length;

  return NextResponse.json({
    date: start.toISOString().slice(0, 10),
    count: active.length,
    cancelled: cancelled.length,
    byCurrency,
    byPayment,
    totalItems: active.reduce((n, r) => n + r.items.reduce((m, i) => m + i.quantity, 0), 0),
    topProducts,
    lowStock,
    pendingProof,
    reservations: active.map((r) => ({
      id: r.id,
      code: r.code,
      customer: r.user.name || r.user.email,
      total: Number(r.total),
      currency: r.currency,
      status: r.status,
      paymentMethod: r.paymentMethod,
    })),
  });
}
