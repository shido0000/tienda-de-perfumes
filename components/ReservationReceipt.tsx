"use client";

import Link from "next/link";
import { CheckCircle, WhatsappLogo } from "@phosphor-icons/react/dist/ssr";
import type { StoreSettings } from "@/lib/cart-context";
import { formatMoney, findCurrency } from "@/lib/currency";
import {
  DELIVERY_LABEL,
  PAYMENT_LABEL,
  STATUS_LABEL,
  type ReservationDTO,
} from "@/lib/types";

/**
 * Builds the WhatsApp receipt text. Both recipients (store and customer) get
 * the same body so there is a single source of truth for what was ordered.
 */
export function buildReceiptMessage(
  reservation: ReservationDTO,
  settings: StoreSettings,
  recipient: "store" | "customer",
  customerEmail?: string | null,
) {
  const cur = findCurrency(settings.currencies, reservation.currency);
  const lines = reservation.items
    .map(
      (i) =>
        `• ${i.quantity}× ${i.name} (${i.brand}) — ${formatMoney(
          i.priceConverted * i.quantity,
          cur,
        )}`,
    )
    .join("\n");

  const header =
    recipient === "store"
      ? `Hola ${settings.brand}, envío el comprobante de mi reserva.`
      : `Hola, te comparto el comprobante de mi reserva en ${settings.brand}.`;

  const parts = [
    header,
    "",
    `Código: ${reservation.code}`,
    `Estado: ${STATUS_LABEL[reservation.status] ?? reservation.status}`,
    "",
    "Productos:",
    lines,
    "",
    `Subtotal: ${formatMoney(reservation.subtotal, cur)}`,
    `Envío: ${formatMoney(reservation.shippingCost, cur)}`,
    `Total: ${formatMoney(reservation.total, cur)} (${reservation.currency})`,
    "",
    `Entrega: ${DELIVERY_LABEL[reservation.deliveryType] ?? reservation.deliveryType}`,
    reservation.deliveryType === "DELIVERY" && reservation.address
      ? `Dirección: ${reservation.address}`
      : `Retiro en: ${settings.storeAddress}`,
    reservation.distanceKm !== null ? `Distancia: ${reservation.distanceKm.toFixed(2)} km` : null,
    `Pago: ${PAYMENT_LABEL[reservation.paymentMethod] ?? reservation.paymentMethod}`,
    customerEmail ? `Cliente: ${customerEmail}` : null,
    reservation.customerNote ? `Nota: ${reservation.customerNote}` : null,
  ];

  return parts.filter((p) => p !== null).join("\n");
}

export function WhatsAppReceiptButtons({
  reservation,
  settings,
  customerEmail,
  compact = false,
}: {
  reservation: ReservationDTO;
  settings: StoreSettings;
  customerEmail?: string | null;
  compact?: boolean;
}) {
  const storeHref = `https://wa.me/${settings.whatsapp}?text=${encodeURIComponent(
    buildReceiptMessage(reservation, settings, "store", customerEmail),
  )}`;

  const customerDigits = (customerEmail ?? "").replace(/\D/g, "");
  const customerHref = customerDigits
    ? `https://wa.me/${customerDigits}?text=${encodeURIComponent(
        buildReceiptMessage(reservation, settings, "customer", customerEmail),
      )}`
    : null;

  const base =
    "flex items-center justify-center gap-2 rounded-control px-4 text-sm transition-colors duration-200 ease-theme";
  const size = compact ? "py-2" : "py-2.5";

  return (
    <div className={`grid gap-2 ${compact ? "sm:grid-cols-2" : "sm:grid-cols-2"}`}>
      <a
        href={storeHref}
        target="_blank"
        rel="noopener noreferrer"
        className={`${base} ${size} border border-primary/50 text-primary hover:bg-primary hover:text-on-primary`}
      >
        <WhatsappLogo size={17} weight="duotone" />
        Comprobante a la tienda
      </a>
      {customerHref ? (
        <a
          href={customerHref}
          target="_blank"
          rel="noopener noreferrer"
          className={`${base} ${size} border border-line text-ink hover:border-primary hover:text-primary`}
        >
          <WhatsappLogo size={17} weight="duotone" />
          Comprobante a mi WhatsApp
        </a>
      ) : (
        <span
          title="Agregá tu número con código de país para enviarte el comprobante"
          className={`${base} ${size} border border-line/60 text-muted`}
        >
          <WhatsappLogo size={17} weight="duotone" />
          Falta tu número
        </span>
      )}
    </div>
  );
}

