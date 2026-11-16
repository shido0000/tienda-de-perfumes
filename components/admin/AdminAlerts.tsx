"use client";

import { useCallback, useEffect, useState } from "react";
import {
  BellRinging,
  ShoppingCartSimple,
  ArrowClockwise,
  WhatsappLogo,
  CheckCircle,
  Package,
  Clock,
  Repeat,
  Megaphone,
} from "@phosphor-icons/react/dist/ssr";
import { formatMoney, findCurrency, type Currency } from "@/lib/currency";
import { formatDateTime } from "@/lib/format-date";
import type { CheckoutIntentDTO, StockAlertDTO } from "@/lib/types";

/** Resultado del aviso "volvió este perfume" (lo calcula /api/admin/restock-stats). */
type RestockStats = {
  notified: number;
  bought: number;
  rate: number;
  products: {
    productId: string;
    productName: string;
    notified: number;
    bought: number;
    rate: number;
  }[];
};

type LowStock = { id: string; name: string; stock: number };
type ExpiringReservation = {
  id: string;
  code: string;
  customer: string;
  phone: string | null;
  productNames: string;
  createdAt: string;
};
type PickupReminder = {
  id: string;
  code: string;
  customer: string;
  phone: string | null;
  productNames: string;
  daysWaiting: number;
  updatedAt: string;
};
type RepurchaseReminder = {
  customer: string;
  phone: string | null;
  products: string;
  daysSince: number;
  message: string;
};
type LaunchEntry = {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  interest: string;
  status: "NEW" | "NOTIFIED" | "CLOSED";
  createdAt: string;
};

const waLink = (phone: string | null, text: string) =>
  `https://wa.me/${(phone ?? "").replace(/[^\d]/g, "")}?text=${encodeURIComponent(text)}`;

/**
 * Centro de alertas del panel: stock bajo, lista de espera "volvió el stock",
 * carritos abandonados y reservas sin confirmar que ya cumplieron 24 h.
 */
