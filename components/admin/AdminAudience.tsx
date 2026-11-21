"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ArrowClockwise,
  Eye,
  ShoppingBag,
  Storefront,
  UsersThree,
  User,
  LinkSimple,
} from "@phosphor-icons/react/dist/ssr";
import { formatMoney, findCurrency, type Currency } from "@/lib/currency";

type Audience = {
  summary: {
    visitorsToday: number;
    visitorsTodayManager: number;
    visitorsTodayDirect: number;
    visitors7d: number;
    visitors7dManager: number;
    visitors7dDirect: number;
    cartBrowsers: number;
    cartAdds: number;
    cartAddsManager: number;
    cartAddsDirect: number;
  };
  days: { day: string; label: string; total: number; manager: number; direct: number }[];
  byManager: { managerId: string; name: string; visitors: number; today: number }[];
  carts: {
    id: string;
    visitorId: string;
    source: "MANAGER" | "DIRECT";
    managerName: string | null;
    productId: string | null;
    productName: string;
    quantity: number;
    unitPrice: number;
    currency: string;
    createdAt: string;
    customer: { name: string | null; email: string | null } | null;
  }[];
};

/**
 * Audiencia: quién entra a la tienda y quién está armando un carrito, separando
 * siempre el canal por el que llegó (enlace de un gestor o la tienda directa).
 *
 * Los visitantes son navegadores distintos, no recargas: una misma persona que
 * vuelve a entrar el mismo día cuenta una sola vez. El carrito muestra cada vez
 * que alguien agregó un producto, con o sin cuenta.
 */