export function ReservationReceipt({
  reservation,
  settings,
  customerEmail,
  success = false,
}: {
  reservation: ReservationDTO;
  settings: StoreSettings;
  customerEmail?: string | null;
  success?: boolean;
}) {
  const cur = findCurrency(settings.currencies, reservation.currency);

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-16 sm:px-6">
      {success && (
        <div className="mb-8 flex items-start gap-3 rounded-card border border-primary/40 bg-primary/5 p-5">
          <CheckCircle size={22} weight="duotone" className="mt-0.5 shrink-0 text-primary" />
          <div>
            <p className="font-display text-h3 text-ink">Reserva generada</p>
            <p className="mt-1 text-sm leading-relaxed text-muted">
              Guardamos tu reserva. La tienda la revisa y te escribe por WhatsApp
              para confirmar el pago y la entrega.
            </p>
          </div>
        </div>
      )}

      <div className="rounded-card border border-line bg-surface p-6">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line pb-5">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-muted">
              Código de reserva
            </p>
            <p className="mt-1 font-display text-2xl tabular-nums text-primary">
              {reservation.code}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs uppercase tracking-[0.18em] text-muted">Estado</p>
            <p className="mt-1 text-sm text-ink">
              {STATUS_LABEL[reservation.status] ?? reservation.status}
            </p>
          </div>
        </div>

        <ul className="mt-5 space-y-3">
          {reservation.items.map((item) => (
            <li key={item.id} className="flex justify-between gap-4 text-sm">
              <span className="min-w-0">
                <span className="block truncate text-ink">{item.name}</span>
                <span className="text-xs text-muted">
                  {item.brand} · ×{item.quantity} · precio original{" "}
                  {formatMoney(
                    item.priceOriginal,
                    findCurrency(settings.currencies, item.currencyOriginal),
                  )}
                </span>
              </span>
              <span className="shrink-0 tabular-nums text-ink">
                {formatMoney(item.priceConverted * item.quantity, cur)}
              </span>
            </li>
          ))}
        </ul>

        <dl className="mt-5 space-y-2 border-t border-line pt-4 text-sm">
          <div className="flex justify-between">
            <dt className="text-muted">Subtotal</dt>
            <dd className="tabular-nums text-ink">{formatMoney(reservation.subtotal, cur)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted">
              Envío{" "}
              {reservation.deliveryType === "DELIVERY" && reservation.distanceKm !== null
                ? `(${reservation.distanceKm.toFixed(2)} km)`
                : "(retiro en tienda)"}
            </dt>
            <dd className="tabular-nums text-ink">{formatMoney(reservation.shippingCost, cur)}</dd>
          </div>
          <div className="flex justify-between border-t border-line pt-3">
            <dt className="text-ink">Total</dt>
            <dd className="font-display text-xl tabular-nums text-primary">
              {formatMoney(reservation.total, cur)}
            </dd>
          </div>
        </dl>

        <div className="mt-5 grid gap-3 border-t border-line pt-4 text-sm sm:grid-cols-2">
          <div>
            <p className="text-xs uppercase tracking-[0.14em] text-muted">Entrega</p>
            <p className="mt-1 text-ink">
              {DELIVERY_LABEL[reservation.deliveryType] ?? reservation.deliveryType}
            </p>
            <p className="mt-1 text-xs leading-relaxed text-muted">
              {reservation.deliveryType === "DELIVERY"
                ? reservation.address
                : settings.storeAddress}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.14em] text-muted">Pago</p>
            <p className="mt-1 text-ink">
              {PAYMENT_LABEL[reservation.paymentMethod] ?? reservation.paymentMethod}
            </p>
            {reservation.paymentMethod === "TRANSFER" && (
              <p className="mt-1 text-xs leading-relaxed text-muted">
                Te enviamos los datos bancarios por WhatsApp; la reserva queda
                pendiente hasta confirmar la transferencia.
              </p>
            )}
          </div>
        </div>

        {reservation.customerNote && (
          <div className="mt-4 border-t border-line pt-4">
            <p className="text-xs uppercase tracking-[0.14em] text-muted">Tu nota</p>
            <p className="mt-1 text-sm text-ink">{reservation.customerNote}</p>
          </div>
        )}

        <div className="mt-6">
          <WhatsAppReceiptButtons
            reservation={reservation}
            settings={settings}
            customerEmail={customerEmail}
          />
          <p className="mt-2 text-[11px] leading-relaxed text-muted">
            El comprobante incluye código, productos, cantidades, total, moneda,
            método de pago y tipo de entrega.
          </p>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <Link
          href="/mis-reservas"
          className="rounded-control border border-line px-4 py-2 text-sm text-ink transition-colors hover:border-primary hover:text-primary"
        >
          Ver mis reservas
        </Link>
        <Link
          href="/"
          className="rounded-control px-4 py-2 text-sm text-muted transition-colors hover:text-primary"
        >
          Seguir mirando el catálogo
        </Link>
      </div>
    </div>
  );
}