export function AdminAlerts({ currencies }: { currencies: Currency[] }) {
  const [alerts, setAlerts] = useState<StockAlertDTO[]>([]);
  const [intents, setIntents] = useState<CheckoutIntentDTO[]>([]);
  const [expiring, setExpiring] = useState<ExpiringReservation[]>([]);
  const [pickups, setPickups] = useState<PickupReminder[]>([]);
  const [repurchases, setRepurchases] = useState<RepurchaseReminder[]>([]);
  const [launch, setLaunch] = useState<LaunchEntry[]>([]);
  const [lowStock, setLowStock] = useState<LowStock[]>([]);
  const [restockStats, setRestockStats] = useState<RestockStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [aRes, cRes, eRes, pRes, rRes, lRes, sRes] = await Promise.all([
        fetch("/api/admin/stock-alerts"),
        fetch("/api/admin/checkout-intents"),
        fetch("/api/admin/expiring-reservations"),
        fetch("/api/admin/pickup-reminders"),
        fetch("/api/admin/repurchase-reminders"),
        fetch("/api/admin/launch-waitlist"),
        fetch("/api/admin/restock-stats"),
      ]);
      const aData = await aRes.json().catch(() => ({}));
      const cData = await cRes.json().catch(() => ({}));
      const eData = await eRes.json().catch(() => ({}));
      const pData = await pRes.json().catch(() => ({}));
      const rData = await rRes.json().catch(() => ({}));
      const lData = await lRes.json().catch(() => ({}));
      const sData = await sRes.json().catch(() => null);
      setAlerts(aData.alerts ?? []);
      setIntents(cData.intents ?? []);
      setExpiring(eData.reservations ?? []);
      setPickups(pData.reservations ?? []);
      setRepurchases(rData.reminders ?? []);
      setLaunch(lData.entries ?? []);
      setLowStock(eData.lowStock ?? []);
      setRestockStats(sData ?? null);
    } catch {
      setError("No pudimos cargar las alertas.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const markAlert = async (id: string, status: "NEW" | "NOTIFIED" | "CLOSED") => {
    setBusy(id);
    await fetch("/api/admin/stock-alerts", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    }).catch(() => null);
    setBusy(null);
    load();
  };

  const markIntent = async (id: string, status: "CONTACTED" | "DISMISSED") => {
    setBusy(id);
    await fetch("/api/admin/checkout-intents", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    }).catch(() => null);
    setBusy(null);
    load();
  };

  const markLaunch = async (id: string, status: "NEW" | "NOTIFIED" | "CLOSED") => {
    setBusy(id);
    await fetch("/api/admin/launch-waitlist", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    }).catch(() => null);
    setBusy(null);
    load();
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-h2">Alertas</h1>
          <p className="mt-1 text-sm text-muted">
            Lo que conviene atender hoy para no perder ventas.
          </p>
        </div>
        <button
          onClick={load}
          className="flex items-center gap-2 rounded-control border border-line px-3 py-2 text-sm text-muted transition-colors hover:text-ink"
        >
          <ArrowClockwise size={15} /> Actualizar
        </button>
      </div>

      {error && <p className="rounded-card border border-danger/40 bg-danger/5 p-3 text-sm text-danger">{error}</p>}
      {loading && <p className="text-sm text-muted">Cargando alertas…</p>}

      {/* Stock bajo */}
      <section className="rounded-card border border-line bg-surface p-5">
        <div className="flex items-center gap-2">
          <Package size={18} weight="duotone" className="text-danger" />
          <h2 className="text-h3">Stock bajo</h2>
          <span className="rounded-full bg-danger/10 px-2 py-0.5 text-xs font-medium text-danger">
            {lowStock.length}
          </span>
        </div>
        {lowStock.length === 0 ? (
          <p className="mt-3 text-sm text-muted">Ningún perfume está por agotarse. Buen trabajo.</p>
        ) : (
          <ul className="mt-4 divide-y divide-line">
            {lowStock.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                <span className="text-ink">{p.name}</span>
                <span className="font-medium tabular-nums text-danger">
                  {p.stock === 0 ? "Agotado" : `${p.stock} ${p.stock === 1 ? "unidad" : "unidades"}`}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Lista de espera */}
      <section className="rounded-card border border-line bg-surface p-5">
        <div className="flex items-center gap-2">
          <BellRinging size={18} weight="duotone" className="text-primary" />
          <h2 className="text-h3">Avísame cuando llegue</h2>
          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
            {alerts.filter((a) => a.status === "NEW").length}
          </span>
        </div>

        {restockStats && (
          <div className="mt-4 rounded-control border border-line bg-bg/50 p-4">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h3 className="text-sm font-medium text-ink">
                ¿Funcionó el aviso “volvió este perfume”?
              </h3>
              {restockStats.notified > 0 ? (
                <p className="font-display text-h3 tabular-nums text-primary">
                  {restockStats.rate}%
                </p>
              ) : (
                <p className="text-xs text-muted">Sin avisos enviados todavía</p>
              )}
            </div>

            {restockStats.notified === 0 ? (
              <p className="mt-1 text-xs text-muted">
                Cuando marques un aviso como <em>avisado</em> y esa persona compre el mismo
                perfume, acá aparece el porcentaje real de conversión.
              </p>
            ) : (
              <>
                <p className="mt-1 text-xs text-muted">
                  <span className="tabular-nums text-ink">
                    {restockStats.bought} de {restockStats.notified}
                  </span>{" "}
                  personas avisadas compraron ese mismo perfume después del aviso.
                </p>
                <ul className="mt-3 divide-y divide-line">
                  {restockStats.products.slice(0, 6).map((p) => (
                    <li
                      key={p.productId}
                      className="flex items-center justify-between gap-3 py-1.5 text-xs"
                    >
                      <span className="truncate text-ink">{p.productName}</span>
                      <span className="shrink-0 tabular-nums text-muted">
                        {p.bought}/{p.notified}
                        <span
                          className={`ml-2 font-medium ${p.rate > 0 ? "text-primary" : "text-muted"}`}
                        >
                          {p.rate}%
                        </span>
                      </span>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        )}
        {alerts.length === 0 ? (
          <p className="mt-3 text-sm text-muted">
            Nadie pidió aviso todavía. Cuando alguien deje su contacto por un perfume agotado,
            aparece aquí.
          </p>
        ) : (
          <ul className="mt-4 space-y-3">
            {alerts.map((a) => {
              const contact = a.phone || a.email || "";
              const backInStock = (a.productStock ?? 0) > 0;
              return (
                <li
                  key={a.id}
                  className={`rounded-control border p-3 ${
                    backInStock ? "border-primary/50 bg-primary/5" : "border-line bg-bg/40"
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-ink">
                        {a.name || "Sin nombre"} · <span className="text-muted">{a.productName}</span>
                      </p>
                      <p className="text-xs text-muted">{contact || "Sin contacto"}</p>
                      {backInStock && a.status === "NEW" && (
                        <p className="mt-1 text-xs font-medium text-primary">
                          Ya hay stock: escribile y avisale.
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {a.phone && (
                        <a
                          href={waLink(
                            a.phone,
                            `Hola${a.name ? " " + a.name.split(" ")[0] : ""}, volvió el stock de ${a.productName}. ¿Te lo reservamos?`,
                          )}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-1 rounded-control border border-primary/40 px-2.5 py-1.5 text-xs text-primary transition-colors hover:bg-primary/10"
                        >
                          <WhatsappLogo size={13} /> Escribir
                        </a>
                      )}
                      <button
                        onClick={() => markAlert(a.id, a.status === "NOTIFIED" ? "CLOSED" : "NOTIFIED")}
                        disabled={busy === a.id}
                        className="rounded-control border border-line px-2.5 py-1.5 text-xs text-muted transition-colors hover:text-ink disabled:opacity-50"
                      >
                        {a.status === "NOTIFIED" ? "Cerrar" : "Marcar avisado"}
                      </button>
                    </div>
                  </div>
                  {a.status === "NOTIFIED" && (
                    <p className="mt-2 flex items-center gap-1 text-xs text-primary">
                      <CheckCircle size={13} /> Avisado
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* Carritos abandonados */}
      <section className="rounded-card border border-line bg-surface p-5">
        <div className="flex items-center gap-2">
          <ShoppingCartSimple size={18} weight="duotone" className="text-primary" />
          <h2 className="text-h3">Llegaron al pago y no terminaron</h2>
          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
            {intents.length}
          </span>
        </div>
        {intents.length === 0 ? (
          <p className="mt-3 text-sm text-muted">Nadie dejó una reserva a medias. Todo en orden.</p>
        ) : (
          <ul className="mt-4 space-y-3">
            {intents.map((i) => (
              <li key={i.id} className="rounded-control border border-line bg-bg/40 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-ink">
                      {i.name || "Sin nombre"}{" "}
                      <span className="tabular-nums text-muted">
                        · {formatMoney(i.total, findCurrency(currencies, i.currency))}
                      </span>
                    </p>
                    <p className="truncate text-xs text-muted">{i.summary}</p>
                    <p className="text-[11px] text-muted">{formatDateTime(i.createdAt)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {i.phone && (
                      <a
                        href={waLink(
                          i.phone,
                          `Hola${i.name ? " " + i.name.split(" ")[0] : ""}, vimos que dejaste una reserva sin confirmar. ¿Te ayudamos a terminarla?`,
                        )}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1 rounded-control border border-primary/40 px-2.5 py-1.5 text-xs text-primary transition-colors hover:bg-primary/10"
                      >
                        <WhatsappLogo size={13} /> Escribir
                      </a>
                    )}
                    <button
                      onClick={() => markIntent(i.id, "CONTACTED")}
                      disabled={busy === i.id}
                      className="rounded-control border border-line px-2.5 py-1.5 text-xs text-muted transition-colors hover:text-ink disabled:opacity-50"
                    >
                      Contactado
                    </button>
                    <button
                      onClick={() => markIntent(i.id, "DISMISSED")}
                      disabled={busy === i.id}
                      className="rounded-control border border-line px-2.5 py-1.5 text-xs text-muted transition-colors hover:text-ink disabled:opacity-50"
                    >
                      Descartar
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Para retirar hace más de 3 días */}
      <section className="rounded-card border border-line bg-surface p-5">
        <div className="flex items-center gap-2">
          <Clock size={18} weight="duotone" className="text-primary" />
          <h2 className="text-h3">Esperando retiro hace +3 días</h2>
          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
            {pickups.length}
          </span>
        </div>
        <p className="mt-1 text-xs text-muted">
          Reservas ya avisadas como listas que llevan más de 3 días sin retirarse. Un recordatorio
          por WhatsApp las recupera casi siempre.
        </p>
        {pickups.length === 0 ? (
          <p className="mt-3 text-sm text-muted">Todo retirado a tiempo. Nada pendiente.</p>
        ) : (
          <ul className="mt-4 divide-y divide-line">
            {pickups.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
                <div className="min-w-0">
                  <p className="text-ink">
                    {r.code} · <span className="text-muted">{r.customer}</span>
                  </p>
                  <p className="truncate text-xs text-muted">
                    {r.productNames} · esperando {r.daysWaiting}{" "}
                    {r.daysWaiting === 1 ? "día" : "días"}
                  </p>
                </div>
                {r.phone ? (
                  <a
                    href={waLink(
                      r.phone,
                      `Hola${r.customer ? " " + r.customer.split(" ")[0] : ""}, tu reserva ${r.code} (${r.productNames}) te espera desde hace ${r.daysWaiting} días. ¿Pasás a retirarla o preferís que la cancelemos para liberar el stock?`,
                    )}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1 rounded-control border border-primary/40 px-2.5 py-1.5 text-xs text-primary transition-colors hover:bg-primary/10"
                  >
                    <WhatsappLogo size={13} /> Recordar
                  </a>
                ) : (
                  <span className="text-xs text-muted">Sin teléfono</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Reservas sin confirmar hace 24 h */}
      <section className="rounded-card border border-line bg-surface p-5">
        <div className="flex items-center gap-2">
          <Clock size={18} weight="duotone" className="text-danger" />
          <h2 className="text-h3">Sin confirmar hace 24 h</h2>
          <span className="rounded-full bg-danger/10 px-2 py-0.5 text-xs font-medium text-danger">
            {expiring.length}
          </span>
        </div>
        <p className="mt-1 text-xs text-muted">
          Reservas con pago pendiente y sin comprobante. El stock está inmovilizado: escribí o
          cancelá para liberarlo.
        </p>
        {expiring.length === 0 ? (
          <p className="mt-3 text-sm text-muted">No hay reservas vencidas. Gracias por mantener el stock libre.</p>
        ) : (
          <ul className="mt-4 divide-y divide-line">
            {expiring.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
                <div className="min-w-0">
                  <p className="text-ink">
                    {r.code} · <span className="text-muted">{r.customer}</span>
                  </p>
                  <p className="truncate text-xs text-muted">
                    {r.productNames} · {formatDateTime(r.createdAt)}
                  </p>
                </div>
                {r.phone ? (
                  <a
                    href={waLink(
                      r.phone,
                      `Hola${r.customer ? " " + r.customer.split(" ")[0] : ""}, quedó pendiente el comprobante de tu reserva ${r.code}. ¿La cancelamos o la completás?`,
                    )}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1 rounded-control border border-primary/40 px-2.5 py-1.5 text-xs text-primary transition-colors hover:bg-primary/10"
                  >
                    <WhatsappLogo size={13} /> Escribir
                  </a>
                ) : (
                  <span className="text-xs text-muted">Sin teléfono</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Recordatorio de reposición (~2 meses) */}
      <section className="rounded-card border border-line bg-surface p-5">
        <div className="flex items-center gap-2">
          <Repeat size={18} weight="duotone" className="text-primary" />
          <h2 className="text-h3">¿Ya se le está terminando?</h2>
          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
            {repurchases.length}
          </span>
        </div>
        <p className="mt-1 text-xs text-muted">
          Clientes que compraron hace unos dos meses. Un mensaje suave suele recuperar la
          reposición.
        </p>
        {repurchases.length === 0 ? (
          <p className="mt-3 text-sm text-muted">Nadie cumple dos meses todavía.</p>
        ) : (
          <ul className="mt-4 divide-y divide-line">
            {repurchases.map((r, i) => (
              <li key={`${r.customer}-${i}`} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
                <div className="min-w-0">
                  <p className="text-ink">
                    {r.customer} · <span className="text-muted">{r.daysSince} días</span>
                  </p>
                  <p className="truncate text-xs text-muted">{r.products}</p>
                </div>
                {r.phone ? (
                  <a
                    href={waLink(r.phone, r.message)}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1 rounded-control border border-primary/40 px-2.5 py-1.5 text-xs text-primary transition-colors hover:bg-primary/10"
                  >
                    <WhatsappLogo size={13} /> Recordar reposición
                  </a>
                ) : (
                  <span className="text-xs text-muted">Sin teléfono</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Lista de espera de lanzamientos */}
      <section className="rounded-card border border-line bg-surface p-5">
        <div className="flex items-center gap-2">
          <Megaphone size={18} weight="duotone" className="text-primary" />
          <h2 className="text-h3">Primero en saber de las novedades</h2>
          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
            {launch.filter((l) => l.status === "NEW").length}
          </span>
        </div>
        <p className="mt-1 text-xs text-muted">
          Personas que dejaron su contacto para enterarse primero cuando llegue algo nuevo.
        </p>
        {launch.length === 0 ? (
          <p className="mt-3 text-sm text-muted">Nadie se anotó todavía.</p>
        ) : (
          <ul className="mt-4 space-y-2">
            {launch.map((l) => {
              const contact = l.phone || l.email || "";
              return (
                <li key={l.id} className="flex flex-wrap items-center justify-between gap-2 rounded-control border border-line bg-bg/40 p-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-ink">
                      {l.name || "Sin nombre"} <span className="text-muted">· {l.interest}</span>
                    </p>
                    <p className="text-xs text-muted">{contact || "Sin contacto"}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {l.phone && (
                      <a
                        href={waLink(
                          l.phone,
                          `Hola${l.name ? " " + l.name.split(" ")[0] : ""}! Ya llegó una novedad a la tienda. Te aviso primero porque te anotaste. ¿Te la reservamos?`,
                        )}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1 rounded-control border border-primary/40 px-2.5 py-1.5 text-xs text-primary transition-colors hover:bg-primary/10"
                      >
                        <WhatsappLogo size={13} /> Avisar
                      </a>
                    )}
                    <button
                      onClick={() => markLaunch(l.id, l.status === "NOTIFIED" ? "CLOSED" : "NOTIFIED")}
                      disabled={busy === l.id}
                      className="rounded-control border border-line px-2.5 py-1.5 text-xs text-muted transition-colors hover:text-ink disabled:opacity-50"
                    >
                      {l.status === "NOTIFIED" ? "Cerrar" : "Marcar avisado"}
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
