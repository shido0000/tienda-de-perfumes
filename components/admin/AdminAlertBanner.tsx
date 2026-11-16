"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { WarningCircle, WhatsappLogo, ArrowRight } from "@phosphor-icons/react/dist/ssr";

type Summary = {
  expiring: number;
  pickups: number;
  lowStock: number;
};

const waLink = (phone: string | null, text: string) =>
  `https://wa.me/${(phone ?? "").replace(/[^\d]/g, "")}?text=${encodeURIComponent(text)}`;

/**
 * Franja fija arriba del panel: lo que urge atender hoy, sin tener que entrar a
 * la pestaña Alertas. Si no hay nada pendiente no ocupa espacio.
 */
export function AdminAlertBanner() {
  const [summary, setSummary] = useState<Summary | null>(null);

  useEffect(() => {
    let alive = true;
    Promise.all([
      fetch("/api/admin/expiring-reservations").then((r) => r.json()).catch(() => ({})),
      fetch("/api/admin/pickup-reminders").then((r) => r.json()).catch(() => ({})),
    ])
      .then(([e, p]) => {
        if (!alive) return;
        setSummary({
          expiring: Array.isArray(e.reservations) ? e.reservations.length : 0,
          pickups: Array.isArray(p.reservations) ? p.reservations.length : 0,
          lowStock: Array.isArray(e.lowStock) ? e.lowStock.length : 0,
        });
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  if (!summary) return null;
  const total = summary.expiring + summary.pickups + summary.lowStock;
  if (total === 0) return null;

  return (
    <div className="mb-5 rounded-card border border-primary/40 bg-primary/5 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-start gap-2.5">
          <WarningCircle size={20} weight="duotone" className="mt-0.5 shrink-0 text-primary" />
          <div>
            <p className="text-sm font-medium text-ink">Tenés {total} cosa{total === 1 ? "" : "s"} para atender hoy</p>
            <p className="mt-0.5 text-xs text-muted">
              {summary.expiring > 0 && (
                <span>
                  {summary.expiring} sin comprobante hace +24 h
                </span>
              )}
              {summary.expiring > 0 && (summary.pickups > 0 || summary.lowStock > 0) && " · "}
              {summary.pickups > 0 && <span>{summary.pickups} esperando retiro hace +3 días</span>}
              {summary.pickups > 0 && summary.lowStock > 0 && " · "}
              {summary.lowStock > 0 && <span>{summary.lowStock} por agotarse</span>}
            </p>
          </div>
        </div>
        {/* <Link> (y no <a>): un <a> sale del subcamino del preview y da 404.
            Para que el cambio de pestaña sí se aplique, AdminPanel escucha
            useSearchParams() y ajusta la pestaña activa al cambiar ?tab=. */}
        <Link
          href="/admin?tab=alerts"
          className="flex items-center gap-1.5 rounded-control bg-primary px-3 py-2 text-sm font-medium text-on-primary transition-opacity hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          Ver alertas <ArrowRight size={14} />
        </Link>
      </div>
    </div>
  );
}

export { waLink };
