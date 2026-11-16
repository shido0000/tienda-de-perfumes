"use client";

import Link from "next/link";
import { useMemo } from "react";
import {
  Bag,
  Heart,
  CurrencyCircleDollar,
  Package,
  ArrowRight,
  UserCircle,
} from "@phosphor-icons/react/dist/ssr";
import { formatMoney, findCurrency } from "@/lib/currency";
import { formatLongDate } from "@/lib/format-date";
import { STATUS_LABEL, type ReservationDTO } from "@/lib/types";
import type { StoreSettings } from "@/lib/cart-context";

/**
 * Dashboard del cliente: sus compras de un vistazo, más recientes primero.
 */
export function AccountDashboard({
  name,
  email,
  phone,
  reservations,
  settings,
  wishlistCount,
}: {
  name: string | null;
  email: string;
  phone: string | null;
  reservations: ReservationDTO[];
  settings: StoreSettings;
  wishlistCount: number;
}) {
  const currency = useMemo(() => {
    const all = settings.currencies;
    return (
      all.find((c) => c.code === settings.displayCurrency) ??
      all.find((c) => c.code === settings.baseCurrency) ??
      all[0]
    );
  }, [settings.currencies, settings.displayCurrency, settings.baseCurrency]);

  const active = reservations.filter(
    (r) => r.status !== "CANCELLED" && r.status !== "DELIVERED",
  );
  const totalSpent = reservations
    .filter((r) => r.status !== "CANCELLED")
    .reduce((s, r) => s + r.total, 0);
  const totalUnits = reservations
    .filter((r) => r.status !== "CANCELLED")
    .reduce((s, r) => s + r.items.reduce((n, i) => n + i.quantity, 0), 0);

  const cards = [
    { label: "Reservas activas", value: String(active.length), icon: Package },
    {
      label: "Total reservado",
      value: formatMoney(totalSpent, currency),
      icon: CurrencyCircleDollar,
    },
    { label: "Frascos reservados", value: String(totalUnits), icon: Bag },
    { label: "Favoritos", value: String(wishlistCount), icon: Heart },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-h2">Hola, {name?.split(" ")[0] || "cliente"}</h1>
          <p className="mt-2 text-sm text-muted">
            {email}
            {phone ? ` · ${phone}` : ""}
          </p>
        </div>
        <Link
          href="/mi-cuenta/perfil"
          className="flex items-center gap-1.5 rounded-control border border-line px-3 py-2 text-sm text-ink transition-colors hover:border-primary hover:text-primary"
        >
          <UserCircle size={16} weight="duotone" /> Editar mi cuenta
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <div key={c.label} className="rounded-card border border-line bg-surface p-5">
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase tracking-[0.1em] text-muted">{c.label}</span>
                <Icon size={18} className="text-primary" />
              </div>
              <p className="mt-3 font-display text-2xl tabular-nums text-ink">{c.value}</p>
            </div>
          );
        })}
      </div>

      <section className="rounded-card border border-line bg-surface p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-h3">Mis últimas reservas</h2>
          <Link
            href="/mis-reservas"
            className="flex items-center gap-1 text-xs text-primary hover:underline"
          >
            Ver todas <ArrowRight size={12} />
          </Link>
        </div>

        {reservations.length === 0 ? (
          <div className="mt-6 rounded-control border border-dashed border-line px-4 py-10 text-center">
            <p className="text-sm text-muted">
              Todavía no hiciste ninguna reserva. Cuando confirmes una, aparece acá con su
              estado.
            </p>
            <Link
              href="/"
              className="mt-4 inline-block rounded-control bg-primary px-4 py-2 text-sm font-medium text-on-primary hover:opacity-90"
            >
              Ver el catálogo
            </Link>
          </div>
        ) : (
          <ul className="mt-4 divide-y divide-line/60">
            {reservations.slice(0, 5).map((r) => (
              <li key={r.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div>
                  <p className="text-sm font-medium text-ink">
                    {r.code}
                    <span className="ml-2 text-xs font-normal text-muted">
                      {formatLongDate(r.createdAt)}
                    </span>
                  </p>
                  <p className="text-xs text-muted">
                    {r.items.map((i) => `${i.quantity}× ${i.name}`).join(" · ")}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm tabular-nums text-ink">
                    {formatMoney(r.total, findCurrency(settings.currencies, r.currency))}
                  </p>
                  <p className="text-xs text-muted">{STATUS_LABEL[r.status] ?? r.status}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
