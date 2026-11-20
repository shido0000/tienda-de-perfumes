"use client";

import { useEffect, useMemo, useState } from "react";
import { formatMoney } from "@/lib/currency";
import { formatDate } from "@/lib/format-date";
import {
  Coins,
  TrendUp,
  Users,
  ShoppingBag,
  Copy,
  Check,
  ArrowUpRight,
  ChartLineUp,
  Percent,
  Wallet,
} from "@phosphor-icons/react/dist/ssr";

type Stats = {
  manager: {
    name: string | null;
    email: string;
    code: string | null;
    active: boolean;
    rateType: "PERCENT" | "FIXED";
    rateValue: number;
  };
  currency: string;
  baseCurrency: string;
  totals: {
    earned: number;
    paid: number;
    pending: number;
    salesCount: number;
    salesTotal: number;
    surcharge: number;
    uniqueVisitors: number;
    buyers: number;
    signedInVisitors: number;
    conversion: number;
  };
  dailyVisits: { day: string; label: string; count: number }[];
  monthly: { key: string; label: string; count: number; commission: number; total: number }[];
  topProducts: { name: string; brand: string; quantity: number; revenue: number }[];
  recentSales: {
    id: string;
    status: string;
    total: number;
    currency: string;
    commission: number;
    settled: boolean;
    createdAt: string;
    items: { name: string; brand: string; quantity: number }[];
  }[];
};

const STATUS_LABEL: Record<string, string> = {
  PENDING: "Pendiente",
  CONFIRMED: "Confirmada",
  PREPARING: "En preparación",
  SHIPPED: "Enviada",
  DELIVERED: "Entregada",
  CANCELLED: "Cancelada",
};

function money(n: number, currency: string) {
  return formatMoney(n, currency);
}

