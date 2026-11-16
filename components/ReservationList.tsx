"use client";

import Link from "next/link";
import { useState } from "react";
import { CaretDown } from "@phosphor-icons/react/dist/ssr";
import type { StoreSettings } from "@/lib/cart-context";
import { formatMoney, findCurrency } from "@/lib/currency";
import { formatLongDate } from "@/lib/format-date";
import {
  DELIVERY_LABEL,
  PAYMENT_LABEL,
  STATUS_LABEL,
  type ReservationDTO,
} from "@/lib/types";
import { WhatsAppReceiptButtons } from "./ReservationReceipt";
import { ShareCodeButton } from "./ShareCodeButton";
import { reservationStage, stagePath } from "@/lib/reservation-stage";

const TONE_CLASS: Record<string, string> = {
  pending: "border-line bg-bg text-muted",
  info: "border-primary/40 bg-primary/5 text-primary",
  success: "border-primary/50 bg-primary/10 text-primary",
  danger: "border-danger/40 bg-danger/5 text-danger",
};

/** Recorrido de 4 pasos que muestra dónde está la reserva hoy. */
function StageTracker({
  status,
  paymentMethod,
  transferProofUrl,
  deliveryType,
}: {
  status: string;
  paymentMethod: string;
  transferProofUrl: string | null;
  deliveryType: string;
}) {
  const stage = reservationStage({ status, paymentMethod, transferProofUrl, deliveryType });
  const path = stagePath(deliveryType);
  return (
    <div className="rounded-card border border-line bg-bg/50 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={`rounded-full border px-3 py-1 text-xs font-medium ${
            TONE_CLASS[stage.tone] ?? TONE_CLASS.pending
          }`}
        >
          {stage.label}
        </span>
        <span className="text-xs text-muted">{stage.hint}</span>
      </div>
      {!stage.cancelled && (
        <ol className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {path.map((step, i) => {
            const reached = i <= stage.index;
            return (
              <li key={step.key} className="flex items-center gap-2">
                <span
                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-medium tabular-nums ${
                    reached ? "bg-primary text-on-primary" : "border border-line text-muted"
                  }`}
                >
                  {i + 1}
                </span>
                <span className={`text-xs ${reached ? "text-ink" : "text-muted"}`}>
                  {step.label}
                </span>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}

export function ReservationList({
  reservations,
  settings,
  customerEmail,
}: {
  reservations: ReservationDTO[];
  settings: StoreSettings;
  customerEmail: string;
}) {
  const [openId, setOpenId] = useState<string | null>(
    reservations.length ? reservations[0].id : null,
  );

  if (reservations.length === 0) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-24 text-center sm:px-6">
        <h1 className="text-h2">Todavía no tenés reservas</h1>
        <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-muted">
          Cuando confirmes una reserva vas a poder verla acá, con su código, sus
          importes y los botones para reenviar el comprobante por WhatsApp.
        </p>
        <Link
          href="/"
          className="mt-6 inline-block rounded-control bg-primary px-5 py-2.5 text-sm font-medium text-on-primary transition-colors hover:bg-primary/90"
        >
          Ver el catálogo
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6">
      <h1 className="text-h2">Mis reservas</h1>
      <p className="mt-2 text-sm text-muted">
        Solo vos podés ver estas reservas. La tienda confirma cada una por
        WhatsApp.
      </p>

      <ul className="mt-8 space-y-4">
        {reservations.map((r) => {
          const cur = findCurrency(settings.currencies, r.currency);
          const open = openId === r.id;
          return (
            <li key={r.id} className="overflow-hidden rounded-card border border-line bg-surface">
              <button
                onClick={() => setOpenId(open ? null : r.id)}
                aria-expanded={open}
                className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition-colors hover:bg-bg/40"
              >
                <span className="min-w-0">
                  <span className="block font-display text-lg tabular-nums text-primary">
                    {r.code}
                  </span>
                  <span className="mt-0.5 block text-xs text-muted">
                    {formatLongDate(r.createdAt)}{" "}
                    · {DELIVERY_LABEL[r.deliveryType] ?? r.deliveryType}
                  </span>
                </span>
                <span className="flex shrink-0 items-center gap-3">
                  <span className="text-right">
                    <span className="block text-sm tabular-nums text-ink">
                      {formatMoney(r.total, cur)}
                    </span>
                    <span className="block text-[11px] text-muted">
                      {STATUS_LABEL[r.status] ?? r.status}
                    </span>
                  </span>
                  <CaretDown
                    size={16}
                    weight="duotone"
                    className={`text-muted transition-transform duration-200 ease-theme ${
                      open ? "rotate-180" : ""
                    }`}
                  />
                </span>
              </button>

              {open && (
                <div className="border-t border-line px-5 py-5">
                  <div className="mb-4">
                    <StageTracker
                      status={r.status}
                      paymentMethod={r.paymentMethod}
                      transferProofUrl={r.transferProofUrl ?? null}
                      deliveryType={r.deliveryType}
                    />
                  </div>
                  <ul className="space-y-2 text-sm">
                    {r.items.map((item) => (
                      <li key={item.id} className="flex justify-between gap-4">
                        <span className="min-w-0">
                          <span className="block truncate text-ink">{item.name}</span>
                          <span className="text-xs text-muted">
                            {item.brand} · ×{item.quantity}
                          </span>
                        </span>
                        <span className="shrink-0 tabular-nums text-ink">
                          {formatMoney(item.priceConverted * item.quantity, cur)}
                        </span>
                      </li>
                    ))}
                  </ul>

                  <dl className="mt-4 space-y-1.5 border-t border-line pt-3 text-sm">
                    <div className="flex justify-between">
                      <dt className="text-muted">Subtotal</dt>
                      <dd className="tabular-nums text-ink">{formatMoney(r.subtotal, cur)}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-muted">
                        Envío
                        {r.distanceKm !== null ? ` (${r.distanceKm.toFixed(2)} km)` : ""}
                      </dt>
                      <dd className="tabular-nums text-ink">{formatMoney(r.shippingCost, cur)}</dd>
                    </div>
                    <div className="flex justify-between border-t border-line pt-2">
                      <dt className="text-ink">Total</dt>
                      <dd className="font-display text-base tabular-nums text-primary">
                        {formatMoney(r.total, cur)}
                      </dd>
                    </div>
                  </dl>

                  <div className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
                    <p className="text-muted">
                      Entrega:{" "}
                      <span className="text-ink">
                        {DELIVERY_LABEL[r.deliveryType] ?? r.deliveryType}
                      </span>
                    </p>
                    <p className="text-muted">
                      Pago:{" "}
                      <span className="text-ink">
                        {PAYMENT_LABEL[r.paymentMethod] ?? r.paymentMethod}
                      </span>
                    </p>
                  </div>
                  {r.deliveryType === "DELIVERY" && r.address && (
                    <p className="mt-1 text-xs text-muted">Dirección: {r.address}</p>
                  )}

                  <div className="mt-5">
                    <WhatsAppReceiptButtons
                      reservation={r}
                      settings={settings}
                      customerEmail={customerEmail}
                      compact
                    />
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-2 rounded-control border border-line bg-bg/40 px-3 py-2.5">
                    <p className="min-w-0 flex-1 text-xs text-muted">
                      Tu reserva es{" "}
                      <span className="font-medium tabular-nums text-ink">{r.code}</span>. Compartila
                      con la tienda o con quien vaya a retirarla.
                    </p>
                    <ShareCodeButton code={r.code} storeName={settings.brand} />
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
