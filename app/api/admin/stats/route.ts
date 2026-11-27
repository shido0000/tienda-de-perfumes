import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { getSettings } from "@/lib/settings";
import { BASE_CURRENCY, round2 } from "@/lib/currency";

export const dynamic = "force-dynamic";

const RANGES = [7, 14, 30, 90] as const;
type Range = (typeof RANGES)[number];

function parseRange(value: string | null): Range {
  const n = Number(value);
  return (RANGES as readonly number[]).includes(n) ? (n as Range) : 14;
}

function countTotal(groups: { _count: { _all: number } }[]): number {
  return groups.reduce((sum, group) => sum + group._count._all, 0);
}

export async function GET(request: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const settings = await getSettings();
  const url = new URL(request.url);
  const range = parseRange(url.searchParams.get("days"));
  const display = settings.displayCurrency;

  const rateByCode = new Map(settings.currencies.map((c) => [c.code.toUpperCase(), c.rate]));
  const fallbackRate = rateByCode.get(BASE_CURRENCY) ?? 1;
  const rateOf = (code: string) => rateByCode.get(code.toUpperCase()) ?? fallbackRate;
  const convertFast = (amount: unknown, from: string, to: string) => {
    const value = Number(amount);
    if (!Number.isFinite(value)) return 0;
    if (from === to) return value;
    return (value * rateOf(from)) / rateOf(to);
  };

  const now = new Date();
  const since = new Date(now);
  since.setDate(now.getDate() - range);
  const sinceItems = new Date(now);
  sinceItems.setDate(now.getDate() - 30);
  const since30 = new Date(now);
  since30.setDate(now.getDate() - 30);
  const paidWhere = { status: { not: "CANCELLED" } };

  const [statusGroups, deliveryGroups, paymentGroups, revenueGroups, rangeRows, itemRows, products, userCount, adminCount, newUsers30, categories] =
    await Promise.all([
      prisma.reservation.groupBy({ by: ["status"], _count: { _all: true } }),
      prisma.reservation.groupBy({ by: ["deliveryType"], _count: { _all: true } }),
      prisma.reservation.groupBy({ by: ["paymentMethod"], _count: { _all: true } }),
      prisma.reservation.groupBy({
        by: ["currency"],
        where: paidWhere,
        _sum: { total: true },
        _count: { _all: true },
      }),
      prisma.reservation.findMany({
        where: { ...paidWhere, createdAt: { gte: since } },
        select: { total: true, currency: true, createdAt: true },
      }),
      prisma.reservationItem.findMany({
        where: { reservation: { ...paidWhere, createdAt: { gte: sinceItems } } },
        select: {
          name: true,
          brand: true,
          productId: true,
          quantity: true,
          orderCurrency: true,
          priceConverted: true,
        },
        take: 5000,
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
      prisma.user.count(),
      prisma.user.count({ where: { role: "ADMIN" } }),
      prisma.user.count({ where: { createdAt: { gte: since30 } } }),
      prisma.category.count(),
    ]);

  const byStatus: Record<string, number> = {};
  for (const group of statusGroups) byStatus[group.status] = group._count._all;
  const byDelivery: Record<string, number> = {};
  for (const group of deliveryGroups) byDelivery[group.deliveryType] = group._count._all;
  const byPayment: Record<string, number> = {};
  for (const group of paymentGroups) byPayment[group.paymentMethod] = group._count._all;

  const revenue = revenueGroups.reduce(
    (sum, group) => sum + convertFast(group._sum.total ?? 0, group.currency, display),
    0,
  );
  const revenueUsd = revenueGroups.reduce(
    (sum, group) => sum + convertFast(group._sum.total ?? 0, group.currency, "USD"),
    0,
  );
  const paidCount = countTotal(revenueGroups);
  const avgTicket = paidCount ? revenueUsd / paidCount : 0;
  const avgTicketDisplay = paidCount ? revenue / paidCount : 0;
  const totalReservations = countTotal(statusGroups);

  const bucket = new Map<string, { total: number; count: number }>();
  for (const row of rangeRows) {
    const key = row.createdAt.toISOString().slice(0, 10);
    const prev = bucket.get(key) ?? { total: 0, count: 0 };
    bucket.set(key, {
      total: prev.total + convertFast(row.total, row.currency, display),
      count: prev.count + 1,
    });
  }
  const days: { date: string; total: number; count: number }[] = [];
  for (let i = range - 1; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(now.getDate() - i);
    const key = date.toISOString().slice(0, 10);
    const found = bucket.get(key);
    days.push({
      date: key,
      total: round2(found?.total ?? 0),
      count: found?.count ?? 0,
    });
  }

  const productById = new Map(products.map((p) => [p.id, p]));
  const soldMap = new Map<string, number>();
  const brandMap = new Map<string, number>();
  const catMap = new Map<string, { quantity: number; revenueUsd: number; revenueDisplay: number }>();
  for (const item of itemRows) {
    const product = item.productId ? productById.get(item.productId) : undefined;
    const brand = product?.brand ?? item.brand;
    const category = product?.category ?? "Sin categoría";
    soldMap.set(item.name, (soldMap.get(item.name) ?? 0) + item.quantity);
    brandMap.set(brand, (brandMap.get(brand) ?? 0) + item.quantity);
    const previous = catMap.get(category) ?? { quantity: 0, revenueUsd: 0, revenueDisplay: 0 };
    const itemRevenueUsd = convertFast(item.priceConverted, item.orderCurrency, "USD") * item.quantity;
    const itemRevenueDisplay = convertFast(item.priceConverted, item.orderCurrency, display) * item.quantity;
    catMap.set(category, {
      quantity: previous.quantity + item.quantity,
      revenueUsd: previous.revenueUsd + itemRevenueUsd,
      revenueDisplay: previous.revenueDisplay + itemRevenueDisplay,
    });
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
    .map(([name, value]) => ({
      name,
      quantity: value.quantity,
      revenueUsd: round2(value.revenueUsd),
      revenueDisplay: round2(value.revenueDisplay),
    }))
    .sort((a, b) => b.revenueDisplay - a.revenueDisplay)
    .slice(0, 5);

  const lowStock = products
    .filter((p) => p.stock !== null && p.stock <= 3)
    .map((p) => ({ id: p.id, name: p.name, stock: p.stock ?? 0 }))
    .sort((a, b) => a.stock - b.stock)
    .slice(0, 10);

  const inventoryCostCup = products.reduce(
    (sum, p) => sum + Number(p.costCup ?? 0) * (p.stock ?? 0),
    0,
  );
  const inventoryRetailUsd = products.reduce(
    (sum, p) =>
      sum + (p.stock ? convertFast(p.price, p.currency, "USD") * p.stock : 0),
    0,
  );
  const inventoryCostUsd = convertFast(inventoryCostCup, "CUP", "USD");
  const inventoryCost = convertFast(inventoryCostCup, "CUP", display);
  const inventoryRetail = convertFast(inventoryRetailUsd, "USD", display);
  const rangeRevenue = round2(days.reduce((sum, day) => sum + day.total, 0));
  const rangeCount = days.reduce((sum, day) => sum + day.count, 0);

  return NextResponse.json({
    currency: display,
    currencies: settings.currencies.map((c) => ({ code: c.code, symbol: c.symbol, label: c.label })),
    defaultCurrency: settings.displayCurrency,
    range,
    ranges: RANGES,
    cards: {
      revenue: round2(revenue),
      revenueUsd: round2(revenueUsd),
      avgTicket: round2(avgTicketDisplay),
      avgTicketUsd: round2(avgTicket),
      reservations: totalReservations,
      pending: byStatus.PENDING ?? 0,
      confirmed: byStatus.CONFIRMED ?? 0,
      delivered: byStatus.DELIVERED ?? 0,
      cancelled: byStatus.CANCELLED ?? 0,
      users: userCount,
      admins: adminCount,
      newUsers30,
      products: products.length,
      hiddenProducts: products.filter((p) => !p.visible).length,
      categories,
      lowStock: lowStock.length,
      inventoryCostUsd: round2(inventoryCostUsd),
      inventoryRetailUsd: round2(inventoryRetailUsd),
      inventoryCost: round2(inventoryCost),
      inventoryRetail: round2(inventoryRetail),
      rangeRevenue,
      rangeRevenueUsd: rangeRevenue,
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
