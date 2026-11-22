"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowRight, Trash } from "@phosphor-icons/react/dist/ssr";
import { useCart } from "@/lib/cart-context";
import { usePrice } from "@/lib/use-price";
import { convert, formatMoney, findCurrency } from "@/lib/currency";
import { useSettings } from "@/lib/settings-context";
import { SafeImage } from "@/components/SafeImage";

export function CartView({ signedIn }: { signedIn: boolean }) {
  const { lines, setQuantity, remove, ready } = useCart();
  const { price, priceSecond, currency } = usePrice();
  const { settings } = useSettings();
  const router = useRouter();
  const [notice, setNotice] = useState<string | null>(null);

  const orderCurrency = currency ?? findCurrency(settings.currencies, settings.baseCurrency);
  const subtotal = lines.reduce(
    (sum, l) =>
      sum + convert(l.price * l.quantity, l.currency, orderCurrency.code, settings.currencies),
    0,
  );

  const multiCurrency = new Set(lines.map((l) => l.currency)).size > 1;

  const goCheckout = () => {
    if (!signedIn) {
      setNotice("Ingresá con tu cuenta para completar la reserva y guardarla.");
      router.push("/login?next=%2Fcheckout");
      return;
    }
    router.push("/checkout");
  };

  if (!ready) {
    return (
      <div className="mx-auto w-full max-w-4xl px-4 py-16 sm:px-6">
        <div className="h-8 w-40 animate-pulse rounded bg-surface" />
        <div className="mt-8 space-y-4">
          {[0, 1].map((i) => (
            <div key={i} className="h-28 animate-pulse rounded-card bg-surface" />
          ))}
        </div>
      </div>
    );
  }

  if (lines.length === 0) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-24 text-center sm:px-6">
        <h1 className="text-h2">Tu carrito está vacío</h1>
        <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-muted">
          Todavía no agregaste ninguna pieza. El catálogo tiene frascos, velas y
          difusores esperando.
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
      <h1 className="text-h2">Carrito</h1>
      <p className="mt-2 text-sm text-muted">
        Reservás todos los productos juntos en un solo checkout.
      </p>

      <div className="mt-10 grid gap-10 md:grid-cols-[1.4fr_0.9fr]">
        <ul className="divide-y divide-line border-y border-line">
          {lines.map((line) => (
            <li key={line.productId} className="flex gap-4 py-5">
              <div className="h-24 w-20 shrink-0 overflow-hidden rounded-control bg-surface">
                {line.image ? (
                  <SafeImage src={line.image} alt={line.name} className="h-full w-full object-cover" />
                ) : null}
              </div>

              <div className="flex min-w-0 flex-1 flex-col">
                <p className="text-[11px] uppercase tracking-[0.18em] text-muted">{line.brand}</p>
                <p className="truncate font-display text-lg text-ink">{line.name}</p>
                <p className="mt-1 text-sm tabular-nums text-muted">
                  {price(line.price, line.currency)} c/u
                  {priceSecond(line.price, line.currency) && (
                    <span className="ml-1 text-xs">
                      ({priceSecond(line.price, line.currency)})
                    </span>
                  )}
                </p>

                <div className="mt-3 flex items-center gap-3">
                  <div className="flex items-center rounded-control border border-line">
                    <button
                      onClick={() => setQuantity(line.productId, line.quantity - 1)}
                      aria-label={`Restar una unidad de ${line.name}`}
                      className="px-2.5 py-1 text-ink transition-colors hover:text-primary"
                    >
                      −
                    </button>
                    <span className="min-w-7 text-center text-sm tabular-nums">{line.quantity}</span>
                    <button
                      onClick={() => setQuantity(line.productId, line.quantity + 1)}
                      aria-label={`Sumar una unidad de ${line.name}`}
                      className="px-2.5 py-1 text-ink transition-colors hover:text-primary"
                    >
                      +
                    </button>
                  </div>
                  <button
                    onClick={() => remove(line.productId)}
                    aria-label={`Quitar ${line.name} del carrito`}
                    className="flex items-center gap-1 text-xs text-muted transition-colors hover:text-danger"
                  >
                    <Trash size={14} weight="duotone" />
                    Quitar
                  </button>
                </div>
              </div>

              <p className="shrink-0 font-display text-base tabular-nums text-ink">
                {price(line.price * line.quantity, line.currency)}
              </p>
            </li>
          ))}
        </ul>

        <aside className="h-fit rounded-card border border-line bg-surface p-6">
          <h2 className="text-h3">Resumen</h2>

          <dl className="mt-5 space-y-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted">Subtotal</dt>
              <dd className="tabular-nums text-ink">
                {formatMoney(subtotal, orderCurrency)}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted">Envío</dt>
              <dd className="text-ink">Se calcula al elegir entrega</dd>
            </div>
            <div className="flex justify-between border-t border-line pt-3">
              <dt className="text-ink">Total estimado</dt>
              <dd className="font-display text-lg tabular-nums text-primary">
                {formatMoney(subtotal, orderCurrency)}
              </dd>
            </div>
          </dl>

          <p className="mt-3 text-xs leading-relaxed text-muted">
            Moneda de la orden: {orderCurrency.code}.{" "}
            {multiCurrency
              ? "Los productos tienen monedas distintas; al confirmar se convierten todos a esta moneda y los importes quedan fijos."
              : "Todos los precios se convierten a esta moneda al confirmar."}
          </p>

          <button
            onClick={goCheckout}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-control bg-primary px-4 py-2.5 text-sm font-medium text-on-primary transition-colors duration-200 ease-theme hover:bg-primary/90"
          >
            Continuar al checkout
            <ArrowRight size={16} weight="duotone" />
          </button>

          {!signedIn && (
            <p className="mt-3 text-xs text-muted">
              Necesitás una cuenta para que la reserva quede guardada en “Mis reservas”.
            </p>
          )}
          {notice && <p className="mt-3 text-xs text-danger">{notice}</p>}

          <div className="mt-6 border-t border-line pt-4 text-xs text-muted">
            <Link href="/legal/reservas-pagos" className="underline hover:text-primary">
              Política de reservas y pagos
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
}
