import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/session";

export const dynamic = "force-dynamic";

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Reservas que llevan más de 24 h sin confirmar (pago pendiente y sin
 * comprobante). Son las que inmovilizan stock y conviene liberar.
 * Devuelve además la lista de stock bajo para el bloque de alertas.
 */
export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const cutoff = new Date(Date.now() - DAY_MS);

  const [reservations, products] = await Promise.all([
    prisma.reservation.findMany({
      where: {
        status: "PENDING",
        createdAt: { lt: cutoff },
        paymentMethod: "TRANSFER",
        transferProofUrl: null,
      },
      orderBy: { createdAt: "asc" },
      take: 50,
      include: {
        items: { select: { name: true } },
        user: { select: { name: true, email: true, phone: true } },
      },
    }),
    prisma.product.findMany({
      where: { stock: { lte: 2 } },
      select: { id: true, name: true, stock: true },
      orderBy: { stock: "asc" },
      take: 20,
    }),
  ]);

  return NextResponse.json({
    reservations: reservations.map((r) => ({
      id: r.id,
      code: r.code,
      customer: r.user.name || r.user.email,
      phone: r.user.phone,
      productNames: r.items.map((i) => i.name).join(", "),
      createdAt: r.createdAt.toISOString(),
    })),
    lowStock: products
      .filter((p) => (p.stock ?? 99) <= 2)
      .map((p) => ({ id: p.id, name: p.name, stock: p.stock ?? 0 }))
      .sort((a, b) => a.stock - b.stock),
  });
}
