"use client";

import { useSiteTexts } from "@/lib/use-site-texts";
import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, Bag, Heart, Clock, SunHorizon, User } from "@phosphor-icons/react/dist/ssr";
import { useCart } from "@/lib/cart-context";
import { usePrice } from "@/lib/use-price";
import { GENDER_LABEL, OCCASION_LABEL, type ProductDTO } from "@/lib/types";
import { StockAlertForm } from "./StockAlertForm";
import { SafeImage } from "@/components/SafeImage";
import { ReviewsBlock } from "./ReviewsBlock";
import { ProductFaq } from "./ProductFaq";

export function ProductDetail({
  product,
  suggestions = [],
  initialSaved,
  signedIn,
}: {
  product: ProductDTO;
  suggestions?: ProductDTO[];
  initialSaved: boolean;
  signedIn: boolean;
}) {
  const t = useSiteTexts();
  const { add } = useCart();
  const { price } = usePrice();
  const [active, setActive] = useState(0);
  const [qty, setQty] = useState(1);
  const [saved, setSaved] = useState(initialSaved);
  const [added, setAdded] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const soldOut = product.stock !== null && product.stock <= 0;

  const toggleWishlist = async () => {
    if (!signedIn) {
      setNotice(t.pdLoginToSave);
      return;
    }
    const res = await fetch("/api/wishlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId: product.id }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setNotice(data.error ?? "No pudimos actualizar la lista.");
      return;
    }
    setSaved(Boolean(data.saved));
    setNotice(data.saved ? t.pdSavedNotice : t.pdUnsavedNotice);
  };

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6">
      <Link
        href="/"
        className="inline-flex items-center gap-2 text-sm text-muted transition-colors hover:text-primary"
      >
        <ArrowLeft size={16} weight="duotone" />
        Volver al catálogo
      </Link>

      <div className="mt-8 grid gap-10 md:grid-cols-[1fr_1fr] md:gap-16">
        <div>
          <div className="overflow-hidden rounded-card bg-surface">
            {product.images[active] ? (
              <SafeImage
                src={product.images[active]}
                alt={`${product.name} de ${product.brand}`}
                className="aspect-[4/5] w-full object-cover"
              />
            ) : (
              <div className="flex aspect-[4/5] items-center justify-center text-muted">
                Sin imagen
              </div>
            )}
          </div>
          {product.images.length > 1 && (
            <div className="mt-3 flex gap-3 overflow-x-auto pb-1">
              {product.images.map((src, i) => (
                <button
                  key={src + i}
                  onClick={() => setActive(i)}
                  aria-label={`Ver imagen ${i + 1}`}
                  className={`h-20 w-16 shrink-0 overflow-hidden rounded-control border transition-colors ${
                    i === active ? "border-primary" : "border-line hover:border-primary/60"
                  }`}
                >
                  <SafeImage src={src} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div>
          <p className="text-[11px] uppercase tracking-[0.2em] text-muted">
            {product.brand} · {product.category}
          </p>
          <h1 className="mt-3 text-h2 text-ink">{product.name}</h1>

          <p className="mt-4 font-display text-2xl tabular-nums text-primary">
            {price(product.price, product.currency)}
          </p>
          <p className="mt-1 text-xs text-muted">
            Precio original en {product.currency}. La conversión se fija al confirmar la reserva.
          </p>

          <p className="mt-6 text-sm leading-relaxed text-muted">{product.description}</p>
          {product.notes && (
            <p className="mt-4 border-t border-line pt-4 text-sm text-ink">
              <span className="text-muted">{t.pdNotesLabel} </span>
              {product.notes}
            </p>
          )}

          {(product.duration || product.occasion || product.gender) && (
            <div className="mt-4 flex flex-wrap gap-2">
              {product.gender && (
                <span className="inline-flex items-center gap-1.5 rounded-control border border-line px-3 py-1.5 text-xs text-ink">
                  <User size={14} weight="duotone" className="text-primary" />
                  {GENDER_LABEL[product.gender] ?? product.gender}
                </span>
              )}
              {product.duration && (
                <span className="inline-flex items-center gap-1.5 rounded-control border border-line px-3 py-1.5 text-xs text-ink">
                  <Clock size={14} weight="duotone" className="text-primary" />
                  Dura en la piel: {product.duration}
                </span>
              )}
              {product.occasion && (
                <span className="inline-flex items-center gap-1.5 rounded-control border border-line px-3 py-1.5 text-xs text-ink">
                  <SunHorizon size={14} weight="duotone" className="text-primary" />
                  {OCCASION_LABEL[product.occasion] ?? product.occasion}
                </span>
              )}
            </div>
          )}

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <div className="flex items-center rounded-control border border-line">
              <button
                onClick={() => setQty((q) => Math.max(1, q - 1))}
                aria-label={t.pdQuantityMinus}
                className="px-3 py-2 text-lg leading-none text-ink transition-colors hover:text-primary"
              >
                −
              </button>
              <span className="min-w-8 text-center text-sm tabular-nums text-ink" aria-live="polite">
                {qty}
              </span>
              <button
                onClick={() => setQty((q) => Math.min(product.stock ?? 20, 20, q + 1))}
                aria-label={t.pdQuantityPlus}
                className="px-3 py-2 text-lg leading-none text-ink transition-colors hover:text-primary"
              >
                +
              </button>
            </div>

            <button
              onClick={() => {
                add(
                  {
                    productId: product.id,
                    name: product.name,
                    brand: product.brand,
                    price: product.price,
                    currency: product.currency,
                    image: product.images[0] ?? null,
                    stock: product.stock,
                  },
                  qty,
                );
                setAdded(true);
                window.setTimeout(() => setAdded(false), 1800);
              }}
              disabled={soldOut}
              className="flex items-center gap-2 rounded-control bg-primary px-5 py-2.5 text-sm font-medium text-on-primary transition-colors duration-200 ease-theme hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Bag size={17} weight="duotone" />
              {soldOut ? t.pdSoldOut : added ? t.pdAdded : t.pdAddCart}
            </button>

            <button
              onClick={toggleWishlist}
              aria-pressed={saved}
              className="flex items-center gap-2 rounded-control border border-line px-4 py-2.5 text-sm text-ink transition-colors hover:border-primary hover:text-primary"
            >
              <Heart size={17} weight={saved ? "fill" : "duotone"} />
              {saved ? t.pdSaved : t.pdSave}
            </button>
          </div>

          {notice && <p className="mt-3 text-xs text-muted">{notice}</p>}

          {(soldOut || (product.stock !== null && product.stock <= 2)) && (
            <StockAlertForm productId={product.id} productName={product.name} />
          )}

          {added && (
            <Link
              href="/carrito"
              className="mt-5 inline-block text-sm text-primary underline decoration-primary/40 underline-offset-4"
            >
              Ir al carrito para reservar
            </Link>
          )}

          <div className="mt-10 border-t border-line pt-5 text-xs leading-relaxed text-muted">
            <p>
              {product.stock !== null
                ? `Stock disponible: ${product.stock} unidades.`
                : "Stock a confirmar por la tienda."}
            </p>
            <p className="mt-1">
              Retiro en tienda sin costo · Envío calculado por kilómetro según tu ubicación.
            </p>
          </div>
        </div>
      </div>

      {product.faqs && product.faqs.length > 0 && <ProductFaq faqs={product.faqs} />}

      {suggestions.length > 0 && (
        <section className="mt-16 border-t border-line pt-8" aria-label="Comprá junto con">
          <h2 className="text-h3 text-ink">{t.pdTogetherTitle}</h2>
          <p className="mt-1 text-sm text-muted">
            Dos fragancias que combinan bien con {product.name}.
          </p>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            {suggestions.map((s) => (
              <Link
                key={s.id}
                href={`/producto/${s.id}`}
                className="group flex items-center gap-4 rounded-card border border-line bg-surface p-3 transition-colors hover:border-primary"
              >
                <div className="h-20 w-16 shrink-0 overflow-hidden rounded-control bg-bg">
                  {s.images[0] ? (
                    <SafeImage
                      src={s.images[0]}
                      alt={s.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-[10px] text-muted">
                      Sin foto
                    </div>
                  )}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-ink group-hover:text-primary">
                    {s.name}
                  </p>
                  <p className="text-xs text-muted">
                    {s.brand} · {s.category}
                  </p>
                  <p className="mt-1 text-sm tabular-nums text-primary">
                    {price(s.price, s.currency)}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      <ReviewsBlock productId={product.id} signedIn={signedIn} />
    </div>
  );
}
