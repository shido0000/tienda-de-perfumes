import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/session";

export const dynamic = "force-dynamic";

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Reservas listas para retirar hace más de 3 días y que el cliente todavía no
 * pasó a buscar. Se miden desde el último cambio de estado (`updatedAt`), que
 * es el momento en que la tienda avisó "está lista".
 *
 * Devuelve lo necesario para mostrar el recordatorio en Alertas y abrir
 * WhatsApp con el mensaje ya escrito, sin que el dueño tenga que buscarlo.
 */
export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const cutoff = new Date(Date.now() - 3 * DAY_MS);

  const reservations = await prisma.reservation.findMany({
    where: {
      status: { in: ["CONFIRMED", "PREPARING"] },
      deliveryType: "PICKUP",
      updatedAt: { lt: cutoff },
    },
    orderBy: { updatedAt: "asc" },
    include: {
      items: { select: { name: true } },
      user: { select: { name: true, email: true, phone: true } },
    },
  });

  const now = Date.now();

  return NextResponse.json({
    reservations: reservations.map((r) => ({
      id: r.id,
      code: r.code,
      customer: r.user.name || r.user.email,
      phone: r.user.phone,
      productNames: r.items.map((i) => i.name).join(", "),
      daysWaiting: Math.floor((now - r.updatedAt.getTime()) / DAY_MS),
      updatedAt: r.updatedAt.toISOString(),
    })),
  });
}
