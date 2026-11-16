"use client";

import { useCallback, useEffect, useState } from "react";
import { Printer, ArrowClockwise, Coins, Receipt, Warning } from "@phosphor-icons/react/dist/ssr";
import { formatMoney, findCurrency, type Currency } from "@/lib/currency";

type CashClose = {
  date: string;
  count: number;
  cancelled: number;
  byCurrency: Record<string, number>;
  byPayment: Record<string, number>;
  totalItems: number;
  topProducts: { name: string; quantity: number }[];
  lowStock: { id: string; name: string; stock: number }[];
  pendingProof: number;
  reservations: {
    id: string;
    code: string;
    customer: string;
    total: number;
    currency: string;
    status: string;
    paymentMethod: string;
  }[];
};

/** Cierre de caja del día, armado con los mismos datos que el dashboard. */
export function AdminCashClose({ currencies }: { currencies: Currency[] }) {
  const [data, setData] = useState<CashClose | null>(null);
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (day: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/cash-close?date=${day}`);
      const d = await res.json().catch(() => ({}));
      setData(res.ok ? d : null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(date);
  }, [date, load]);

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3 print:hidden">
        <div>
          <h1 className="text-h2">Cierre de caja</h1>
          <p className="mt-1 text-sm text-muted">
            Resumen del día: reservas, importes, lo más vendido y lo que falta reponer.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="rounded-control border border-line bg-bg px-3 py-2 text-sm text-ink"
          />
          <button
            onClick={() => load(date)}
            className="flex items-center gap-2 rounded-control border border-line px-3 py-2 text-sm text-muted transition-colors hover:text-ink"
          >
            <ArrowClockwise size={15} />
          </button>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 rounded-control bg-primary px-3 py-2 text-sm font-medium text-on-primary transition-colors hover:bg-primary/90"
          >
            <Printer size={15} /> Imprimir
          </button>
        </div>
      </div>

      {loading ? (
        <p className="mt-6 text-sm text-muted">Calculando el cierre…</p>
      ) : !data ? (
        <p className="mt-6 text-sm text-danger">No pudimos cargar el cierre de este día.</p>
      ) : (
        <div className="mt-6 space-y-6">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-card border border-line bg-surface p-4">
              <span className="flex items-center gap-1.5 text-xs text-muted">
                <Receipt size={14} /> Reservas
              </span>
              <p className="mt-2 font-display text-2xl tabular-nums text-ink">{data.count}</p>
              {data.cancelled > 0 && (
                <p className="text-xs text-muted">{data.cancelled} canceladas</p>
              )}
            </div>
            <div className="rounded-card border border-line bg-surface p-4">
              <span className="flex items-center gap-1.5 text-xs text-muted">
                <Coins size={14} /> Ingresos
              </span>
              {Object.keys(data.byCurrency).length === 0 ? (
                <p className="mt-2 font-display text-2xl tabular-nums text-ink">0</p>
              ) : (
                <div className="mt-2 space-y-0.5">
                  {Object.entries(data.byCurrency).map(([cur, total]) => (
                    <p key={cur} className="font-display text-xl tabular-nums text-ink">
                      {formatMoney(total, findCurrency(currencies, cur))}
                    </p>
                  ))}
                </div>
              )}
            </div>
            <div className="rounded-card border border-line bg-surface p-4">
              <span className="text-xs text-muted">Unidades vendidas</span>
              <p className="mt-2 font-display text-2xl tabular-nums text-ink">{data.totalItems}</p>
            </div>
          </div>

          {data.pendingProof > 0 && (
            <p className="flex items-center gap-2 rounded-card border border-danger/40 bg-danger/5 p-3 text-sm text-danger">
              <Warning size={16} />
              {data.pendingProof} reserva(s) del día con pago por transferencia y sin comprobante.
            </p>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <section className="rounded-card border border-line bg-surface p-4">
              <h2 className="text-sm font-medium text-ink">Lo más vendido</h2>
              {data.topProducts.length === 0 ? (
                <p className="mt-2 text-sm text-muted">Sin ventas este día.</p>
              ) : (
                <ul className="mt-3 space-y-1.5 text-sm">
                  {data.topProducts.map((p) => (
                    <li key={p.name} className="flex justify-between gap-3">
                      <span className="truncate text-ink">{p.name}</span>
                      <span className="tabular-nums text-muted">{p.quantity}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
            <section className="rounded-card border border-line bg-surface p-4">
              <h2 className="text-sm font-medium text-ink">Reponer stock</h2>
              {data.lowStock.length === 0 ? (
                <p className="mt-2 text-sm text-muted">Todo con stock suficiente.</p>
              ) : (
                <ul className="mt-3 space-y-1.5 text-sm">
                  {data.lowStock.map((p) => (
                    <li key={p.id} className="flex justify-between gap-3">
                      <span className="truncate text-ink">{p.name}</span>
                      <span className="tabular-nums text-danger">
                        {p.stock === 0 ? "agotado" : p.stock}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>

          <section className="rounded-card border border-line bg-surface p-4">
            <h2 className="text-sm font-medium text-ink">Reservas del día</h2>
            {data.reservations.length === 0 ? (
              <p className="mt-2 text-sm text-muted">No entraron reservas este día.</p>
            ) : (
              <div className="mt-3 overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="text-xs text-muted">
                      <th className="py-1.5 pr-3 font-normal">Código</th>
                      <th className="py-1.5 pr-3 font-normal">Cliente</th>
                      <th className="py-1.5 pr-3 font-normal">Pago</th>
                      <th className="py-1.5 text-right font-normal">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {data.reservations.map((r) => (
                      <tr key={r.id}>
                        <td className="py-1.5 pr-3 tabular-nums text-primary">{r.code}</td>
                        <td className="py-1.5 pr-3 text-ink">{r.customer}</td>
                        <td className="py-1.5 pr-3 text-muted">
                          {r.paymentMethod === "CASH" ? "Efectivo" : "Transferencia"}
                        </td>
                        <td className="py-1.5 text-right tabular-nums text-ink">
                          {formatMoney(r.total, findCurrency(currencies, r.currency))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
