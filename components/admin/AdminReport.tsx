"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowClockwise,
  Printer,
  FilePdf,
  Package,
  Gift,
  Megaphone,
  Tag,
  Users,
  Receipt,
  ChatCircleText,
} from "@phosphor-icons/react/dist/ssr";
import { formatMoney } from "@/lib/currency";
import { formatDateTime, formatDate } from "@/lib/format-date";
import {
  STATUS_LABEL,
  DELIVERY_LABEL,
  PAYMENT_LABEL,
  ROLE_LABEL,
  PLATFORM_LABEL,
  CAMPAIGN_STATUS_LABEL,
} from "@/lib/types";

type Report = {
  generatedAt: string;
  period: { days: number; since: string };
  store: { brand: string; phone: string; address: string; currency: string };
  summary: {
    revenue: { amount: number; currency: string };
    revenueUsd: { amount: number; currency: string };
    windowRevenue: { amount: number; currency: string };
    windowUsd: { amount: number; currency: string };
    reservations: number;
    paidReservations: number;
    windowReservations: number;
    users: number;
    admins: number;
    products: number;
    visibleProducts: number;
    combos: number;
    banners: number;
    categories: number;
    campaigns: number;
    inventoryCostUsd: { amount: number; currency: string };
    inventoryCost: { amount: number; currency: string };
    lowStock: number;
  };
  byStatus: Record<string, number>;
  byDelivery: Record<string, number>;
  byPayment: Record<string, number>;
  topProducts: { name: string; quantity: number; revenueUsd: number; revenueDisplay?: number }[];
  products: {
    id: string;
    name: string;
    brand: string;
    category: string;
    price: number;
    currency: string;
    stock: number | null;
    visible: boolean;
    costCup: number | null;
  }[];
  combos: {
    id: string;
    title: string;
    price: number;
    currency: string;
    visible: boolean;
    items: { name: string; quantity: number }[];
  }[];
  banners: { id: string; title: string; placement: string; visible: boolean; ctaUrl: string | null }[];
  categories: { id: string; name: string; productCount: number }[];
  reservations: {
    id: string;
    code: string;
    customer: string;
    email: string;
    status: string;
    deliveryType: string;
    paymentMethod: string;
    total: number;
    currency: string;
    createdAt: string;
    items: { name: string; quantity: number }[];
  }[];
  users: { id: string; name: string | null; email: string; role: string; createdAt: string }[];
  currencies?: { code: string; symbol: string; label: string }[];
  campaigns: {
    id: string;
    title: string;
    platform: string;
    status: string;
    scheduledAt: string | null;
  }[];
};

const RANGE_OPTIONS = [
  { days: 7, label: "Últimos 7 días" },
  { days: 14, label: "Últimos 14 días" },
  { days: 30, label: "Últimos 30 días" },
  { days: 90, label: "Últimos 90 días" },
  { days: 365, label: "Último año" },
];

const money = (amount: number, currency: string) => formatMoney(Number(amount) || 0, currency);

function Section({
  icon: Icon,
  title,
  meta,
  children,
}: {
  icon: React.ElementType;
  title: string;
  meta?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="break-inside-avoid rounded-card border border-line bg-surface p-5 print:border-line/70 print:p-4">
      <div className="flex items-center justify-between gap-3 border-b border-line pb-3">
        <h3 className="flex items-center gap-2 text-h4">
          <Icon size={16} className="text-primary" />
          {title}
        </h3>
        {meta && <span className="text-xs tabular-nums text-muted">{meta}</span>}
      </div>
      <div className="mt-3">{children}</div>
    </section>
  );
}

