import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { getSettings } from "@/lib/settings";
import { convert } from "@/lib/currency";

export const dynamic = "force-dynamic";

/** Ventana de días admitida para el gráfico de ventas. */
const RANGES = [7, 14, 30, 90] as const;
type Range = (typeof RANGES)[number];

function parseRange(value: string | null): Range {
  const n = Number(value);
  return (RANGES as readonly number[]).includes(n) ? (n as Range) : 14;
}

/**
 * Estadísticas del panel.
 *
 * TODOS los importes (ingresos, ticket medio, inventario, margen, gráfico de
 * ventas y ranking por categoría) se expresan en la moneda que el dueño elige
 * para el panel — `displayCurrency`, la misma de la tienda. Los campos *Usd se
 * mantienen porque el reporte impreso/PDF los usa como referencia interna.
 */
export async function GET(request: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const settings = await getSettings();
  const url = new URL(request.url);
  const range = parseRange(url.searchParams.get("days"));

  // Moneda del panel: el dueño puede mirar TODAS las estadísticas en cualquier
  // moneda que tenga configurada, sin cambiarla para la tienda. Si no pide
  // ninguna (o pide una que ya no existe), se usa la moneda de visualización.
  const requested = (url.searchParams.get("currency") ?? "").toUpperCase();
  const known = new Set(settings.currencies.map((c) => c.code.toUpperCase()));
  const display = known.has(requested) ? requested : settings.displayCurrency;

  const [reservations, products, users, categories] = await Promise.all([
    prisma.reservation.findMany({
      select: {
        id: true,
        status: true,
        currency: true,
        total: true,
        createdAt: true,
        deliveryType: true,
        paymentMethod: true,
        items: {
          select: { name: true, quantity: true, orderCurrency: true, priceConverted: true },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.product.findMany({
      select: {
        id: true,
        name: true,
        brand: true,
        category: true,
        stock: true,
        visible: true,
        price: true,
        costCup: true,
        currency: true,
      },
    }),
    prisma.user.findMany({ select: { id: true, createdAt: true, role: true } }),
    prisma.category.count(),
  ]);

  const toUsd = (amount: number, from: string) =>
    convert(amount, from, "USD", settings.currencies);
  const toDisplay = (amount: number, from: string) =>
    convert(amount, from, display, settings.currencies);
  /** Un importe ya en USD (como el costo de inventario) a la moneda del panel. */
  const usdToDisplay = (amount: number) => convert(amount, "USD", display, settings.currencies);

  const paid = reservations.filter((r) => r.status !== "CANCELLED");

  const revenue = paid.reduce((s, r) => s + toDisplay(Number(r.total), r.currency), 0);
  const revenueUsd = paid.reduce((s, r) => s + toUsd(Number(r.total), r.currency), 0);
  const avgTicket = paid.length ? revenueUsd / paid.length : 0;
  const avgTicketDisplay = paid.length ? revenue / paid.length : 0;

  const byStatus: Record<string, number> = {};
  for (const r of reservations) byStatus[r.status] = (byStatus[r.status] ?? 0) + 1;

  const byDelivery: Record<string, number> = {};
  const byPayment: Record<string, number> = {};
  for (const r of reservations) {
    byDelivery[r.deliveryType] = (byDelivery[r.deliveryType] ?? 0) + 1;
    byPayment[r.paymentMethod] = (byPayment[r.paymentMethod] ?? 0) + 1;
  }

  // Ventas por día en la moneda del panel, para la ventana pedida (7/14/30/90).
  const days: { date: string; total: number; count: number }[] = [];
  const bucket = new Map<string, { total: number; count: number }>();
  for (const r of paid) {
    const key = r.createdAt.toISOString().slice(0, 10);
    const prev = bucket.get(key) ?? { total: 0, count: 0 };
    bucket.set(key, {
      total: prev.total + toDisplay(Number(r.total), r.currency),
      count: prev.count + 1,
    });
  }
  const today = new Date();
  for (let i = range - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    const b = bucket.get(key);
    days.push({ date: key, total: Math.round((b?.total ?? 0) * 100) / 100, count: b?.count ?? 0 });
  }

  // Ranking de productos, marcas y categorías vendidas.
  const soldMap = new Map<string, number>();
  const brandMap = new Map<string, number>();
  const catMap = new Map<string, { quantity: number; revenueUsd: number; revenueDisplay: number }>();
  const productBrand = new Map(products.map((p) => [p.name, p.brand]));
  const productCat = new Map(products.map((p) => [p.name, p.category]));
  for (const r of paid) {
    for (const it of r.items) {
      soldMap.set(it.name, (soldMap.get(it.name) ?? 0) + it.quantity);
      const brand = productBrand.get(it.name);
      if (brand) brandMap.set(brand, (brandMap.get(brand) ?? 0) + it.quantity);
      const cat = productCat.get(it.name) ?? "Sin categoría";
      const prev = catMap.get(cat) ?? { quantity: 0, revenueUsd: 0, revenueDisplay: 0 };
      catMap.set(cat, {
        quantity: prev.quantity + it.quantity,
        revenueUsd:
          prev.revenueUsd + toUsd(Number(it.priceConverted), it.orderCurrency) * it.quantity,
        revenueDisplay:
          prev.revenueDisplay +
          toDisplay(Number(it.priceConverted), it.orderCurrency) * it.quantity,
      });
    }
  }

  const topProducts = [...soldMap.entries()]
    .map(([name, quantity]) => ({ name, quantity }))
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 6);

  const topBrands = [...brandMap.entries()]
    .map(([name, quantity]) => ({ name, quantity }))
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 5);

  const topCategories = [...catMap.entries()]
    .map(([name, v]) => ({
      name,
      quantity: v.quantity,
      revenueUsd: Math.round(v.revenueUsd * 100) / 100,
      revenueDisplay: Math.round(v.revenueDisplay * 100) / 100,
    }))
    .sort((a, b) => b.revenueDisplay - a.revenueDisplay)
    .slice(0, 5);

  const lowStock = products
    .filter((p) => p.stock !== null && p.stock <= 3)
    .map((p) => ({ id: p.id, name: p.name, stock: p.stock ?? 0 }))
    .sort((a, b) => a.stock - b.stock);

  // Valor del inventario a precio de venta y al costo, en la moneda del panel.
  // El costo de compra se carga en CUP, igual que el precio de venta.
  const inventoryCostCup = products.reduce(
    (s, p) => s + Number(p.costCup ?? 0) * (p.stock ?? 0),
    0,
  );
  const inventoryRetailUsd = products.reduce(
    (s, p) => s + (p.stock ? toUsd(Number(p.price), p.currency) * p.stock : 0),
    0,
  );
  const inventoryCostUsd = toUsd(inventoryCostCup, "CUP");
  const inventoryCost = toDisplay(inventoryCostCup, "CUP");
  const inventoryRetail = usdToDisplay(inventoryRetailUsd);

  const since30 = new Date(today);
  since30.setDate(today.getDate() - 30);
  const newUsers30 = users.filter((u) => u.createdAt >= since30).length;

  const rangeRevenueUsd = days.reduce((s, d) => s + d.total, 0);
  const rangeCount = days.reduce((s, d) => s + d.count, 0);
  const rangeRevenue = rangeRevenueUsd;

  return NextResponse.json({
    currency: display,
    /** Monedas que el dueño puede elegir para mirar las estadísticas. */
    currencies: settings.currencies.map((c) => ({ code: c.code, symbol: c.symbol, label: c.label })),
    defaultCurrency: settings.displayCurrency,
    range,
    ranges: RANGES,
    cards: {
      revenue,
      revenueUsd,
      avgTicket: Math.round(avgTicketDisplay * 100) / 100,
      avgTicketUsd: Math.round(avgTicket * 100) / 100,
      reservations: reservations.length,
      pending: byStatus.PENDING ?? 0,
      confirmed: byStatus.CONFIRMED ?? 0,
      delivered: byStatus.DELIVERED ?? 0,
      cancelled: byStatus.CANCELLED ?? 0,
      users: users.length,
      admins: users.filter((u) => u.role === "ADMIN").length,
      newUsers30,
      products: products.length,
      hiddenProducts: products.filter((p) => !p.visible).length,
      categories,
      lowStock: lowStock.length,
      inventoryCostUsd: Math.round(inventoryCostUsd * 100) / 100,
      inventoryRetailUsd: Math.round(inventoryRetailUsd * 100) / 100,
      inventoryCost: Math.round(inventoryCost * 100) / 100,
      inventoryRetail: Math.round(inventoryRetail * 100) / 100,
      rangeRevenue: Math.round(rangeRevenue * 100) / 100,
      rangeRevenueUsd: Math.round(rangeRevenueUsd * 100) / 100,
      rangeCount,
    },
    byStatus,
    byDelivery,
    byPayment,
    days,
    topProducts,
    topBrands,
    topCategories,
    lowStock,
  });
}
