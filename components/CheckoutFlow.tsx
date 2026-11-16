"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Bank,
  CheckCircle,
  Crosshair,
  Money,
  Storefront,
  Truck,
} from "@phosphor-icons/react/dist/ssr";
import { useCart } from "@/lib/cart-context";
import { useSettings } from "@/lib/settings-context";
import { convert, formatMoney, findCurrency } from "@/lib/currency";
import type { ReservationDTO } from "@/lib/types";
import { ReservationReceipt } from "./ReservationReceipt";
import { TransferProofField } from "./TransferProofField";
import { MapBoundary } from "./MapBoundary";

const MapPicker = dynamic(() => import("./MapPicker"), {
  ssr: false,
  loading: () => (
    <div className="h-[280px] w-full animate-pulse rounded-card border border-line bg-surface" />
  ),
});

type Quote =
  | { ok: true; distanceKm: number; cost: number; currency: string; maxRadius: number }
  | { ok: false; distanceKm: number; error: string; currency: string; maxRadius: number };

export function CheckoutFlow() {
  const { lines, clear, ready } = useCart();
  const { settings, currency } = useSettings();
  const router = useRouter();

  const [deliveryType, setDeliveryType] = useState<"PICKUP" | "DELIVERY">("PICKUP");
  const [paymentMethod, setPaymentMethod] = useState<"TRANSFER" | "CASH">("TRANSFER");
  const [address, setAddress] = useState("");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [quoting, setQuoting] = useState(false);
  const [locating, setLocating] = useState(false);
  const [note, setNote] = useState("");
  const [proof, setProof] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<ReservationDTO | null>(null);

  // La moneda la fija la tienda; el cliente no la elige.
  const orderCurrency = currency ?? findCurrency(settings.currencies, settings.baseCurrency);
  const cupCurrency = findCurrency(settings.currencies, "CUP");

  const subtotal = lines.reduce(
    (sum, l) =>
      sum + convert(l.price * l.quantity, l.currency, orderCurrency.code, settings.currencies),
    0,
  );
  // El envío se cobra en CUP; el total se expresa en la moneda de la tienda.
  const shippingCup = deliveryType === "DELIVERY" && quote?.ok ? quote.cost : 0;
  const shipping = convert(shippingCup, "CUP", orderCurrency.code, settings.currencies);
  const total = subtotal + shipping;

  // Re-quote whenever the picked point changes; the previous response is
  // discarded by the AbortController if the user picks again quickly.
  useEffect(() => {
    if (deliveryType !== "DELIVERY" || !coords) {
      setQuote(null);
      return;
    }
    const controller = new AbortController();
    setQuoting(true);
    fetch("/api/shipping/quote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ latitude: coords.lat, longitude: coords.lng }),
      signal: controller.signal,
    })
      .then((r) => r.json())
      .then((data) => setQuote(data as Quote))
      .catch((e) => {
        if ((e as Error).name !== "AbortError") setQuote(null);
      })
      .finally(() => setQuoting(false));
    return () => controller.abort();
  }, [coords, deliveryType]);

  // Registra el intento de pago: si el cliente no confirma, el panel lo ve en
  // "llegaron al pago y no terminaron" con su WhatsApp para escribirle. Se
  // reenvía con cada cambio del carrito; el servidor guarda uno solo por persona.
  useEffect(() => {
    if (lines.length === 0) return;
    const summary = lines
      .map((l) => `${l.name} ×${l.quantity}`)
      .join(" · ")
      .slice(0, 600);
    fetch("/api/checkout-intents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        summary,
        itemCount: lines.reduce((n, l) => n + l.quantity, 0),
        total,
        currency: orderCurrency.code,
      }),
    }).catch(() => null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lines.length, total, orderCurrency.code]);

  const useMyLocation = () => {    if (!navigator.geolocation) {
      setError("Tu navegador no permite geolocalización. Marcá el punto en el mapa.");
      return;
    }
    setLocating(true);
    setError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocating(false);
      },
      () => {
        setError("No pudimos leer tu ubicación. Permití el acceso o marcá el punto en el mapa.");
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10_000 },
    );
  };

  const confirm = async () => {
    setError(null);
    if (lines.length === 0) {
      setError("Tu carrito está vacío.");
      return;
    }
    if (deliveryType === "DELIVERY" && (!coords || !address.trim())) {
      setError("Para envío a domicilio marcá tu ubicación en el mapa y escribí la dirección.");
      return;
    }
    if (deliveryType === "DELIVERY" && quote && !quote.ok) {
      setError(quote.error);
      return;
    }
    if (paymentMethod === "TRANSFER" && !proof.trim()) {
      setError("Adjuntá la imagen del comprobante de la transferencia para reservar.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/reservations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: lines.map((l) => ({ productId: l.productId, quantity: l.quantity })),
          deliveryType,
          paymentMethod,
          address: deliveryType === "DELIVERY" ? address.trim() : null,
          latitude: deliveryType === "DELIVERY" ? coords?.lat : null,
          longitude: deliveryType === "DELIVERY" ? coords?.lng : null,
          customerNote: note.trim() || null,
          transferProofUrl: paymentMethod === "TRANSFER" ? proof.trim() : null,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "No pudimos crear la reserva.");
      clear();
      setCreated(data.reservation as ReservationDTO);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error de red");
    } finally {
      setSubmitting(false);
    }
  };

  if (created) {
    return (
      <ReservationReceipt
        reservation={created}
        settings={settings}
        customerEmail={null}
        success
      />
    );
  }

  if (!ready) {
    return (
      <div className="mx-auto w-full max-w-5xl px-4 py-16 sm:px-6">
        <div className="h-8 w-48 animate-pulse rounded bg-surface" />
        <div className="mt-8 h-64 animate-pulse rounded-card bg-surface" />
      </div>
    );
  }

  if (lines.length === 0) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-24 text-center sm:px-6">
        <h1 className="text-h2">No hay nada para reservar</h1>
        <p className="mx-auto mt-3 max-w-sm text-sm text-muted">
          Agregá productos al carrito y volvé al checkout para completar la reserva.
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
    <div className="mx-auto w-full max-w-5xl px-4 py-12 sm:px-6">
      <h1 className="text-h2">Checkout</h1>
      <p className="mt-2 text-sm text-muted">
        Un solo paso. Revisá el resumen, elegí entrega y pago, y confirmá.
      </p>

      <div className="mt-10 grid gap-10 md:grid-cols-[1.3fr_0.9fr]">
        <div className="space-y-10">
          {/* --- Delivery --- */}
          <section>
            <h2 className="text-h3">1 · Entrega</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <button
                onClick={() => setDeliveryType("PICKUP")}
                aria-pressed={deliveryType === "PICKUP"}
                className={`flex items-start gap-3 rounded-card border p-4 text-left transition-colors duration-200 ease-theme ${
                  deliveryType === "PICKUP"
                    ? "border-primary bg-primary/5"
                    : "border-line hover:border-primary/50"
                }`}
              >
                <Storefront size={20} weight="duotone" className="mt-0.5 text-primary" />
                <span>
                  <span className="block text-sm text-ink">Retiro en tienda</span>
                  <span className="mt-0.5 block text-xs text-muted">Sin costo de envío</span>
                </span>
              </button>
              <button
                onClick={() => setDeliveryType("DELIVERY")}
                aria-pressed={deliveryType === "DELIVERY"}
                className={`flex items-start gap-3 rounded-card border p-4 text-left transition-colors duration-200 ease-theme ${
                  deliveryType === "DELIVERY"
                    ? "border-primary bg-primary/5"
                    : "border-line hover:border-primary/50"
                }`}
              >
                <Truck size={20} weight="duotone" className="mt-0.5 text-primary" />
                <span>
                  <span className="block text-sm text-ink">Envío a domicilio</span>
                  <span className="mt-0.5 block text-xs text-muted">
                    Tarifa base + costo por km
                  </span>
                </span>
              </button>
            </div>

            {deliveryType === "PICKUP" ? (
              <div className="mt-4 rounded-card border border-line bg-surface p-4">
                <p className="text-xs uppercase tracking-[0.14em] text-muted">Retirás en</p>
                <p className="mt-1 text-sm text-ink">{settings.storeAddress}</p>
                <p className="mt-2 text-xs text-muted">
                  Coordinamos día y horario por WhatsApp después de confirmar.
                </p>
              </div>
            ) : (
              <div className="mt-4 space-y-3">
                <div>
                  <label htmlFor="address" className="text-xs uppercase tracking-[0.14em] text-muted">
                    Dirección de entrega
                  </label>
                  <input
                    id="address"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Calle, número, piso, localidad"
                    className="mt-1.5 w-full rounded-control border border-line bg-surface px-3 py-2.5 text-sm text-ink placeholder:text-muted transition-colors hover:border-primary/60 focus-visible:outline-none"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={useMyLocation}
                    disabled={locating}
                    className="flex items-center gap-2 rounded-control border border-line px-3 py-2 text-sm text-ink transition-colors hover:border-primary hover:text-primary disabled:opacity-50"
                  >
                    <Crosshair size={16} weight="duotone" />
                    {locating ? "Ubicando…" : "Usar mi ubicación"}
                  </button>
                  <p className="text-xs text-muted">o tocá el mapa para marcar el punto exacto.</p>
                </div>

                <MapBoundary hint="Podés seguir igual: escribí la dirección a mano y confirmá la reserva.">
                  <MapPicker
                    storeLat={settings.storeLat}
                    storeLng={settings.storeLng}
                    lat={coords?.lat ?? null}
                    lng={coords?.lng ?? null}
                    onPick={(lat, lng) => setCoords({ lat, lng })}
                  />
                </MapBoundary>

                {quoting && <p className="text-xs text-muted">Calculando distancia…</p>}

                {!quoting && quote && (
                  <div
                    className={`rounded-card border p-4 text-sm ${
                      quote.ok ? "border-line bg-surface" : "border-danger/40 bg-danger/10"
                    }`}
                  >
                    {quote.ok ? (
                      <dl className="space-y-1.5">
                        <div className="flex justify-between">
                          <dt className="text-muted">Distancia desde la tienda</dt>
                          <dd className="tabular-nums text-ink">{quote.distanceKm.toFixed(2)} km</dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-muted">Costo de envío (CUP)</dt>
                          <dd className="tabular-nums text-ink">
                            {formatMoney(quote.cost, cupCurrency)}
                          </dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-muted">Radio máximo</dt>
                          <dd className="tabular-nums text-muted">{quote.maxRadius} km</dd>
                        </div>
                      </dl>
                    ) : (
                      <p className="text-danger">{quote.error}</p>
                    )}
                  </div>
                )}
              </div>
            )}
          </section>

          {/* --- Payment --- */}
          <section>
            <h2 className="text-h3">2 · Pago</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <button
                onClick={() => setPaymentMethod("TRANSFER")}
                aria-pressed={paymentMethod === "TRANSFER"}
                className={`flex items-start gap-3 rounded-card border p-4 text-left transition-colors duration-200 ease-theme ${
                  paymentMethod === "TRANSFER"
                    ? "border-primary bg-primary/5"
                    : "border-line hover:border-primary/50"
                }`}
              >
                <Bank size={20} weight="duotone" className="mt-0.5 text-primary" />
                <span>
                  <span className="block text-sm text-ink">Transferencia</span>
                  <span className="mt-0.5 block text-xs text-muted">Enviás el comprobante</span>
                </span>
              </button>
              <button
                onClick={() => setPaymentMethod("CASH")}
                aria-pressed={paymentMethod === "CASH"}
                className={`flex items-start gap-3 rounded-card border p-4 text-left transition-colors duration-200 ease-theme ${
                  paymentMethod === "CASH"
                    ? "border-primary bg-primary/5"
                    : "border-line hover:border-primary/50"
                }`}
              >
                <Money size={20} weight="duotone" className="mt-0.5 text-primary" />
                <span>
                  <span className="block text-sm text-ink">Efectivo</span>
                  <span className="mt-0.5 block text-xs text-muted">Al retirar o recibir</span>
                </span>
              </button>
            </div>

            <div className="mt-4 rounded-card border border-line bg-surface p-4 text-sm">
              {paymentMethod === "TRANSFER" ? (
                <>
                  <p className="text-xs uppercase tracking-[0.14em] text-muted">
                    Datos bancarios
                  </p>
                  <pre className="mt-2 whitespace-pre-wrap font-body text-[13px] leading-relaxed text-ink">
                    {settings.bankDetails}
                  </pre>
                  <p className="mt-2 text-xs text-muted">
                    La reserva queda pendiente hasta que la tienda confirme el pago.
                  </p>
                  <TransferProofField value={proof} onChange={setProof} />
                </>
              ) : (
                <>
                  <p className="text-xs uppercase tracking-[0.14em] text-muted">Efectivo</p>
                  <p className="mt-2 leading-relaxed text-ink">
                    Pagás en el momento de la entrega.{" "}
                    {deliveryType === "PICKUP"
                      ? `Retirás en ${settings.storeAddress}.`
                      : "Coordinamos la dirección y el horario por WhatsApp."}
                  </p>
                  <p className="mt-2 text-xs text-muted">
                    La reserva queda pendiente de confirmación manual.
                  </p>
                </>
              )}
            </div>
          </section>

          <section>
            <h2 className="text-h3">3 · Nota para la tienda</h2>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              maxLength={500}
              placeholder="Opcional: horario preferido, referencia del domicilio…"
              className="mt-3 w-full rounded-control border border-line bg-surface px-3 py-2.5 text-sm text-ink placeholder:text-muted transition-colors hover:border-primary/60 focus-visible:outline-none"
            />

            <p className="mt-4 text-xs leading-relaxed text-muted">
              Al confirmar aceptás los{" "}
              <Link href="/legal/terminos" className="underline hover:text-primary">
                términos y condiciones
              </Link>
              , la{" "}
              <Link href="/legal/reservas-pagos" className="underline hover:text-primary">
                política de reservas y pagos
              </Link>{" "}
              y la{" "}
              <Link href="/legal/privacidad" className="underline hover:text-primary">
                política de privacidad
              </Link>
              .
            </p>
          </section>
        </div>

        {/* --- Summary --- */}
        <aside className="h-fit rounded-card border border-line bg-surface p-6 md:sticky md:top-24">
          <h2 className="text-h3">Tu reserva</h2>
          <ul className="mt-4 space-y-3 border-b border-line pb-4 text-sm">
            {lines.map((l) => (
              <li key={l.productId} className="flex justify-between gap-3">
                <span className="min-w-0 text-muted">
                  <span className="block truncate text-ink">{l.name}</span>
                  <span className="text-xs">×{l.quantity}</span>
                </span>
                <span className="shrink-0 tabular-nums text-ink">
                  {formatMoney(
                    convert(l.price * l.quantity, l.currency, orderCurrency.code, settings.currencies),
                    orderCurrency,
                  )}
                </span>
              </li>
            ))}
          </ul>

          <dl className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted">Subtotal</dt>
              <dd className="tabular-nums text-ink">{formatMoney(subtotal, orderCurrency)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted">
                Envío {deliveryType === "PICKUP" ? "(retiro)" : ""}
              </dt>
              <dd className="tabular-nums text-ink">
                {deliveryType === "PICKUP"
                  ? formatMoney(0, orderCurrency)
                  : quote?.ok
                    ? `${formatMoney(shippingCup, cupCurrency)} (CUP)`
                    : "A calcular"}
              </dd>
            </div>
            <div className="flex justify-between border-t border-line pt-3">
              <dt className="text-ink">Total</dt>
              <dd className="font-display text-xl tabular-nums text-primary">
                {formatMoney(total, orderCurrency)}
              </dd>
            </div>
          </dl>

          <p className="mt-3 text-xs text-muted">
            Monto en {orderCurrency.code}. Se fija al confirmar y no depende de
            cambios posteriores del tipo de cambio.
          </p>

          {error && (
            <p role="alert" className="mt-4 rounded-control border border-danger/40 bg-danger/10 px-3 py-2 text-xs text-danger">
              {error}
            </p>
          )}

          <button
            onClick={confirm}
            disabled={submitting}
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-control bg-primary px-4 py-3 text-sm font-medium text-on-primary transition-colors duration-200 ease-theme hover:bg-primary/90 disabled:opacity-50"
          >
            <CheckCircle size={18} weight="duotone" />
            {submitting ? "Generando reserva…" : "Confirmar reserva"}
          </button>

          <p className="mt-3 text-[11px] leading-relaxed text-muted">
            No se cobra online. La tienda confirma tu reserva por WhatsApp.
          </p>
        </aside>
      </div>
    </div>
  );
}