export function AdminReport({ currency }: { currency: string }) {
  const [days, setDays] = useState(30);
  // Moneda del informe. "" = la moneda del panel que llega por prop.
  const [viewCurrency, setViewCurrency] = useState("");
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback((d: number, cur: string) => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    const q = new URLSearchParams({ days: String(d) });
    if (cur) q.set("currency", cur);
    fetch(`/api/admin/report?${q.toString()}`, { signal: controller.signal })
      .then(async (r) => {
        if (!r.ok) throw new Error("No pudimos generar el reporte.");
        return r.json();
      })
      .then((data: Report) => setReport(data))
      .catch((e) => {
        if (e.name !== "AbortError") setError(e.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return controller;
  }, []);

  useEffect(() => {
    const c = load(days, viewCurrency);
    return () => c.abort();
  }, [days, viewCurrency, load]);

  const statusRows = useMemo(
    () => Object.entries(report?.byStatus ?? {}) as [string, number][],
    [report],
  );

  if (error) {
    return (
      <div className="rounded-card border border-line bg-surface p-6 text-center">
        <p className="text-sm text-danger">{error}</p>
        <button
          onClick={() => load(days, viewCurrency)}
          className="mt-3 inline-flex items-center gap-1.5 rounded-control border border-line px-3 py-1.5 text-xs text-ink hover:border-primary hover:text-primary"
        >
          <ArrowClockwise size={14} /> Reintentar
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Barra de acciones: no se imprime */}
      <div className="flex flex-wrap items-end justify-between gap-3 print:hidden">
        <div>
          <h2 className="text-h3">Reporte completo</h2>
          <p className="mt-1 text-sm text-muted">
            Todo el sistema en un documento: catálogo, ofertas, banners, reservas, usuarios,
            campañas y cifras de ventas.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={viewCurrency}
            onChange={(e) => setViewCurrency(e.target.value)}
            aria-label="Moneda del reporte"
            className="rounded-control border border-line bg-bg px-3 py-2 text-sm text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
          >
            <option value="">Moneda del panel ({currency})</option>
            {(report?.currencies ?? []).map((c) => (
              <option key={c.code} value={c.code}>
                {c.label} ({c.symbol})
              </option>
            ))}
          </select>
          <select
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            aria-label="Periodo del reporte"
            className="rounded-control border border-line bg-bg px-3 py-2 text-sm text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
          >
            {RANGE_OPTIONS.map((o) => (
              <option key={o.days} value={o.days}>
                {o.label}
              </option>
            ))}
          </select>
          <button
            onClick={() => load(days, viewCurrency)}
            className="inline-flex items-center gap-1.5 rounded-control border border-line px-3 py-2 text-sm text-ink transition-colors hover:border-primary hover:text-primary"
          >
            <ArrowClockwise size={15} /> Actualizar
          </button>
          <a
            href={`/api/admin/report/pdf?days=${days}${
              viewCurrency ? `&currency=${encodeURIComponent(viewCurrency)}` : ""
            }`}
            className="inline-flex items-center gap-1.5 rounded-control bg-primary px-3.5 py-2 text-sm font-medium text-on-primary transition-colors hover:bg-accent"
          >
            <FilePdf size={15} /> Descargar PDF
          </a>
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 rounded-control border border-line px-3 py-2 text-sm text-ink transition-colors hover:border-primary hover:text-primary"
          >
            <Printer size={15} /> Imprimir
          </button>
        </div>
      </div>

      {loading && !report ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-32 animate-pulse rounded-card border border-line bg-surface" />
          ))}
        </div>
      ) : report ? (
        <div className="space-y-5 print:space-y-4">
          {/* Cabecera del documento */}
          <header className="rounded-card border border-line bg-surface p-5 print:border-0 print:p-0">
            <p className="text-xs uppercase tracking-[0.2em] text-muted">{report.store.brand}</p>
            <h1 className="mt-1 text-h2">Reporte general del sistema</h1>
            <p className="mt-2 text-sm text-muted">
              Generado el {formatDateTime(report.generatedAt)} · periodo:{" "}
              {report.period.days} días (desde {formatDate(report.period.since)}) · moneda:{" "}
              {report.store.currency}
            </p>
            <p className="mt-1 text-xs text-muted">
              {report.store.address} · {report.store.phone}
            </p>
          </header>

          {/* Resumen */}
          <Section icon={Receipt} title="Resumen de ventas">
            <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {[
                {
                  k: `Ingresos (${report.period.days} días)`,
                  v: money(report.summary.windowRevenue.amount, report.store.currency),
                  sub: `${report.summary.windowReservations} reservas en el periodo`,
                },
                {
                  k: "Ingresos históricos",
                  v: money(report.summary.revenue.amount, report.store.currency),
                  sub: `${report.summary.paidReservations} ventas cerradas`,
                },
                {
                  k: "Reservas en el periodo",
                  v: String(report.summary.windowReservations),
                  sub: `${report.summary.reservations} en total`,
                },
                {
                  k: "Ticket promedio",
                  v: money(
                    report.summary.paidReservations
                      ? report.summary.revenue.amount / report.summary.paidReservations
                      : 0,
                    report.store.currency,
                  ),
                  sub: `${report.summary.paidReservations} con venta`,
                },
              ].map((c) => (
                <div key={c.k}>
                  <dt className="text-[11px] uppercase tracking-[0.1em] text-muted">{c.k}</dt>
                  <dd className="mt-1 text-lg font-semibold tabular-nums text-ink">{c.v}</dd>
                  <dd className="text-xs text-muted">{c.sub}</dd>
                </div>
              ))}
            </dl>

            <div className="mt-5 grid grid-cols-2 gap-3 border-t border-line pt-4 text-sm sm:grid-cols-4">
              {[
                ["Productos", `${report.summary.products} (${report.summary.visibleProducts} visibles)`],
                ["Ofertas", String(report.summary.combos)],
                ["Banners", String(report.summary.banners)],
                ["Categorías", String(report.summary.categories)],
                ["Usuarios", `${report.summary.users} (${report.summary.admins} admin)`],
                ["Campañas", String(report.summary.campaigns)],
                ["Stock bajo", String(report.summary.lowStock)],
                ["Costo de inventario", money(report.summary.inventoryCost.amount, report.store.currency)],
              ].map(([k, v]) => (
                <div key={k} className="flex items-center justify-between gap-2">
                  <span className="text-muted">{k}</span>
                  <span className="tabular-nums font-medium text-ink">{v}</span>
                </div>
              ))}
            </div>
          </Section>

          {/* Reservas por estado / entrega / pago */}
          <div className="grid gap-4 sm:grid-cols-3">
            <Section icon={Receipt} title="Reservas por estado">
              {statusRows.length === 0 ? (
                <p className="text-xs text-muted">Sin reservas registradas.</p>
              ) : (
                <ul className="space-y-1.5 text-sm">
                  {statusRows.map(([k, v]) => (
                    <li key={k} className="flex items-center justify-between gap-2">
                      <span className="text-muted">{STATUS_LABEL[k] ?? k}</span>
                      <span className="tabular-nums font-medium text-ink">{v}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Section>
            <Section icon={Receipt} title="Por tipo de entrega">
              {Object.keys(report.byDelivery).length === 0 ? (
                <p className="text-xs text-muted">Sin datos.</p>
              ) : (
                <ul className="space-y-1.5 text-sm">
                  {Object.entries(report.byDelivery).map(([k, v]) => (
                    <li key={k} className="flex items-center justify-between gap-2">
                      <span className="text-muted">{DELIVERY_LABEL[k] ?? k}</span>
                      <span className="tabular-nums font-medium text-ink">{v}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Section>
            <Section icon={Receipt} title="Por forma de pago">
              {Object.keys(report.byPayment).length === 0 ? (
                <p className="text-xs text-muted">Sin datos.</p>
              ) : (
                <ul className="space-y-1.5 text-sm">
                  {Object.entries(report.byPayment).map(([k, v]) => (
                    <li key={k} className="flex items-center justify-between gap-2">
                      <span className="text-muted">{PAYMENT_LABEL[k] ?? k}</span>
                      <span className="tabular-nums font-medium text-ink">{v}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Section>
          </div>

          {/* Más vendidos */}
          <Section icon={Package} title="Productos más vendidos" meta="Top 10">
            {report.topProducts.length === 0 ? (
              <p className="text-xs text-muted">Todavía no hay ventas.</p>
            ) : (
              <Table
                head={["Producto", "Unidades", `Ingresos (${report.store.currency})`]}
                rows={report.topProducts.map((p) => [
                  p.name,
                  String(p.quantity),
                  money(p.revenueDisplay ?? p.revenueUsd, report.store.currency),
                ])}
              />
            )}
          </Section>

          {/* Catálogo */}
          <Section icon={Package} title="Catálogo" meta={`${report.products.length} productos`}>
            {report.products.length === 0 ? (
              <p className="text-xs text-muted">Sin productos cargados.</p>
            ) : (
              <Table
                head={["Producto", "Marca", "Familia", "Precio", "Stock", "Estado"]}
                rows={report.products.map((p) => [
                  p.name,
                  p.brand,
                  p.category,
                  money(p.price, p.currency),
                  p.stock === null ? "sin límite" : String(p.stock),
                  p.visible ? "visible" : "oculto",
                ])}
              />
            )}
          </Section>

          {/* Ofertas y banners */}
          <div className="grid gap-4 lg:grid-cols-2">
            <Section icon={Gift} title="Ofertas y combos" meta={`${report.combos.length}`}>
              {report.combos.length === 0 ? (
                <p className="text-xs text-muted">Sin ofertas creadas.</p>
              ) : (
                <ul className="space-y-2 text-sm">
                  {report.combos.map((c) => (
                    <li key={c.id} className="flex items-start justify-between gap-3 border-b border-line/70 pb-2 last:border-0">
                      <div>
                        <p className="font-medium text-ink">{c.title}</p>
                        <p className="text-xs text-muted">
                          {c.items.map((i) => `${i.quantity}× ${i.name}`).join(", ") || "Sin productos"}
                        </p>
                      </div>
                      <span className="shrink-0 tabular-nums text-ink">
                        {money(c.price, c.currency)}
                        {!c.visible && <span className="ml-1 text-xs text-muted">(oculta)</span>}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Section>

            <Section icon={Megaphone} title="Banners promocionales" meta={`${report.banners.length}`}>
              {report.banners.length === 0 ? (
                <p className="text-xs text-muted">Sin banners creados.</p>
              ) : (
                <ul className="space-y-2 text-sm">
                  {report.banners.map((b) => (
                    <li key={b.id} className="flex items-center justify-between gap-3">
                      <span className="truncate text-ink">{b.title}</span>
                      <span className="shrink-0 text-xs text-muted">
                        {b.placement === "HOME" ? "Portada" : b.placement === "CATALOG" ? "Catálogo" : b.placement}
                        {b.visible ? "" : " · oculto"}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Section>
          </div>

          {/* Categorías */}
          <Section icon={Tag} title="Familias olfativas / categorías">
            {report.categories.length === 0 ? (
              <p className="text-xs text-muted">Sin categorías.</p>
            ) : (
              <Table
                head={["Categoría", "Productos"]}
                rows={report.categories.map((c) => [c.name, String(c.productCount)])}
              />
            )}
          </Section>

          {/* Reservas */}
          <Section icon={Receipt} title="Reservas" meta={`${report.reservations.length} en total`}>
            {report.reservations.length === 0 ? (
              <p className="text-xs text-muted">Sin reservas.</p>
            ) : (
              <Table
                head={["Código", "Cliente", "Fecha", "Estado", "Entrega", "Pago", "Total"]}
                rows={report.reservations.map((r) => [
                  r.code,
                  r.customer,
                  formatDate(r.createdAt),
                  STATUS_LABEL[r.status] ?? r.status,
                  DELIVERY_LABEL[r.deliveryType] ?? r.deliveryType,
                  PAYMENT_LABEL[r.paymentMethod] ?? r.paymentMethod,
                  money(r.total, r.currency),
                ])}
              />
            )}
          </Section>

          {/* Usuarios */}
          <Section icon={Users} title="Usuarios" meta={`${report.users.length}`}>
            {report.users.length === 0 ? (
              <p className="text-xs text-muted">Sin usuarios.</p>
            ) : (
              <Table
                head={["Nombre", "Correo", "Rol", "Registro"]}
                rows={report.users.map((u) => [
                  u.name ?? "—",
                  u.email,
                  ROLE_LABEL[u.role] ?? u.role,
                  formatDate(u.createdAt),
                ])}
              />
            )}
          </Section>

          {/* Campañas */}
          <Section icon={ChatCircleText} title="Campañas" meta={`${report.campaigns.length}`}>
            {report.campaigns.length === 0 ? (
              <p className="text-xs text-muted">Sin campañas.</p>
            ) : (
              <Table
                head={["Título", "Plataforma", "Estado", "Programada"]}
                rows={report.campaigns.map((c) => [
                  c.title,
                  PLATFORM_LABEL[c.platform] ?? c.platform,
                  CAMPAIGN_STATUS_LABEL[c.status] ?? c.status,
                  c.scheduledAt ? formatDateTime(c.scheduledAt) : "—",
                ])}
              />
            )}
          </Section>

          <p className="text-center text-[11px] text-muted">
            {report.store.brand} · Reporte generado automáticamente desde el panel ·{" "}
            {formatDateTime(report.generatedAt)}
          </p>
        </div>
      ) : null}
    </div>
  );
}

function Table({ head, rows }: { head: string[]; rows: string[][] }) {
  return (
    <div className="overflow-x-auto print:overflow-visible">
      <table className="w-full min-w-[34rem] border-collapse text-sm print:min-w-0">
        <thead>
          <tr className="border-b border-line text-left text-[11px] uppercase tracking-[0.08em] text-muted">
            {head.map((h) => (
              <th key={h} className="py-2 pr-3 font-medium last:pr-0">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-b border-line/50 last:border-0">
              {row.map((cell, j) => (
                <td
                  key={j}
                  className={`py-2 pr-3 align-top last:pr-0 ${
                    j === 0 ? "text-ink" : "text-muted"
                  } ${j === row.length - 1 ? "tabular-nums" : ""}`}
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
