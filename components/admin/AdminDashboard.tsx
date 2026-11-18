"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CurrencyCircleDollar,
  ClipboardText,
  Users,
  Package,
  Warning,
  ArrowClockwise,
  Printer,
  FilePdf,
  TrendUp,
  Receipt,
  Bank,
  Truck,
  Crown,
} from "@phosphor-icons/react/dist/ssr";
import { formatMoney } from "@/lib/currency";

type Series = { label: string; value: number; extra?: string };
type Stats = {
  currency: string;
  range: number;
  ranges: number[];
  cards: {
    revenue: number;
    revenueUsd: number;
    avgTicket: number;
    avgTicketUsd: number;
    reservations: number;
    pending: number;
    confirmed: number;
    delivered: number;
    cancelled: number;
    users: number;
    admins: number;
    newUsers30: number;
    products: number;
    hiddenProducts: number;
    categories: number;
    lowStock: number;
    inventoryCostUsd: number;
    inventoryRetailUsd: number;
    inventoryCost: number;
    inventoryRetail: number;
    rangeRevenue: number;
    rangeRevenueUsd: number;
    rangeCount: number;
  };
  byStatus: Record<string, number>;
  byDelivery: Record<string, number>;
  byPayment: Record<string, number>;
  days: { date: string; total: number; count: number }[];
  topProducts: { name: string; quantity: number }[];
  topBrands: { name: string; quantity: number }[];
  topCategories: { name: string; revenueUsd: number; revenueDisplay: number; quantity: number }[];
  lowStock: { id: string; name: string; stock: number }[];
};

const STATUS_LABEL: Record<string, string> = {
  PENDING: "Pendientes",
  CONFIRMED: "Confirmadas",
  PREPARING: "En preparación",
  SHIPPED: "Enviadas",
  DELIVERED: "Entregadas",
  CANCELLED: "Canceladas",
};
const DELIVERY_LABEL: Record<string, string> = { PICKUP: "Retiro en tienda", DELIVERY: "Envío a domicilio" };
const PAYMENT_LABEL: Record<string, string> = { CASH: "Efectivo", TRANSFER: "Transferencia" };

const RANGE_LABEL: Record<number, string> = {
  7: "Últimos 7 días",
  14: "Últimos 14 días",
  30: "Últimos 30 días",
  90: "Últimos 90 días",
};

const shortDate = (iso: string) => {
  const [, m, d] = iso.split("-");
  return `${d}/${m}`;
};
const longDate = (iso: string) => {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
};

/** Barra de porcentaje horizontal reutilizable. */
function BarRow({ label, value, max, extra }: { label: string; value: number; max: number; extra?: string }) {
  const pct = max > 0 ? Math.max(3, Math.round((value / max) * 100)) : 0;
  return (
    <li className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1">
      <span className="truncate text-sm text-ink">{label}</span>
      <span className="tabular-nums text-xs text-muted">
        {value}
        {extra ? ` · ${extra}` : ""}
      </span>
      <div className="col-span-2 h-1.5 overflow-hidden rounded-full bg-line/60">
        <div className="h-full rounded-full bg-primary/80" style={{ width: `${pct}%` }} />
      </div>
    </li>
  );
}

