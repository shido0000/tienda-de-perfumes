import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/session";

export const dynamic = "force-dynamic";

/**
 * Segmentos de clientes para reusar una plantilla de WhatsApp con otro público.
 *
 * Cada segmento devuelve a quiénes incluye y sus teléfonos, para que el mensaje
 * guardado se pueda mandar por WhatsApp a otro grupo sin volver a escribirlo.
 * Los números salen de datos reales: cuentas con teléfono cargado y personas de
 * la lista de espera que dejaron su número.
 */
export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const [users, reservations, waitlist] = await Promise.all([
    prisma.user.findMany({
      where: { phone: { not: null } },
      select: { id: true, name: true, phone: true, createdAt: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.reservation.findMany({
      select: { userId: true, total: true, currency: true, createdAt: true },
    }),
    prisma.launchWaitlist.findMany({
      where: { phone: { not: null } },
      select: { id: true, name: true, phone: true },
    }),
  ]);

  const buyers = new Set(reservations.map((r) => r.userId));
  const sinceMs = Date.now() - 90 * 24 * 60 * 60 * 1000;
  const recentBuyers = new Set(
    reservations.filter((r) => r.createdAt.getTime() >= sinceMs).map((r) => r.userId),
  );

  const build = (rows: { name: string | null; phone: string | null }[]) => {
    const phones = Array.from(
      new Set(
        rows
          .map((r) => (r.phone ?? "").replace(/[^\d+]/g, "").trim())
          .filter((p) => p.replace(/\D/g, "").length >= 6),
      ),
    );
    return { count: phones.length, phones };
  };

  const allWithPhone = build(users);

  return NextResponse.json({
    segments: [
      {
        id: "all",
        label: "Todos los clientes con teléfono",
        description: "Cuentas creadas que cargaron su número.",
        ...allWithPhone,
      },
      {
        id: "buyers",
        label: "Clientes que ya reservaron",
        description: "Les compraste antes: el mensaje de recompra funciona mejor acá.",
        ...build(users.filter((u) => buyers.has(u.id))),
      },
      {
        id: "recent-buyers",
        label: "Compraron en los últimos 90 días",
        description: "Clientes activos, los más propensos a volver.",
        ...build(users.filter((u) => recentBuyers.has(u.id))),
      },
      {
        id: "never-bought",
        label: "Se registraron y nunca reservaron",
        description: "Para empujarlos con una oferta de primera compra.",
        ...build(users.filter((u) => !buyers.has(u.id))),
      },
      {
        id: "waitlist",
        label: "Lista de espera de lanzamientos",
        description: "Dejaron su número esperando novedades.",
        ...build(waitlist),
      },
    ],
  });
}
