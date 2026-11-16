"use client";

import { useEffect, useState } from "react";
import { ClockCounterClockwise } from "@phosphor-icons/react/dist/ssr";
import { formatDateTime } from "@/lib/format-date";

type Log = {
  id: string;
  code: string;
  snapshot: Record<string, number>;
  createdAt: string;
};

/**
 * Historial de tipos de cambio. Cada cambio de tasa queda registrado con su
 * fecha, de modo que se puede ver a qué cotización se movió el negocio. Las
 * reservas ya creadas conservan su precio (quedó congelado en la reserva).
 */
export function RateHistory() {
  const [logs, setLogs] = useState<Log[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    fetch("/api/admin/rates")
      .then((r) => r.json())
      .then((d) => setLogs(d.history ?? []))
      .catch(() => setLogs([]))
      .finally(() => setLoading(false));
  }, [open]);

  return (
    <div className="mt-6 border-t border-line pt-4">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 text-xs text-muted transition-colors hover:text-ink"
      >
        <ClockCounterClockwise size={14} />
        {open ? "Ocultar historial de cotizaciones" : "Ver historial de cotizaciones con fecha"}
      </button>

      {open && (
        <div className="mt-3">
          {loading ? (
            <p className="text-xs text-muted">Cargando…</p>
          ) : logs.length === 0 ? (
            <p className="text-xs text-muted">
              Todavía no hay cambios registrados. Cuando modifiques una tasa y guardes,
              aparecerá aquí con su fecha.
            </p>
          ) : (
            <ul className="space-y-2 text-xs">
              {logs.map((l) => (
                <li key={l.id} className="rounded-control border border-line bg-bg/40 px-3 py-2">
                  <p className="text-muted">{formatDateTime(l.createdAt)}</p>
                  <p className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 tabular-nums text-ink">
                    {Object.entries(l.snapshot).map(([code, rate]) => (
                      <span key={code}>
                        {code}: <strong>{rate}</strong>
                      </span>
                    ))}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