export function AdminAudience({ currencies }: { currencies: Currency[] }) {
  const [data, setData] = useState<Audience | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [channel, setChannel] = useState<"ALL" | "MANAGER" | "DIRECT">("ALL");

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await fetch("/api/admin/audience", { cache: "no-store" });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(true);
        setData(null);
      } else {
        setData(d as Audience);
      }
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const money = (amount: number, code: string) =>
    formatMoney(amount, findCurrency(currencies, code));

  const relTime = (iso: string) => {
    const diff = Date.now() - new Date(iso).getTime();
    const min = Math.round(diff / 60000);
    if (min < 1) return "hace un momento";
    if (min < 60) return `hace ${min} min`;
    const h = Math.round(min / 60);
    if (h < 24) return `hace ${h} h`;
    const d = Math.round(h / 24);
    return `hace ${d} d`;
  };

  const carts = (data?.carts ?? []).filter((c) =>
    channel === "ALL" ? true : c.source === channel,
  );

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-h2">Audiencia</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted">
            Quién visita la tienda y quién está armando un carrito. Cada persona se cuenta
            una vez al día y siempre se ve si llegó por el enlace de un gestor o directo a la tienda.
          </p>
        </div>
        <button
          onClick={load}
          className="flex items-center gap-2 rounded-control border border-line px-3 py-2 text-sm text-muted transition-colors hover:text-ink"
        >
          <ArrowClockwise size={15} className={loading ? "animate-spin" : undefined} /> Actualizar
        </button>
      </div>

      {loading && !data ? (
        <p className="mt-6 text-sm text-muted">Contando visitas…</p>
      ) : error ? (
        <p className="mt-6 text-sm text-danger">
          No pudimos cargar la audiencia. Probá con “Actualizar”.
        </p>
      ) : data ? (
        <div className="mt-6 space-y-8">
          {/* Cifras clave */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Stat
              icon={<Eye size={16} />}
              label="Visitantes hoy"
              value={data.summary.visitorsToday}
              hint={`${data.summary.visitorsTodayManager} por gestor · ${data.summary.visitorsTodayDirect} directo`}
            />
            <Stat
              icon={<Eye size={16} />}
              label="Últimos 7 días"
              value={data.summary.visitors7d}
              hint={`${data.summary.visitors7dManager} por gestor · ${data.summary.visitors7dDirect} directo`}
            />
            <Stat
              icon={<ShoppingBag size={16} />}
              label="Carritos armados"
              value={data.summary.cartAdds}
              hint={`${data.summary.cartAddsManager} por gestor · ${data.summary.cartAddsDirect} directo`}
            />
            <Stat
              icon={<User size={16} />}
              label="Personas, último"
              value={data.summary.cartBrowsers}
              hint="navegadores distintos con productos en el carrito"
            />
          </div>

          {/* Visitas por día */}
          <section>
            <h2 className="text-h3">Visitas por día</h2>
            <p className="mt-1 text-sm text-muted">
              Personas distintas que entraron cada día, separando el canal.
            </p>
            <div className="mt-4 space-y-2">
              {data.days.map((d) => {
                const max = Math.max(1, ...data.days.map((x) => x.total));
                return (
                  <div key={d.day} className="flex items-center gap-3">
                    <span className="w-14 shrink-0 text-xs tabular-nums text-muted">{d.label}</span>
                    <div className="flex h-6 flex-1 overflow-hidden rounded-control bg-line/40">
                      {d.manager > 0 && (
                        <div
                          className="h-full bg-accent"
                          style={{ width: `${(d.manager / max) * 100}%` }}
                          title={`${d.manager} por gestor`}
                        />
                      )}
                      {d.direct > 0 && (
                        <div
                          className="h-full bg-primary"
                          style={{ width: `${(d.direct / max) * 100}%` }}
                          title={`${d.direct} directo`}
                        />
                      )}
                    </div>
                    <span className="w-8 shrink-0 text-right text-xs tabular-nums text-ink">
                      {d.total}
                    </span>
                  </div>
                );
              })}
            </div>
            <div className="mt-3 flex flex-wrap gap-4 text-xs text-muted">
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-accent" /> Por enlace de gestor
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-primary" /> Directo a la tienda
              </span>
            </div>
          </section>

          {/* Por gestor */}
          <section>
            <h2 className="text-h3">Visitas por gestor</h2>
            <p className="mt-1 text-sm text-muted">Últimos 7 días.</p>
            {data.byManager.length === 0 ? (
              <p className="mt-4 rounded-card border border-dashed border-line bg-surface p-4 text-sm text-muted">
                Todavía no entró nadie por el enlace de un gestor esta semana.
              </p>
            ) : (
              <div className="mt-4 overflow-hidden rounded-card border border-line">
                <table className="w-full text-sm">
                  <thead className="bg-surface text-left text-xs text-muted">
                    <tr>
                      <th className="px-4 py-2 font-medium">Gestor</th>
                      <th className="px-4 py-2 text-right font-medium">Visitantes</th>
                      <th className="px-4 py-2 text-right font-medium">Hoy</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.byManager.map((m) => (
                      <tr key={m.managerId} className="border-t border-line">
                        <td className="px-4 py-2 text-ink">{m.name}</td>
                        <td className="px-4 py-2 text-right tabular-nums text-ink">{m.visitors}</td>
                        <td className="px-4 py-2 text-right tabular-nums text-muted">{m.today}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* Carritos */}
          <section>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-h3">Carritos</h2>
                <p className="mt-1 text-sm text-muted">
                  Cada vez que alguien agregó un producto, con o sin cuenta.
                </p>
              </div>
              <div className="flex gap-1 rounded-control border border-line p-1">
                {(
                  [
                    { id: "ALL", label: "Todos" },
                    { id: "MANAGER", label: "Por gestor" },
                    { id: "DIRECT", label: "Directo" },
                  ] as const
                ).map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() => setChannel(opt.id)}
                    className={`rounded-control px-3 py-1.5 text-xs transition-colors ${
                      channel === opt.id
                        ? "bg-primary text-on-primary"
                        : "text-muted hover:text-ink"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {carts.length === 0 ? (
              <p className="mt-4 rounded-card border border-dashed border-line bg-surface p-4 text-sm text-muted">
                No hay carritos con ese filtro todavía. Cuando alguien agregue un producto vas a
                verlo acá.
              </p>
            ) : (
              <div className="mt-4 divide-y divide-line rounded-card border border-line">
                {carts.map((c) => (
                  <div key={c.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                    <span
                      className={`flex items-center gap-1 rounded-control px-2 py-1 text-xs ${
                        c.source === "MANAGER"
                          ? "bg-accent/15 text-ink"
                          : "bg-primary/10 text-ink"
                      }`}
                    >
                      {c.source === "MANAGER" ? <LinkSimple size={12} /> : <Storefront size={12} />}
                      {c.source === "MANAGER" ? c.managerName ?? "Gestor" : "Tienda directa"}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm text-ink">
                        {c.productName}
                        {c.quantity > 1 && (
                          <span className="text-muted"> × {c.quantity}</span>
                        )}
                      </p>
                      <p className="text-xs text-muted">
                        {c.customer?.name || c.customer?.email || "visitante sin cuenta"} ·{" "}
                        {relTime(c.createdAt)}
                      </p>
                    </div>
                    <span className="text-sm tabular-nums text-ink">
                      {money(c.unitPrice * c.quantity, c.currency)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      ) : null}
    </div>
  );
}

function Stat({
  icon,
  label,
  value,
  hint,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  hint?: string;
}) {
  return (
    <div className="rounded-card border border-line bg-surface p-4">
      <span className="flex items-center gap-1.5 text-xs text-muted">
        {icon} {label}
      </span>
      <p className="mt-1 text-h3 tabular-nums text-ink">{value}</p>
      {hint && <p className="mt-0.5 text-xs text-muted">{hint}</p>}
    </div>
  );
}
