import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/session";

export const dynamic = "force-dynamic";

/**
 * Audiencia de la tienda para el panel de administración.
 *
 * Devuelve, en números y en listas cortas:
 * - visitantes distintos de hoy y de los últimos 7 días, separando quiénes
 *   entraron por el enlace de un gestor y quiénes llegaron directo a la tienda;
 * - los carritos que se están armando (últimos agregados), con su canal,
 *   producto, cantidad e importe, y si el cliente estaba registrado;
 * - el detalle por gestor de cuántas visitas trajo cada uno.
 *
 * Es solo lectura y solo lo ve un administrador.
 */
export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const now = new Date();
  const pad = (n: number) => (n < 10 ? `0${n}` : String(n));
  const dayKey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const today = dayKey(now);
  const since = new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000);
  since.setHours(0, 0, 0, 0);

  const [visits, cartAdds, managers] = await Promise.all([
    prisma.siteVisit.findMany({
      where: { createdAt: { gte: since } },
      orderBy: { lastSeenAt: "desc" },
      select: {
        visitorId: true,
        day: true,
        scope: true,
        managerId: true,
        userId: true,
        firstPath: true,
        hits: true,
        lastSeenAt: true,
      },
    }),
    prisma.cartAdd.findMany({
      orderBy: { createdAt: "desc" },
      take: 200,
      select: {
        id: true,
        visitorId: true,
        userId: true,
        managerId: true,
        source: true,
        productId: true,
        productName: true,
        quantity: true,
        unitPrice: true,
        currency: true,
        createdAt: true,
      },
    }),
    prisma.user.findMany({
      where: { role: "GESTOR" },
      select: { id: true, name: true, email: true, managerCode: true },
    }),
  ]);

  const managerName = new Map(managers.map((m) => [m.id, m.name ?? m.email]));

  // ---- Visitantes distintos -------------------------------------------------
  const allVisitorIds = new Set(visits.map((v) => v.visitorId));
  const managerVisitorIds = new Set(
    visits.filter((v) => v.scope === "MANAGER").map((v) => v.visitorId),
  );
  const todayVisitors = new Set(visits.filter((v) => v.day === today).map((v) => v.visitorId));
  const todayManagerVisitors = new Set(
    visits.filter((v) => v.day === today && v.scope === "MANAGER").map((v) => v.visitorId),
  );

  // Serie de los últimos 7 días: visitantes distintos por día, separando canal.
  const days: { day: string; label: string; total: number; manager: number; direct: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    const key = dayKey(d);
    const dayVisits = visits.filter((v) => v.day === key);
    const total = new Set(dayVisits.map((v) => v.visitorId)).size;
    const manager = new Set(
      dayVisits.filter((v) => v.scope === "MANAGER").map((v) => v.visitorId),
    ).size;
    days.push({
      day: key,
      label: `${d.getDate()}/${d.getMonth() + 1}`,
      total,
      manager,
      direct: Math.max(0, total - manager),
    });
  }

  // ---- Por gestor -----------------------------------------------------------
  const perManager = new Map<string, { visitors: Set<string>; today: Set<string> }>();
  for (const v of visits) {
    if (v.scope !== "MANAGER" || !v.managerId) continue;
    const entry = perManager.get(v.managerId) ?? { visitors: new Set(), today: new Set() };
    entry.visitors.add(v.visitorId);
    if (v.day === today) entry.today.add(v.visitorId);
    perManager.set(v.managerId, entry);
  }
  const byManager = [...perManager.entries()]
    .map(([id, e]) => ({
      managerId: id,
      name: managerName.get(id) ?? "Gestor",
      visitors: e.visitors.size,
      today: e.today.size,
    }))
    .sort((a, b) => b.visitors - a.visitors);

  // ---- Carritos -------------------------------------------------------------
  const userIds = [...new Set(cartAdds.map((c) => c.userId).filter(Boolean) as string[])];
  const users = userIds.length
    ? await prisma.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, name: true, email: true },
      })
    : [];
  const userById = new Map(users.map((u) => [u.id, u]));

  const items = cartAdds.map((c) => ({
    id: c.id,
    visitorId: c.visitorId,
    source: c.source as "MANAGER" | "DIRECT",
    managerName: c.managerId ? managerName.get(c.managerId) ?? "Gestor" : null,
    productId: c.productId,
    productName: c.productName,
    quantity: c.quantity,
    unitPrice: Number(c.unitPrice),
    currency: c.currency,
    createdAt: c.createdAt.toISOString(),
    customer: c.userId
      ? {
          name: userById.get(c.userId)?.name ?? null,
          email: userById.get(c.userId)?.email ?? null,
        }
      : null,
  }));

  const cartManagerCount = items.filter((i) => i.source === "MANAGER").length;
  const cartDirectCount = items.length - cartManagerCount;
  const cartVisitorIds = new Set(items.map((i) => i.visitorId));

  return NextResponse.json({
    summary: {
      visitorsToday: todayVisitors.size,
      visitorsTodayManager: todayManagerVisitors.size,
      visitorsTodayDirect: Math.max(0, todayVisitors.size - todayManagerVisitors.size),
      visitors7d: allVisitorIds.size,
      visitors7dManager: managerVisitorIds.size,
      visitors7dDirect: Math.max(0, allVisitorIds.size - managerVisitorIds.size),
      cartBrowsers: cartVisitorIds.size,
      cartAdds: items.length,
      cartAddsManager: cartManagerCount,
      cartAddsDirect: cartDirectCount,
    },
    days,
    byManager,
    carts: items,
  });
}
