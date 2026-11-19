import { NextResponse } from "next/server";
import PDFDocument from "pdfkit";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { getSettings } from "@/lib/settings";
import { convert, formatMoney } from "@/lib/currency";
import {
  STATUS_LABEL,
  PAYMENT_LABEL,
  DELIVERY_LABEL,
  CAMPAIGN_STATUS_LABEL,
  PLATFORM_LABEL,
  ROLE_LABEL,
} from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Row = string[];

/**
 * Reporte REAL en PDF (no una captura de pantalla): se compone con PDFKit a
 * partir de los mismos datos que alimenta el dashboard, con portada, resumen
 * ejecutivo, tablas y gráficos de barras dibujados vectorialmente. Se puede
 * abrir con cualquier lector y el texto se puede buscar y seleccionar.
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
        .findMany({
          orderBy: [{ order: "asc" }, { name: "asc" }],
          include: { _count: { select: { products: true } } },
        })
        .catch(() => []),
      prisma.reservation.findMany({
        include: { items: true, user: { select: { email: true, name: true } } },
        orderBy: { createdAt: "desc" },
      }),
      prisma.user.findMany({ orderBy: { createdAt: "desc" } }),
      prisma.campaign.findMany({ orderBy: { createdAt: "desc" } }).catch(() => []),
    ]);

  const requested = (searchParams.get("currency") ?? "").toUpperCase();
  const known = new Set(settings.currencies.map((c) => c.code.toUpperCase()));
  const display = known.has(requested) ? requested : settings.displayCurrency;
  const toDisplay = (amount: number, from: string) => convert(Number(amount), from, display, settings.currencies);
  const toUsd = (amount: number, from: string) => convert(Number(amount), from, "USD", settings.currencies);

  const active = reservations.filter((r) => r.status !== "CANCELLED");
  const inWindow = active.filter((r) => r.createdAt >= since);

  const revenueUsd = active.reduce((s, r) => s + toUsd(Number(r.total), r.currency), 0);
  const windowUsd = inWindow.reduce((s, r) => s + toUsd(Number(r.total), r.currency), 0);
  const ticketUsd = active.length ? revenueUsd / active.length : 0;

  // El costo de compra se carga en CUP, la misma moneda que el precio de venta.
  const inventoryCostCup = products.reduce((s, p) => s + Number(p.costCup ?? 0) * (p.stock ?? 0), 0);
  const inventoryCostUsd = toUsd(inventoryCostCup, "CUP");

  const soldMap = new Map<string, { qty: number; usd: number }>();
  for (const r of active) {
    for (const it of r.items) {
      const prev = soldMap.get(it.name) ?? { qty: 0, usd: 0 };
      soldMap.set(it.name, {
        qty: prev.qty + it.quantity,
        usd: prev.usd + toUsd(Number(it.priceConverted), it.orderCurrency) * it.quantity,
      });
    }
  }
  const topProducts = [...soldMap.entries()]
    .map(([name, v]) => ({ name, quantity: v.qty, revenueUsd: Math.round(v.usd * 100) / 100 }))
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 10);

  const byStatus: Record<string, number> = {};
  const byDelivery: Record<string, number> = {};
  const byPayment: Record<string, number> = {};
  for (const r of reservations) {
    byStatus[r.status] = (byStatus[r.status] ?? 0) + 1;
    byDelivery[r.deliveryType] = (byDelivery[r.deliveryType] ?? 0) + 1;
    byPayment[r.paymentMethod] = (byPayment[r.paymentMethod] ?? 0) + 1;
  }

  // Serie diaria para el gráfico de ventas del periodo elegido.
  const daily: { key: string; label: string; usd: number }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - i);
    daily.push({
      key: d.toISOString().slice(0, 10),
      label: `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`,
      usd: 0,
    });
  }
  const dayIndex = new Map(daily.map((d, i) => [d.key, i]));
  for (const r of inWindow) {
    const key = new Date(r.createdAt).toISOString().slice(0, 10);
    const idx = dayIndex.get(key);
    if (idx !== undefined) daily[idx].usd += toUsd(Number(r.total), r.currency);
  }

  const doc = new PDFDocument({ size: "A4", margin: 46, bufferPages: true });
  const chunks: Buffer[] = [];
  doc.on("data", (c: Buffer) => chunks.push(c));
  const done = new Promise<Buffer>((resolve) => {
    doc.on("end", () => resolve(Buffer.concat(chunks)));
  });

  const INK = "#1d1a17";
  const MUTED = "#6b625a";
  const LINE = "#ddd5cb";
  const ACCENT = "#7a2333";
  const pageW = doc.page.width;
  const left = 46;
  const contentW = pageW - left * 2;

  const money = (n: number) => formatMoney(toDisplay(n, "USD"), display);

  const heading = (text: string) => {
    if (doc.y > doc.page.height - 140) doc.addPage();
    doc.moveDown(0.9);
    doc.font("Helvetica-Bold").fontSize(12).fillColor(ACCENT).text(text.toUpperCase(), left, doc.y);
    doc.moveTo(left, doc.y + 3).lineTo(pageW - left, doc.y + 3).strokeColor(LINE).stroke();
    doc.moveDown(0.5);
    doc.fillColor(INK).font("Helvetica").fontSize(9.5);
  };

  const kvGrid = (items: { label: string; value: string }[]) => {
    const colW = contentW / 3;
    let i = 0;
    for (const item of items) {
      const col = i % 3;
      if (col === 0 && i > 0) doc.moveDown(1.9);
      const x = left + col * colW;
      const y = doc.y;
      doc.font("Helvetica").fontSize(7.5).fillColor(MUTED).text(item.label.toUpperCase(), x, y, { width: colW - 12 });
      doc.font("Helvetica-Bold").fontSize(11).fillColor(INK).text(item.value, x, y + 10, { width: colW - 12 });
      i++;
    }
    doc.moveDown(2.2);
  };

  const table = (headers: string[], rows: Row[], widths: number[]) => {
    const drawHead = () => {
      const y = doc.y;
      doc.font("Helvetica-Bold").fontSize(8).fillColor(MUTED);
      let x = left;
      headers.forEach((h, i) => {
        doc.text(h.toUpperCase(), x, y, { width: widths[i], align: i === 0 ? "left" : "right" });
        x += widths[i];
      });
      doc.moveDown(0.6);
      doc.moveTo(left, doc.y).lineTo(pageW - left, doc.y).strokeColor(LINE).stroke();
      doc.moveDown(0.35);
    };

    drawHead();
    for (const row of rows) {
      if (doc.y > doc.page.height - 90) {
        doc.addPage();
        drawHead();
      }
      const y = doc.y;
      let x = left;
      doc.font("Helvetica").fontSize(8.6).fillColor(INK);
      row.forEach((cell, i) => {
        doc.text(cell, x, y, { width: widths[i], align: i === 0 ? "left" : "right", lineBreak: false, ellipsis: true });
        x += widths[i];
      });
      doc.moveDown(0.55);
      doc.moveTo(left, doc.y).lineTo(pageW - left, doc.y).strokeColor("#f0ebe4").stroke();
      doc.moveDown(0.25);
    }
    doc.moveDown(0.6);
  };

  const barChart = (data: { label: string; value: number }[], color = ACCENT) => {
    const max = Math.max(...data.map((d) => d.value), 1);
    const rowH = 14;
    const labelW = 120;
    const barMaxW = contentW - labelW - 70;
    for (const d of data) {
      if (doc.y > doc.page.height - 70) doc.addPage();
      const y = doc.y;
      doc.font("Helvetica").fontSize(8).fillColor(INK).text(d.label, left, y + 2, { width: labelW, ellipsis: true, lineBreak: false });
      const w = Math.max(2, (d.value / max) * barMaxW);
      doc.rect(left + labelW, y + 1, w, 9).fillColor(color).fill();
      doc
        .font("Helvetica")
        .fontSize(7.5)
        .fillColor(MUTED)
        .text(d.value.toLocaleString("es-CU", { maximumFractionDigits: 0 }), left + labelW + w + 6, y + 2, {
          width: 62,
          align: "right",
        });
      doc.y = y + rowH;
    }
    doc.moveDown(0.6);
  };

  // ── Portada / encabezado ────────────────────────────────────────────────
  doc.rect(0, 0, pageW, 96).fillColor(INK).fill();
  doc.font("Helvetica-Bold").fontSize(20).fillColor("#f7f2ec").text(settings.brand, left, 32);
  doc
    .font("Helvetica")
    .fontSize(9.5)
    .fillColor("#c9bdb1")
    .text("Reporte general del sistema", left, 58);
  doc
    .fontSize(8)
    .fillColor("#a99b8e")
    .text(
      `Generado el ${new Date().toLocaleString("es-CU")}  ·  Periodo: últimos ${days} días (desde ${since.toLocaleDateString("es-CU")})`,
      left,
      74,
    );
  doc.fillColor(INK);
  doc.y = 120;

  heading("Resumen ejecutivo");
  kvGrid([
    { label: "Ingresos totales", value: money(revenueUsd) },
    { label: `Ingresos ${days} días`, value: money(windowUsd) },
    { label: "Ticket promedio", value: money(ticketUsd) },
    { label: "Reservas", value: String(reservations.length) },
    { label: "Activas", value: String(active.length) },
    { label: `En el periodo`, value: String(inWindow.length) },
    { label: "Clientes", value: String(users.length) },
    { label: "Administradores", value: String(users.filter((u) => u.role === "ADMIN").length) },
    { label: "Productos activos", value: `${products.filter((p) => p.visible).length} / ${products.length}` },
    { label: "Costo del inventario", value: money(inventoryCostUsd) },
    { label: "Ofertas / banners", value: `${combos.length} / ${banners.length}` },
    { label: "Por reponer (≤3)", value: String(products.filter((p) => p.stock !== null && p.stock <= 3).length) },
  ]);

  heading(`Ventas de los últimos ${days} días (${display})`);
  barChart(daily.map((d) => ({ label: d.label, value: Math.round(toDisplay(d.usd, "USD") * 100) / 100 })));

  heading("Reservas por estado");
  barChart(
    Object.entries(byStatus)
      .sort((a, b) => b[1] - a[1])
      .map(([k, v]) => ({ label: STATUS_LABEL[k] ?? k, value: v })),
    "#a8763c",
  );

  heading("Productos más vendidos");
  if (topProducts.length === 0) {
    doc.font("Helvetica-Oblique").fontSize(9).fillColor(MUTED).text("Sin ventas registradas todavía.");
    doc.moveDown(0.6);
  } else {
    table(
      ["Producto", "Unidades", "Ingresos"],
      topProducts.map((p) => [p.name, String(p.quantity), money(p.revenueUsd)]),
      [contentW - 190, 80, 110],
    );
  }

  heading("Catálogo");
  table(
    ["Producto", "Marca", "Stock", `Precio (${display})`],
    products.map((p) => [
      p.name,
      p.brand,
      p.stock === null ? "Libre" : String(p.stock),
      formatMoney(toDisplay(Number(p.price), p.currency), display),
    ]),
    [contentW - 250, 110, 60, 80],
  );

  heading("Ofertas y combos");
  if (combos.length === 0) {
    doc.font("Helvetica-Oblique").fontSize(9).fillColor(MUTED).text("No hay ofertas cargadas.");
    doc.moveDown(0.6);
  } else {
    for (const c of combos) {
      if (doc.y > doc.page.height - 100) doc.addPage();
      doc.font("Helvetica-Bold").fontSize(9.5).fillColor(INK).text(`${c.title}  —  ${formatMoney(toDisplay(Number(c.price), c.currency), display)}`);
      doc
        .font("Helvetica")
        .fontSize(8)
        .fillColor(MUTED)
        .text(c.items.map((i) => `${i.quantity}× ${i.product.name}`).join(" · "));
      doc.moveDown(0.45);
    }
    doc.moveDown(0.3);
  }

  heading("Reservas");
  table(
    ["Código / cliente", "Estado", "Entrega · Pago", "Total"],
    reservations.slice(0, 200).map((r) => [
      `${r.code} · ${r.user?.name ?? r.user?.email ?? "—"}`,
      STATUS_LABEL[r.status] ?? r.status,
      `${DELIVERY_LABEL[r.deliveryType] ?? r.deliveryType} · ${PAYMENT_LABEL[r.paymentMethod] ?? r.paymentMethod}`,
      formatMoney(toDisplay(Number(r.total), r.currency), display),
    ]),
    [contentW - 250, 100, 90, 60],
  );

  heading("Clientes");
  table(
    ["Nombre", "Correo", "Rol", "Alta"],
    users.slice(0, 200).map((u) => [
      u.name ?? "—",
      u.email,
      ROLE_LABEL[u.role] ?? u.role,
      new Date(u.createdAt).toLocaleDateString("es-CU"),
    ]),
    [contentW - 260, 150, 60, 50],
  );

  heading("Campañas");
  if (campaigns.length === 0) {
    doc.font("Helvetica-Oblique").fontSize(9).fillColor(MUTED).text("No hay campañas creadas.");
    doc.moveDown(0.6);
  } else {
    table(
      ["Campaña", "Plataforma", "Estado"],
      campaigns.map((c) => [
        c.title,
        PLATFORM_LABEL[c.platform] ?? c.platform,
        CAMPAIGN_STATUS_LABEL[c.status] ?? c.status,
      ]),
      [contentW - 220, 110, 110],
    );
  }

  heading("Categorías");
  table(
    ["Categoría", "Productos"],
    categories.map((c) => [c.name, String(c._count.products)]),
    [contentW - 100, 100],
  );

  // Pie de página con numeración.
  const range = doc.bufferedPageRange();
  for (let i = 0; i < range.count; i++) {
    doc.switchToPage(range.start + i);
    doc
      .font("Helvetica")
      .fontSize(7.5)
      .fillColor(MUTED)
      .text(
        `${settings.brand} · Reporte generado automáticamente · Página ${i + 1} de ${range.count}`,
        left,
        doc.page.height - 34,
        { width: contentW, align: "center" },
      );
  }

  doc.end();
  const buffer = await done;

  const filename = `reporte-${settings.brand.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-${new Date()
    .toISOString()
    .slice(0, 10)}.pdf`;

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
