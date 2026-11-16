import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/session";

export const dynamic = "force-dynamic";

const DAY_MS = 24 * 60 * 60 * 1000;
/** Ventana "hace ~2 meses": entre 55 y 80 días desde la entrega. */
const MIN_DAYS = 55;
const MAX_DAYS = 80;

/**
 * Recordatorio de reposición.
 *
 * Si alguien compró un frasco hace unos dos meses, probablemente ya se le esté
 * terminando. Devuelve esas compras con el cliente, el perfume y un mensaje
 * suave ya redactado ("¿ya se te está terminando?") para escribirle por
 * WhatsApp con un clic. Se mide desde que la reserva quedó ENTREGADA.
 */
export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const now = Date.now();
  const from = new Date(now - MAX_DAYS * DAY_MS);
  const to = new Date(now - MIN_DAYS * DAY_MS);

  const reservations = await prisma.reservation.findMany({
    where: {
      status: "DELIVERED",
      updatedAt: { gte: from, lt: to },
    },
    orderBy: { updatedAt: "desc" },
    include: {
      items: { select: { name: true } },
      user: { select: { name: true, email: true, phone: true } },
    },
    take: 300,
  });

  // Un aviso por cliente (no por perfume): si compró dos cosas, se le nombran
  // ambas en el mensaje.
  const byUser = new Map<
    string,
    {
      customer: string;
      phone: string | null;
      code: string;
      products: string[];
      daysSince: number;
    }
  >();

  for (const r of reservations) {
    const key = r.userId;
    const products = r.items.map((i) => i.name);
    const daysSince = Math.floor((now - r.updatedAt.getTime()) / DAY_MS);
    const prev = byUser.get(key);
    if (prev) {
      prev.products.push(...products.filter((p) => !prev.products.includes(p)));
      continue;
    }
    byUser.set(key, {
      customer: r.user.name || r.user.email,
      phone: r.user.phone,
      code: r.code,
      products,
      daysSince,
    });
  }

  return NextResponse.json({
    reminders: [...byUser.values()].map((c) => ({
      customer: c.customer,
      phone: c.phone,
      products: c.products.join(" · "),
      daysSince: c.daysSince,
      message:
        `Hola ${c.customer.split(" ")[0]}! ¿Cómo va todo? Te escribimos de la tienda: ` +
        `¿ya se te está terminando ${c.products.join(" / ")}? ` +
        `Si querés reponerlo, te lo reservamos y lo dejamos listo. ` +
        `(Tu reserva anterior fue ${c.code}.)`,
    })),
  });
}
