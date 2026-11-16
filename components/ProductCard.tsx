"use client";

import { useSiteTexts } from "@/lib/use-site-texts";
import Link from "next/link";
import { useState } from "react";
import { Heart, Bag } from "@phosphor-icons/react/dist/ssr";
import { useCart } from "@/lib/cart-context";
import { usePrice } from "@/lib/use-price";
import { GENDER_LABEL, type ProductDTO } from "@/lib/types";
import { SafeImage } from "@/components/SafeImage";

export function ProductCard({
  product,
  initialSaved = false,
  signedIn = false,
}: {
  product: ProductDTO;
  initialSaved?: boolean;
  signedIn?: boolean;
}) {
  const t = useSiteTexts();
  const { add } = useCart();
  const { price } = usePrice();
  const [saved, setSaved] = useState(initialSaved);
  const [added, setAdded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleWishlist = async () => {
    if (!signedIn) {
      setError("Ingresá para guardar favoritos.");
      return;
    }
    setError(null);
    try {
      const res = await fetch("/api/wishlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: product.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "No pudimos guardar el favorito.");
      setSaved(Boolean(data.saved));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error de red");
    }
  };

  const addToCart = () => {
    add({
      productId: product.id,
      name: product.name,
      brand: product.brand,
      price: product.price,
      currency: product.currency,
      image: product.images[0] ?? null,
      stock: product.stock,
    });
    setAdded(true);
    window.setTimeout(() => setAdded(false), 1600);
  };

  const soldOut = product.stock !== null && product.stock <= 0;
  const rebaja =
    product.compareAtPrice && product.compareAtPrice > product.price
      ? product.compareAtPrice - product.price
      : 0;

  return (
    <article className="card-hover group flex h-full flex-col rounded-card border border-line bg-surface p-4 pb-5 shadow-sm transition-[border-color,box-shadow] duration-200 ease-theme hover:border-primary/45 sm:p-5 sm:pb-6">
      <Link
        href={`/producto/${product.id}`}
        className="media-zoom relative block overflow-hidden rounded-[12px] border border-line bg-bg"
      >
        {product.images[0] ? (
          <SafeImage
            src={product.images[0]}
            alt={`${product.name} de ${product.brand}`}
            loading="lazy"
            className="aspect-[4/5] w-full object-cover"
          />
        ) : (
          <div className="flex aspect-[4/5] w-full items-center justify-center bg-surface text-muted">
            Sin imagen
          </div>
        )}
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            toggleWishlist();
          }}
          aria-label={saved ? `Quitar ${product.name} de deseos` : `Guardar ${product.name} en deseos`}
          aria-pressed={saved}
          className={`absolute right-3 top-3 rounded-full border p-2 backdrop-blur-sm transition-colors duration-200 ease-theme ${
            saved
              ? "border-primary bg-primary text-on-primary"
              : "border-line bg-bg/70 text-ink backdrop-blur hover:border-primary hover:text-primary"
          }`}
        >
          <Heart size={16} weight={saved ? "fill" : "duotone"} />
        </button>
      </Link>

      <div className="flex flex-1 flex-col px-1 pb-1 pt-4">
        <p className="line-clamp-1 text-[11px] uppercase tracking-[0.2em] text-muted">
          {product.brand}
          {product.gender && product.gender !== "UNISEX" && (
            <span className="ml-2 normal-case tracking-normal text-primary/80">
              · {GENDER_LABEL[product.gender] ?? product.gender}
            </span>
          )}
        </p>
        <h3 className="mt-1.5 line-clamp-2 min-h-[2.6em] text-h3 leading-snug">
          <Link href={`/producto/${product.id}`} className="transition-colors hover:text-primary">
            {product.name}
          </Link>
        </h3>
        <p className="mt-2 line-clamp-2 min-h-[2.9em] text-sm leading-relaxed text-muted">
          {product.notes ?? product.description}
        </p>

        <div className="mt-3 flex min-h-[2rem] flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
          <span className="flex flex-wrap items-baseline gap-2">
            <span className="font-display text-xl tabular-nums text-primary">
              {price(product.price, product.currency)}
            </span>
            {rebaja > 0 && (
              <span className="text-xs tabular-nums text-muted line-through">
                {price(product.compareAtPrice as number, product.currency)}
              </span>
            )}
          </span>
          <span className="text-[11px] text-muted">
            {soldOut ? t.pdSoldOut : product.stock !== null ? `${product.stock} ${t.pdStockAvailable}` : product.category}
          </span>
        </div>
        {/* Altura fija para el sello de rebaja: sin ella, sólo las tarjetas en
            oferta crecían y los botones de "Agregar" quedaban a distinta altura.
            El margen inferior deja aire entre el sello y el botón. */}
        <div className="mb-3 mt-2 flex min-h-[1.35rem] items-center">
          {rebaja > 0 && (
            <span className="inline-flex w-fit rounded-full bg-accent px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-accent-ink">
              -{Math.round((rebaja / (product.compareAtPrice as number)) * 100)}%
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={addToCart}
          disabled={soldOut}
          className="mt-auto flex w-full items-center justify-center gap-2 rounded-control border border-line bg-surface px-3 py-2.5 text-sm text-ink transition-[transform,border-color,color,box-shadow] duration-200 ease-theme hover:-translate-y-0.5 hover:border-primary hover:text-primary hover:shadow-sm disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0"
        >
          <Bag size={16} weight="duotone" />
          {soldOut ? t.pdSoldOut : added ? t.pdAdded : t.pdAddCart}
        </button>
        {error && <p className="mt-2 text-xs text-danger">{error}</p>}
      </div>
    </article>
  );
}