export function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState(14);

  const load = (days = range) => {
    setLoading(true);
    setError(null);
    fetch(`/api/admin/stats?days=${days}`)
      .then(async (r) => {
        if (!r.ok) throw new Error("No pudimos cargar las estadísticas.");
        return r.json();
      })
      .then(setStats)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load(range);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range]);

  const maxDay = useMemo(
    () => Math.max(1, ...(stats?.days ?? []).map((d) => d.total)),
    [stats],
  );

  if (loading && !stats) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-28 animate-pulse rounded-card border border-line bg-surface" />
        ))}
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="rounded-card border border-line bg-surface p-6 text-center">
        <p className="text-sm text-danger">{error ?? "Sin datos."}</p>
        <button
          onClick={() => load()}
          className="mt-3 inline-flex items-center gap-1.5 rounded-control border border-line px-3 py-1.5 text-xs text-ink hover:border-primary hover:text-primary"
        >
          <ArrowClockwise size={14} /> Reintentar
        </button>
      </div>
    );
  }

  const { cards } = stats;
  const money = (n: number) => formatMoney(n, stats.currency);
  const margin = cards.inventoryRetail - cards.inventoryCost;
  const maxStatus = Math.max(1, ...Object.values(stats.byStatus));
  const maxProducts = Math.max(1, ...stats.topProducts.map((p) => p.quantity));
  const maxBrands = Math.max(1, ...stats.topBrands.map((p) => p.quantity));
  const maxCats = Math.max(1, ...stats.topCategories.map((p) => p.revenueDisplay));
  const deliveryTotal = Object.values(stats.byDelivery).reduce((a, b) => a + b, 0) || 1;
  const paymentTotal = Object.values(stats.byPayment).reduce((a, b) => a + b, 0) || 1;

  const kpis = [
    { icon: CurrencyCircleDollar, label: "Ingresos (sin canceladas)", value: formatMoney(cards.revenue, stats.currency), hint: `${cards.reservations} reservas` },
    { icon: Receipt, label: "Reservas totales", value: String(cards.reservations), hint: `${cards.pending} pendientes · ${cards.delivered} entregadas` },
    { icon: TrendUp, label: "Ticket medio", value: money(cards.avgTicket), hint: "por reserva" },
    { icon: Users, label: "Clientes", value: String(cards.users), hint: `+${cards.newUsers30} este mes` },
    { icon: Package, label: "Productos", value: String(cards.products), hint: `${cards.hiddenProducts} ocultos · ${cards.categories} categorías` },
    { icon: Warning, label: "Stock bajo", value: String(cards.lowStock), hint: "3 unidades o menos" },
    { icon: Bank, label: "Inventario al costo", value: money(cards.inventoryCost), hint: `venta ${money(cards.inventoryRetail)}` },
    { icon: Crown, label: "Margen potencial", value: money(margin), hint: "venta − costo" },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-3 print:hidden">
        <div>
          <h2 className="text-h3">Resumen de la tienda</h2>
          <p className="mt-1 text-xs text-muted">
            Datos en vivo desde la base de datos. Gráfico de ventas en USD.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={range}
            onChange={(e) => setRange(Number(e.target.value))}
            aria-label="Periodo del gráfico"
            className="rounded-control border border-line bg-surface px-3 py-1.5 text-xs text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
          >
            {[7, 14, 30, 90].map((d) => (
              <option key={d} value={d}>
                {RANGE_LABEL[d]}
              </option>
            ))}
          </select>
          <button
            onClick={() => load()}
            className="inline-flex items-center gap-1.5 rounded-control border border-line px-3 py-1.5 text-xs text-ink transition-colors hover:border-primary hover:text-primary"
          >
            <ArrowClockwise size={14} /> Actualizar
          </button>
          <a
            href={`/api/admin/report/pdf?days=${range}`}
            className="inline-flex items-center gap-1.5 rounded-control bg-primary px-3 py-1.5 text-xs font-medium text-on-primary transition-opacity hover:opacity-90"
          >
            <FilePdf size={14} /> Descargar PDF
          </a>
        </div>
      </div>

      {/* Tarjetas KPI */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((k) => {
          const Icon = k.icon;
          return (
            <div key={k.label} className="rounded-card border border-line bg-surface p-4">
              <div className="flex items-center gap-2 text-muted">
                <Icon size={16} weight="duotone" />
                <span className="text-[11px] uppercase tracking-[0.12em]">{k.label}</span>
              </div>
              <p className="mt-2 font-display text-2xl tabular-nums text-ink">{k.value}</p>
              <p className="mt-0.5 text-[11px] text-muted">{k.hint}</p>
            </div>
          );
        })}
      </div>

      {/* Gráfico principal: ventas por día en la moneda del panel */}
      <section className="rounded-card border border-line bg-surface p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="text-h4">Ventas de los {range} días</h3>
          <p className="text-xs text-muted">Montos en {stats.currency}</p>
        </div>
        <p className="mt-1 text-xs text-muted">
          {money(cards.rangeRevenue)} en {cards.rangeCount} reserva{cards.rangeCount === 1 ? "" : "s"} · promedio{" "}
          {money(cards.rangeCount ? cards.rangeRevenue / cards.rangeCount : 0)} por día con ventas
        </p>
        {/* `items-stretch` + `h-full`: sin altura definida el `height: X%` de la
            barra se resuelve contra `auto` y queda en 0. */}
        <div className="mt-6 flex h-44 items-stretch gap-1">
          {stats.days.map((d) => {
            const h = Math.max(2, Math.round((d.total / maxDay) * 100));
            return (
              <div key={d.date} className="group flex h-full flex-1 flex-col items-center justify-end">
                <span className="mb-1 hidden text-[10px] tabular-nums text-muted group-hover:block">
                  {money(d.total)}
                </span>
                <div
                  className="w-full rounded-t-sm bg-primary/70 transition-colors group-hover:bg-primary"
                  style={{ height: `${h}%` }}
                  title={`${longDate(d.date)}: ${money(d.total)} · ${d.count} reservas`}
                />
              </div>
            );
          })}
        </div>
        <div className="mt-2 flex justify-between text-[10px] tabular-nums text-muted">
          <span>{shortDate(stats.days[0]?.date ?? "")}</span>
          <span>{shortDate(stats.days[Math.floor(stats.days.length / 2)]?.date ?? "")}</span>
          <span>{shortDate(stats.days[stats.days.length - 1]?.date ?? "")}</span>
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Reservas por estado */}
        <section className="rounded-card border border-line bg-surface p-5">
          <h3 className="text-h4">Reservas por estado</h3>
          <ul className="mt-4 space-y-3">
            {Object.entries(STATUS_LABEL).map(([key, label]) => (
              <BarRow
                key={key}
                label={label}
                value={stats.byStatus[key] ?? 0}
                max={maxStatus}
              />
            ))}
          </ul>
        </section>

        {/* Entrega y pago */}
        <section className="rounded-card border border-line bg-surface p-5">
          <h3 className="text-h4">Entrega y forma de pago</h3>
          <div className="mt-4 grid gap-6 sm:grid-cols-2">
            <div>
              <p className="flex items-center gap-1.5 text-[11px] uppercase tracking-[0.12em] text-muted">
                <Truck size={13} /> Entrega
              </p>
              <ul className="mt-2 space-y-2">
                {Object.keys(stats.byDelivery).length === 0 ? (
                  <li className="text-xs text-muted">Sin datos.</li>
                ) : (
                  Object.entries(stats.byDelivery).map(([k, v]) => (
                    <li key={k} className="flex items-baseline justify-between gap-2 text-sm">
                      <span className="text-ink">{DELIVERY_LABEL[k] ?? k}</span>
                      <span className="tabular-nums text-muted">
                        {v} · {Math.round((v / deliveryTotal) * 100)}%
                      </span>
                    </li>
                  ))
                )}
              </ul>
            </div>
            <div>
              <p className="flex items-center gap-1.5 text-[11px] uppercase tracking-[0.12em] text-muted">
                <Bank size={13} /> Pago
              </p>
              <ul className="mt-2 space-y-2">
                {Object.keys(stats.byPayment).length === 0 ? (
                  <li className="text-xs text-muted">Sin datos.</li>
                ) : (
                  Object.entries(stats.byPayment).map(([k, v]) => (
                    <li key={k} className="flex items-baseline justify-between gap-2 text-sm">
                      <span className="text-ink">{PAYMENT_LABEL[k] ?? k}</span>
                      <span className="tabular-nums text-muted">
                        {v} · {Math.round((v / paymentTotal) * 100)}%
                      </span>
                    </li>
                  ))
                )}
              </ul>
            </div>
          </div>
        </section>

        {/* Más vendidos */}
        <section className="rounded-card border border-line bg-surface p-5">
          <h3 className="text-h4">Más vendidos</h3>
          {stats.topProducts.length === 0 ? (
            <p className="mt-3 text-xs text-muted">Todavía no hay ventas registradas.</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {stats.topProducts.map((p) => (
                <BarRow key={p.name} label={p.name} value={p.quantity} max={maxProducts} />
              ))}
            </ul>
          )}
        </section>

        {/* Marcas */}
        <section className="rounded-card border border-line bg-surface p-5">
          <h3 className="text-h4">Marcas con más salida</h3>
          {stats.topBrands.length === 0 ? (
            <p className="mt-3 text-xs text-muted">Todavía no hay ventas registradas.</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {stats.topBrands.map((p) => (
                <BarRow key={p.name} label={p.name} value={p.quantity} max={maxBrands} />
              ))}
            </ul>
          )}
        </section>
      </div>

      {/* Ingresos por categoría + stock bajo */}
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-card border border-line bg-surface p-5">
          <h3 className="text-h4">Ingresos por familia olfativa</h3>
          <p className="mt-1 text-xs text-muted">En {stats.currency}, según lo vendido.</p>
          {stats.topCategories.length === 0 ? (
            <p className="mt-3 text-xs text-muted">Sin ventas para agrupar.</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {stats.topCategories.map((c) => (
                <BarRow
                  key={c.name}
                  label={c.name}
                  value={c.quantity}
                  max={Math.max(1, ...stats.topCategories.map((x) => x.quantity))}
                  extra={`${money(c.revenueDisplay)} · ${Math.round((c.revenueDisplay / maxCats) * 100)}%`}
                />
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-card border border-line bg-surface p-5">
          <h3 className="text-h4">Productos por reponer</h3>
          {stats.lowStock.length === 0 ? (
            <p className="mt-3 text-xs text-muted">Todo el catálogo tiene stock suficiente.</p>
          ) : (
            <ul className="mt-4 divide-y divide-line">
              {stats.lowStock.map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                  <span className="truncate text-ink">{p.name}</span>
                  <span className={`tabular-nums font-medium ${p.stock === 0 ? "text-danger" : "text-muted"}`}>
                    {p.stock === 0 ? "agotado" : `${p.stock} u.`}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {/* Pie de reporte, sólo al imprimir */}
      <p className="hidden text-[10px] text-muted print:block">
        Reporte generado el {new Date().toLocaleString("es-CU")} · periodo: {RANGE_LABEL[range]}.
      </p>
    </div>
  );
}
