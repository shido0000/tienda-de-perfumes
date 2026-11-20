import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { getSettings } from "@/lib/settings";
import { round2 } from "@/lib/currency";

export const dynamic = "force-dynamic";

/**
 * Estadísticas del gestor autenticado.
 *
 * Solo devuelve datos del PROPIO gestor: el id sale de la sesión, nunca del
 * cuerpo ni de la URL. Un gestor no puede pedir las cifras de otro.
 *
 * Qué entrega:
 * - Ganancias: ganado, pagado y pendiente (de sus reservas no canceladas).
 * - Personas que entraron por su enlace (visitantes únicos) y cuántas de ellas
 *   compraron (compradores únicos), con la conversión.
 * - Series de los últimos 30 días (visitas) y 6 meses (ventas/comisión).
 * - Los perfumes más vendidos por su enlace.
 */

function dayKey(d: Date): string {
  const pad = (n: number) => (n < 10 ? `0${n}` : String(n));
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function monthKey(d: Date): string {
  const pad = (n: number) => (n < 10 ? `0${n}` : String(n));
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (user.role !== "GESTOR") {
    return NextResponse.json({ error: "Esta sección es solo para gestores." }, { status: 403 });
  }

  const manager = await prisma.user.findUnique({
    where: { id: user.id },
    select: {
      id: true,
      name: true,
      email: true,
      managerCode: true,
      managerRateType: true,
      managerRateValue: true,
      managerActive: true,
    },
  });
  if (!manager) return NextResponse.json({ error: "Gestor no encontrado" }, { status: 404 });

  const settings = await getSettings().catch(() => null);
  const currency = settings?.displayCurrency ?? "CUP";
  const baseCurrency = settings?.baseCurrency ?? "CUP";

  const now = new Date();
  const since30 = new Date(now);
  since30.setDate(now.getDate() - 29);
  since30.setHours(0, 0, 0, 0);

  const [reservations, visits, payouts] = await Promise.all([
    prisma.reservation.findMany({
      where: { managerId: manager.id },
      select: {
        id: true,
        status: true,
        total: true,
        currency: true,
        managerCommission: true,
        managerSurcharge: true,
        payoutId: true,
        userId: true,
        createdAt: true,
        items: { select: { name: true, brand: true, quantity: true, priceConverted: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.managerVisit.findMany({
      where: { managerId: manager.id },
      select: { visitorId: true, userId: true, day: true, createdAt: true },
    }),
    prisma.managerPayout.aggregate({
      where: { managerId: manager.id },
      _sum: { amount: true },
    }),
  ]);

  const valid = reservations.filter((r) => r.status !== "CANCELLED");

  const earned = round2(valid.reduce((s, r) => s + Number(r.managerCommission), 0));
  const paid = round2(Number(payouts._sum.amount ?? 0));
  const pending = round2(earned - paid);
  const surcharge = round2(valid.reduce((s, r) => s + Number(r.managerSurcharge), 0));
  const salesTotal = round2(valid.reduce((s, r) => s + Number(r.total), 0));

  // ---- Personas -----------------------------------------------------------
  const uniqueVisitors = new Set(visits.map((v) => v.visitorId)).size;
  const buyers = new Set(valid.map((r) => r.userId)).size;
  // Visitantes con cuenta iniciada (identificados), aunque no hayan comprado.
  const signedInVisitors = new Set(
    visits.filter((v) => v.userId).map((v) => v.userId as string),
  ).size;
  const conversion = uniqueVisitors > 0 ? round2((buyers / uniqueVisitors) * 100) : 0;

  // ---- Serie diaria de visitas (últimos 30 días) --------------------------
  const visitsByDay = new Map<string, Set<string>>();
  for (const v of visits) {
    if (v.createdAt < since30) continue;
    const key = v.day;
    const set = visitsByDay.get(key) ?? new Set<string>();
    set.add(v.visitorId);
    visitsByDay.set(key, set);
  }
  const dailyVisits: { day: string; label: string; count: number }[] = [];
  for (let i = 0; i < 30; i++) {
    const d = new Date(since30);
    d.setDate(since30.getDate() + i);
    const key = dayKey(d);
    dailyVisits.push({
      day: key,
      label: `${d.getDate()}/${d.getMonth() + 1}`,
      count: visitsByDay.get(key)?.size ?? 0,
    });
  }

  // ---- Serie mensual de ventas (últimos 6 meses) -------------------------
  const monthlyStart = new Date(now.getFullYear(), now.getMonth() - 5, 1);
  const salesByMonth = new Map<string, { count: number; commission: number; total: number }>();
  for (const r of valid) {
    if (r.createdAt < monthlyStart) continue;
    const key = monthKey(r.createdAt);
    const row = salesByMonth.get(key) ?? { count: 0, commission: 0, total: 0 };
    row.count += 1;
    row.commission = round2(row.commission + Number(r.managerCommission));
    row.total = round2(row.total + Number(r.total));
    salesByMonth.set(key, row);
  }
  const monthly: { key: string; label: string; count: number; commission: number; total: number }[] = [];
  const monthNames = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
  for (let i = 0; i < 6; i++) {
    const d = new Date(monthlyStart.getFullYear(), monthlyStart.getMonth() + i, 1);
    const key = monthKey(d);
    const row = salesByMonth.get(key) ?? { count: 0, commission: 0, total: 0 };
    monthly.push({ key, label: `${monthNames[d.getMonth()]}`, ...row });
  }

  // ---- Perfumes más vendidos por su enlace -------------------------------
  const productMap = new Map<string, { name: string; brand: string; quantity: number; revenue: number }>();
  for (const r of valid) {
    for (const it of r.items) {
      const key = `${it.brand}||${it.name}`;
      const row = productMap.get(key) ?? { name: it.name, brand: it.brand, quantity: 0, revenue: 0 };
      row.quantity += it.quantity;
      row.revenue = round2(row.revenue + Number(it.priceConverted) * it.quantity);
      productMap.set(key, row);
    }
  }
  const topProducts = [...productMap.values()].sort((a, b) => b.quantity - a.quantity).slice(0, 8);

  // ---- Últimas ventas -----------------------------------------------------
  const recentSales = reservations.slice(0, 12).map((r) => ({
    id: r.id,
    status: r.status,
    total: Number(r.total),
    currency: r.currency,
    commission: Number(r.managerCommission),
    settled: Boolean(r.payoutId),
    createdAt: r.createdAt.toISOString(),
    items: r.items.map((i) => ({ name: i.name, brand: i.brand, quantity: i.quantity })),
  }));

  return NextResponse.json({
    manager: {
      name: manager.name,
      email: manager.email,
      code: manager.managerCode,
      active: manager.managerActive,
      rateType: manager.managerRateType === "FIXED" ? "FIXED" : "PERCENT",
      rateValue: Number(manager.managerRateValue ?? 0),
    },
    currency,
    baseCurrency,
    totals: {
      earned,
      paid,
      pending,
      salesCount: valid.length,
      salesTotal,
      surcharge,
      uniqueVisitors,
      buyers,
      signedInVisitors,
      conversion,
    },
    dailyVisits,
    monthly,
    topProducts,
    recentSales,
  });
}
