import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { getSettings } from "@/lib/settings";
import { convert } from "@/lib/currency";

export const dynamic = "force-dynamic";

/**
 * Reporte completo del sistema en un solo JSON: catálogo, ofertas, banners,
 * categorías, reservas, usuarios, campañas y las cifras del dashboard.
 * Lo consume la pestaña "Reporte" del panel, que lo imprime o lo guarda en PDF
 * con el diálogo del navegador (Ctrl/Cmd + P → Guardar como PDF).
 */
export async function GET(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const days = Math.min(365, Math.max(7, Number(searchParams.get("days") ?? 30) || 30));

  const since = new Date();
  since.setDate(since.getDate() - (days - 1));
  since.setHours(0, 0, 0, 0);

  const [settings, products, combos, banners, categories, reservations, users, campaigns] =
    await Promise.all([
      getSettings(),
      prisma.product.findMany({ orderBy: { createdAt: "desc" } }),
      prisma.combo
        .findMany({
          orderBy: [{ order: "asc" }, { createdAt: "desc" }],
          include: { items: { include: { product: { select: { name: true } } } } },
        })
        .catch(() => []),
      prisma.banner.findMany({ orderBy: [{ order: "asc" }] }).catch(() => []),
      prisma.category
        .findMany({ orderBy: [{ order: "asc" }, { name: "asc" }], include: { _count: { select: { products: true } } } })
        .catch(() => []),
      prisma.reservation.findMany({
        include: {
          items: true,
          user: { select: { email: true, name: true } },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.user.findMany({ orderBy: { createdAt: "desc" } }),
      prisma.campaign.findMany({ orderBy: { createdAt: "desc" } }).catch(() => []),
    ]);

  // Moneda del informe: cualquiera que tenga configurada la tienda. Si no se
  // pide ninguna válida, se usa la moneda de visualización del panel.
  const requested = (searchParams.get("currency") ?? "").toUpperCase();
  const known = new Set(settings.currencies.map((c) => c.code.toUpperCase()));
  const display = known.has(requested) ? requested : settings.displayCurrency;
  const toDisplay = (amount: number, from: string) =>
    convert(Number(amount), from, display, settings.currencies);
  const toUsd = (amount: number, from: string) =>
    convert(Number(amount), from, "USD", settings.currencies);

  const paid = reservations.filter((r) => r.status !== "CANCELLED");
  const inWindow = paid.filter((r) => r.createdAt >= since);

  const revenue = paid.reduce((s, r) => s + toDisplay(Number(r.total), r.currency), 0);
  const revenueUsd = paid.reduce((s, r) => s + toUsd(Number(r.total), r.currency), 0);
  const windowRevenue = inWindow.reduce((s, r) => s + toDisplay(Number(r.total), r.currency), 0);
  const windowUsd = inWindow.reduce((s, r) => s + toUsd(Number(r.total), r.currency), 0);

  const byStatus: Record<string, number> = {};
  const byDelivery: Record<string, number> = {};
  const byPayment: Record<string, number> = {};
  for (const r of reservations) {
    byStatus[r.status] = (byStatus[r.status] ?? 0) + 1;
    byDelivery[r.deliveryType] = (byDelivery[r.deliveryType] ?? 0) + 1;
    byPayment[r.paymentMethod] = (byPayment[r.paymentMethod] ?? 0) + 1;
  }

  const soldMap = new Map<string, { qty: number; usd: number; display: number }>();
  for (const r of paid) {
    for (const it of r.items) {
      const prev = soldMap.get(it.name) ?? { qty: 0, usd: 0, display: 0 };
      soldMap.set(it.name, {
        qty: prev.qty + it.quantity,
        usd: prev.usd + toUsd(Number(it.priceConverted), it.orderCurrency) * it.quantity,
        display:
          prev.display +
          toDisplay(Number(it.priceConverted), it.orderCurrency) * it.quantity,
      });
    }
  }
  const topProducts = [...soldMap.entries()]
    .map(([name, v]) => ({
      name,
      quantity: v.qty,
      revenueUsd: Math.round(v.usd * 100) / 100,
      revenueDisplay: Math.round(v.display * 100) / 100,
    }))
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 10);

  // El costo de compra se carga en CUP, la misma moneda que el precio de venta.
  const inventoryCostCup = products.reduce(
    (s, p) => s + Number(p.costCup ?? 0) * (p.stock ?? 0),
    0,
  );
  const inventoryCostUsd = toUsd(inventoryCostCup, "CUP");

  const money = (n: number, cur = display) => ({ amount: Math.round(n * 100) / 100, currency: cur });

  return NextResponse.json({
    generatedAt: new Date().toISOString(),
    period: { days, since: since.toISOString() },
    store: {
      brand: settings.brand,
      phone: settings.whatsappDisplay,
      address: settings.storeAddress,
      currency: display,
    },
    /** Monedas disponibles para volver a mirar el informe en otra moneda. */
    currencies: settings.currencies.map((c) => ({ code: c.code, symbol: c.symbol, label: c.label })),
    summary: {
      revenue: money(revenue),
      revenueUsd: money(revenueUsd, "USD"),
      windowRevenue: money(windowRevenue),
      windowUsd: money(windowUsd, "USD"),
      reservations: reservations.length,
      paidReservations: paid.length,
      windowReservations: inWindow.length,
      users: users.length,
      admins: users.filter((u) => u.role === "ADMIN").length,
      products: products.length,
      visibleProducts: products.filter((p) => p.visible).length,
      combos: combos.length,
      banners: banners.length,
      categories: categories.length,
      campaigns: campaigns.length,
      inventoryCostUsd: money(inventoryCostUsd, "USD"),
      inventoryCost: money(convert(inventoryCostCup, "CUP", display, settings.currencies)),
      lowStock: products.filter((p) => p.stock !== null && p.stock <= 3).length,
    },
    byStatus,
    byDelivery,
    byPayment,
    topProducts,
    products: products.map((p) => ({
      id: p.id,
      name: p.name,
      brand: p.brand,
      category: p.category,
      price: Number(p.price),
      currency: p.currency,
      stock: p.stock,
      visible: p.visible,
      costCup: p.costCup === null ? null : Number(p.costCup),
    })),
    combos: combos.map((c) => ({
      id: c.id,
      title: c.title,
      price: Number(c.price),
      currency: c.currency,
      visible: c.visible,
      items: c.items.map((i) => ({ name: i.product.name, quantity: i.quantity })),
    })),
    banners: banners.map((b) => ({
      id: b.id,
      title: b.title,
      placement: b.placement,
      visible: b.visible,
      ctaUrl: b.ctaUrl,
    })),
    categories: categories.map((c) => ({
      id: c.id,
      name: c.name,
      productCount: c._count.products,
    })),
    reservations: reservations.map((r) => ({
      id: r.id,
      code: r.code,
      customer: r.user?.name ?? r.user?.email ?? "—",
      email: r.user?.email ?? "—",
      status: r.status,
      deliveryType: r.deliveryType,
      paymentMethod: r.paymentMethod,
      total: Number(r.total),
      currency: r.currency,
      createdAt: r.createdAt.toISOString(),
      items: r.items.map((i) => ({ name: i.name, quantity: i.quantity })),
    })),
    users: users.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      createdAt: u.createdAt.toISOString(),
    })),
    campaigns: campaigns.map((c) => ({
      id: c.id,
      title: c.title,
      platform: c.platform,
      status: c.status,
      scheduledAt: c.scheduledAt ? c.scheduledAt.toISOString() : null,
    })),
  });
}
