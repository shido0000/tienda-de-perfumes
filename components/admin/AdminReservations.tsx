"use client";

import { useState } from "react";
import { useToast } from "@/components/ui/ToastProvider";
import { formatMoney, findCurrency } from "@/lib/currency";
import { formatDateTime } from "@/lib/format-date";
import type { Currency } from "@/lib/currency";
import { WhatsappLogo, Copy } from "@phosphor-icons/react/dist/ssr";
import {
  buildTemplate,
  TEMPLATE_LABEL,
  waLink,
  type TemplateKind,
} from "@/lib/whatsapp-templates";
import {
  DELIVERY_LABEL,
  PAYMENT_LABEL,
  STATUS_LABEL,
  type ReservationDTO,
} from "@/lib/types";

type AdminReservation = ReservationDTO & {
  user: { email: string; name: string | null; phone: string | null };
};

const STATUS_OPTIONS = [
  "PENDING",
  "CONFIRMED",
  "PREPARING",
  "SHIPPED",
  "DELIVERED",
  "CANCELLED",
];

export function AdminReservations({
  initialReservations,
  currencies,
}: {
  initialReservations: AdminReservation[];
  currencies: Currency[];
}) {
  const [reservations, setReservations] = useState(initialReservations);
  const [filter, setFilter] = useState("all");
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();

  /** Copia el mensaje al porta-papeles sin abrir WhatsApp. */
  const copyMessage = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Mensaje copiado", "Pegalo en WhatsApp, SMS o donde quieras.");
    } catch {
      toast.error("No se pudo copiar", "Tu navegador bloqueó el porta-papeles.");
    }
  };

  const visible =
    filter === "all" ? reservations : reservations.filter((r) => r.status === filter);

  const changeStatus = async (r: AdminReservation, status: string) => {
    setError(null);
    const res = await fetch(`/api/admin/reservations?id=${encodeURIComponent(r.id)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error ?? "No pudimos actualizar el estado.");
      return;
    }
    setReservations((prev) =>
      prev.map((x) => (x.id === r.id ? { ...x, status } : x)),
    );
    toast.success(
      "Estado actualizado",
      `${r.code} pasó a ${STATUS_LABEL[status as keyof typeof STATUS_LABEL] ?? status}.`,
    );
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-h3">Reservas ({reservations.length})</h2>
        <label className="text-xs uppercase tracking-[0.14em] text-muted">
          Estado{" "}
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="ml-2 rounded-control border border-line bg-bg px-2 py-1.5 text-xs normal-case tracking-normal text-ink"
          >
            <option value="all">Todas</option>
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABEL[s]}
              </option>
            ))}
          </select>
        </label>
      </div>

      {error && (
        <p role="alert" className="mt-3 rounded-control border border-danger/40 bg-danger/10 px-3 py-2 text-xs text-danger">
          {error}
        </p>
      )}

      {visible.length === 0 ? (
        <p className="mt-6 rounded-card border border-dashed border-line px-6 py-12 text-center text-sm text-muted">
          No hay reservas con este filtro.
        </p>
      ) : (
        <ul className="mt-5 space-y-3">
          {visible.map((r) => {
            const cur = findCurrency(currencies, r.currency);
            return (
              <li key={r.id} className="rounded-card border border-line bg-surface p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-display text-lg tabular-nums text-primary">{r.code}</p>
                    <p className="mt-0.5 text-xs text-muted">
                      {formatDateTime(r.createdAt)}{" "}
                      · {r.user.email}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <p className="font-display text-lg tabular-nums text-ink">
                      {formatMoney(r.total, cur)}
                    </p>
                    <select
                      value={r.status}
                      onChange={(e) => changeStatus(r, e.target.value)}
                      aria-label={`Estado de la reserva ${r.code}`}
                      className="rounded-control border border-line bg-bg px-2 py-1.5 text-xs text-ink"
                    >
                      {STATUS_OPTIONS.map((s) => (
                        <option key={s} value={s}>
                          {STATUS_LABEL[s]}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <ul className="mt-3 space-y-1 border-t border-line pt-3 text-sm">
                  {r.items.map((i) => (
                    <li key={i.id} className="flex justify-between gap-4">
                      <span className="min-w-0 truncate text-ink">
                        {i.quantity}× {i.name}{" "}
                        <span className="text-xs text-muted">({i.brand})</span>
                      </span>
                      <span className="shrink-0 tabular-nums text-muted">
                        {formatMoney(i.priceConverted * i.quantity, cur)}
                      </span>
                    </li>
                  ))}
                </ul>

                <div className="mt-3 grid gap-1 border-t border-line pt-3 text-xs text-muted sm:grid-cols-2">
                  <p>
                    Entrega:{" "}
                    <span className="text-ink">
                      {DELIVERY_LABEL[r.deliveryType] ?? r.deliveryType}
                    </span>
                    {r.distanceKm !== null ? ` · ${r.distanceKm.toFixed(2)} km` : ""}
                  </p>
                  <p>
                    Pago:{" "}
                    <span className="text-ink">
                      {PAYMENT_LABEL[r.paymentMethod] ?? r.paymentMethod}
                    </span>
                  </p>
                  {r.address && <p className="sm:col-span-2">Dirección: {r.address}</p>}
                  {r.user.phone && (
                    <p className="sm:col-span-2">
                      Teléfono:{" "}
                      <a
                        href={`https://wa.me/${r.user.phone.replace(/[^\d]/g, "")}?text=${encodeURIComponent(
                          `Hola ${r.user.name ?? ""}, sobre tu reserva ${r.code} en la tienda:`,
                        )}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline"
                      >
                        {r.user.phone} (escribir por WhatsApp)
                      </a>
                    </p>
                  )}
                  {r.transferProofUrl && (
                    <p className="sm:col-span-2">
                      Comprobante de transferencia:{" "}
                      <a
                        href={r.transferProofUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline"
                      >
                        ver imagen
                      </a>
                    </p>
                  )}
                  {r.customerNote && (
                    <p className="sm:col-span-2">Nota del cliente: {r.customerNote}</p>
                  )}
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-line pt-3">
                    <span className="mr-1 text-[11px] uppercase tracking-[0.12em] text-muted">
                      Mensajes
                    </span>
                    {(["ready", "pickupReminder", "proofReminder", "shipped", "thanks"] as TemplateKind[]).map((kind) => {
                      const text = buildTemplate(kind, {
                        customerName: r.user.name,
                        productNames: r.items.map((i) => i.name).join(" + "),
                        code: r.code,
                        storeName: "Mist & Mood",
                        total: r.total,
                        currency: r.currency,
                      });
                      return (
                        <span
                          key={kind}
                          className="flex items-center overflow-hidden rounded-control border border-line"
                        >
                          {r.user.phone && (
                            <a
                              href={waLink(r.user.phone, text)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 px-2.5 py-1.5 text-[11px] text-muted transition-colors hover:bg-primary/5 hover:text-primary"
                            >
                              <WhatsappLogo size={12} /> {TEMPLATE_LABEL[kind]}
                            </a>
                          )}
                          <button
                            type="button"
                            onClick={() => copyMessage(text)}
                            aria-label={`Copiar el mensaje “${TEMPLATE_LABEL[kind]}” de ${r.code}`}
                            title="Copiar mensaje (sin abrir WhatsApp)"
                            className={`flex items-center gap-1 px-2 py-1.5 text-[11px] text-muted transition-colors hover:bg-primary/5 hover:text-primary ${
                              r.user.phone ? "border-l border-line" : "px-2.5"
                            }`}
                          >
                            <Copy size={12} />
                            {!r.user.phone && TEMPLATE_LABEL[kind]}
                          </button>
                        </span>
                      );
                    })}
                  </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