export function ManagerPanel() {
  const [data, setData] = useState<Stats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [origin, setOrigin] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setOrigin(window.location.origin);
    fetch("/api/manager/stats")
      .then(async (r) => {
        const body = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(body.error ?? "No pudimos cargar tus datos.");
        return body as Stats;
      })
      .then(setData)
      .catch((e) => setError(e instanceof Error ? e.message : "Error de red"));
  }, []);

  const link = data?.manager.code ? `${origin}/r/${data.manager.code}` : "";

  const copy = async () => {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard bloqueado: se ignora */
    }
  };

  const maxDaily = useMemo(
    () => Math.max(1, ...(data?.dailyVisits.map((d) => d.count) ?? [1])),
    [data],
  );
  const maxMonthly = useMemo(
    () => Math.max(1, ...(data?.monthly.map((m) => m.commission) ?? [1])),
    [data],
  );

  if (error) {
    return (
      <div className="rounded-card border border-line bg-surface p-8 text-center shadow-sm">
        <p className="text-sm text-danger">{error}</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="space-y-6" aria-busy="true">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-28 animate-pulse rounded-card border border-line bg-surface" />
          ))}
        </div>
        <div className="h-56 animate-pulse rounded-card border border-line bg-surface" />
      </div>
    );
  }

  const { totals, currency, manager } = data;
  const rateLabel =
    manager.rateType === "FIXED"
      ? `${money(manager.rateValue, currency)} por unidad`
      : `${manager.rateValue}% sobre el precio`;

  return (
    <div className="space-y-8">
      {/* Encabezado + enlace */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="brand-tag">Panel del gestor</span>
          <h1 className="mt-3 font-display text-3xl text-ink sm:text-4xl">
            {manager.name || manager.email}
          </h1>
          <p className="mt-1 text-sm text-muted">
            Tu ganancia: <strong className="text-ink">{rateLabel}</strong>
            {!manager.active && (
              <span className="ml-2 rounded-full bg-danger/10 px-2 py-0.5 text-xs text-danger">
                Enlace apagado
              </span>
            )}
          </p>
        </div>
        {link && (
          <div className="w-full max-w-sm rounded-card border border-line bg-surface p-3 shadow-sm sm:w-auto">
            <p className="text-xs uppercase tracking-[0.14em] text-muted">Tu enlace</p>
            <div className="mt-1.5 flex items-center gap-2">
              <code className="min-w-0 flex-1 truncate rounded-control bg-bg px-2 py-1.5 text-xs text-ink">
                {link}
              </code>
              <button
                type="button"
                onClick={copy}
                className="flex items-center gap-1 rounded-control border border-line px-2.5 py-1.5 text-xs text-ink transition-colors duration-200 ease-theme hover:border-primary hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
              >
                {copied ? <Check size={14} weight="bold" /> : <Copy size={14} />}
                {copied ? "Copiado" : "Copiar"}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Tarjetas de ganancias y personas */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={<Coins size={20} weight="duotone" />}
          label="Ganado"
          value={money(totals.earned, currency)}
          hint="Comisiones acumuladas"
          tone="primary"
        />
        <StatCard
          icon={<Wallet size={20} weight="duotone" />}
          label="Pendiente de cobro"
          value={money(totals.pending, currency)}
          hint="Ganado − pagado"
          tone={totals.pending > 0 ? "accent" : "muted"}
        />
        <StatCard
          icon={<Users size={20} weight="duotone" />}
          label="Personas que entraron"
          value={String(totals.uniqueVisitors)}
          hint={`${totals.signedInVisitors} con cuenta iniciada`}
          tone="muted"
        />
        <StatCard
          icon={<ShoppingBag size={20} weight="duotone" />}
          label="Personas que compraron"
          value={String(totals.buyers)}
          hint={`${totals.salesCount} reservas · ${totals.conversion}% conversión`}
          tone="success"
        />
      </div>

      {/* Visitantes por día */}
      <section className="rounded-card border border-line bg-surface p-5 shadow-sm sm:p-6">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 font-display text-xl text-ink">
            <ChartLineUp size={20} className="text-primary" /> Personas por día
          </h2>
          <span className="text-xs text-muted">Últimos 30 días</span>
        </div>
        <div className="mt-5 flex items-end gap-[3px]" style={{ height: 140 }}>
          {data.dailyVisits.map((d) => (
            <div key={d.day} className="group relative flex flex-1 flex-col items-center justify-end">
              <div
                className="w-full rounded-t-[3px] bg-primary/70 transition-colors duration-200 group-hover:bg-primary"
                style={{ height: `${Math.max(2, (d.count / maxDaily) * 130)}px` }}
                title={`${d.label}: ${d.count} ${d.count === 1 ? "persona" : "personas"}`}
              />
            </div>
          ))}
        </div>
        <div className="mt-2 flex justify-between text-[10px] text-muted">
          <span>{data.dailyVisits[0]?.label}</span>
          <span>{data.dailyVisits[Math.floor(data.dailyVisits.length / 2)]?.label}</span>
          <span>{data.dailyVisits[data.dailyVisits.length - 1]?.label}</span>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Comisión por mes */}
        <section className="rounded-card border border-line bg-surface p-5 shadow-sm sm:p-6">
          <h2 className="flex items-center gap-2 font-display text-xl text-ink">
            <TrendUp size={20} className="text-primary" /> Ganancia por mes
          </h2>
          <div className="mt-5 space-y-3">
            {data.monthly.map((m) => (
              <div key={m.key} className="flex items-center gap-3">
                <span className="w-12 shrink-0 text-xs text-muted">{m.label}</span>
                <div className="h-6 flex-1 overflow-hidden rounded-control bg-bg">
                  <div
                    className="flex h-full items-center justify-end rounded-control bg-accent/80 pe-2 transition-all duration-300 ease-theme"
                    style={{ width: `${Math.max(4, (m.commission / maxMonthly) * 100)}%` }}
                  >
                    {m.commission > 0 && (
                      <span className="text-[10px] font-medium tabular-nums text-accent-ink">
                        {money(m.commission, currency)}
                      </span>
                    )}
                  </div>
                </div>
                <span className="w-14 shrink-0 text-right text-[11px] tabular-nums text-muted">
                  {m.count} {m.count === 1 ? "venta" : "ventas"}
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* Perfumes más vendidos */}
        <section className="rounded-card border border-line bg-surface p-5 shadow-sm sm:p-6">
          <h2 className="flex items-center gap-2 font-display text-xl text-ink">
            <Percent size={20} className="text-primary" /> Perfumes más vendidos por tu enlace
          </h2>
          {data.topProducts.length === 0 ? (
            <p className="mt-6 text-sm text-muted">
              Todavía nadie compró por tu enlace. Cuando ocurra, acá verás qué perfumes salen más.
            </p>
          ) : (
            <ul className="mt-5 space-y-2.5">
              {data.topProducts.map((p, i) => (
                <li key={`${p.brand}-${p.name}`} className="flex items-center gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-semibold text-primary tabular-nums">
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-ink">{p.name}</p>
                    <p className="truncate text-xs text-muted">{p.brand}</p>
                  </div>
                  <span className="shrink-0 text-sm font-medium tabular-nums text-ink">
                    {p.quantity}×
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {/* Últimas ventas */}
      <section className="rounded-card border border-line bg-surface shadow-sm">
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <h2 className="font-display text-xl text-ink">Últimas ventas por tu enlace</h2>
          <span className="text-xs text-muted">Total reservado: {money(totals.salesTotal, currency)}</span>
        </div>
        {data.recentSales.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-muted">
            Aún no hay ventas registradas con tu enlace.
          </p>
        ) : (
          <div className="divide-y divide-line">
            {data.recentSales.map((s) => (
              <div key={s.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-ink">
                    {s.items.map((i) => `${i.quantity}× ${i.name}`).join(", ") || "Reserva"}
                  </p>
                  <p className="text-xs text-muted">
                    {formatDate(s.createdAt)} · {STATUS_LABEL[s.status] ?? s.status}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium tabular-nums text-ink">
                    {money(s.commission, s.currency)}
                  </p>
                  <p className="text-[11px] text-muted">
                    {s.settled ? "Pagada" : "Por pagar"}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <p className="flex items-center justify-center gap-1.5 text-center text-xs text-muted">
        <ArrowUpRight size={13} /> Compartí tu enlace: quien compre por él te deja la ganancia que ves acá.
      </p>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  hint,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint?: string;
  tone: "primary" | "accent" | "success" | "muted";
}) {
  const toneClass =
    tone === "primary"
      ? "text-primary"
      : tone === "accent"
        ? "text-accent-ink"
        : tone === "success"
          ? "text-success"
          : "text-muted";
  return (
    <div className="rounded-card border border-line bg-surface p-5 shadow-sm">
      <div className={`flex items-center gap-2 ${toneClass}`}>
        {icon}
        <span className="text-xs uppercase tracking-[0.12em]">{label}</span>
      </div>
      <p className="mt-3 font-display text-2xl tabular-nums text-ink">{value}</p>
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </div>
  );
}
