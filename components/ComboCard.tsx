"use client";

import { useSiteTexts } from "@/lib/use-site-texts";
import { useState } from "react";
import Image from "next/image";
import { Plus, Check, Package } from "@phosphor-icons/react/dist/ssr";
import type { ComboDTO } from "@/lib/types";
import { usePrice } from "@/lib/use-price";
import { useCart, comboLineId } from "@/lib/cart-context";
import { useToast } from "@/components/ui/ToastProvider";

/**
 * Tarjeta de una OFERTA (combo). Al agregarla al carrito entra como una sola
 * línea `combo:<id>`; el servidor la expande al confirmar la reserva y descuenta
 * el stock de cada producto que la compone.
 */
export function ComboCard({ combo }: { combo: ComboDTO }) {
  const t = useSiteTexts();
  const { price } = usePrice();
  const { add } = useCart();
  const { success } = useToast();
  const [added, setAdded] = useState(false);

  const soldOut =
    typeof combo.available === "number" && combo.available <= 0;
  const saving =
    combo.compareAtPrice && combo.compareAtPrice > combo.price
      ? combo.compareAtPrice - combo.price
      : 0;

  const addToCart = () => {
    if (soldOut) return;
    add({
      productId: comboLineId(combo.id),
      name: combo.title,
      brand: "Oferta",
      price: combo.price,
      currency: combo.currency,
      image: combo.image,
      stock: combo.available ?? null,
      kind: "combo",
      comboId: combo.id,
      components: combo.items.map((i) => ({
        productId: i.productId,
        quantity: i.quantity,
        name: i.name ?? "",
      })),
    });
    setAdded(true);
    success("Oferta agregada", `${combo.title} está en tu carrito.`);
    window.setTimeout(() => setAdded(false), 1600);
  };

  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-card border border-line bg-surface">
      <div className="relative aspect-[16/10] overflow-hidden bg-bg">
        {combo.image ? (
          <Image
            src={combo.image}
            alt={combo.title}
            fill
            sizes="(max-width: 768px) 100vw, 33vw"
            className="object-cover transition-transform duration-500 ease-theme group-hover:scale-[1.03]"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-muted">
            <Package size={36} weight="light" />
          </div>
        )}
        <span className="absolute left-3 top-3 rounded-full bg-accent px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-accent-ink">
          Oferta
        </span>
        {soldOut && (
          <span className="absolute right-3 top-3 rounded-full bg-ink/85 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-bg">
            Agotada
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col p-4">
        <h3 className="text-base font-semibold text-ink">{combo.title}</h3>
        {combo.description && (
          <p className="mt-1 line-clamp-2 text-sm text-muted">{combo.description}</p>
        )}

        <ul className="mt-3 space-y-1 text-xs text-muted">
          {combo.items.map((i) => (
            <li key={i.productId}>
              {i.quantity}× {i.name}
            </li>
          ))}
        </ul>

        <div className="mt-auto pt-4">
          <div className="flex items-baseline gap-2">
            <span className="text-lg font-semibold tabular-nums text-ink">
              {price(combo.price, combo.currency)}
            </span>
            {saving > 0 && combo.compareAtPrice && (
              <span className="text-sm text-muted line-through tabular-nums">
                {price(combo.compareAtPrice, combo.currency)}
              </span>
            )}
          </div>
          {saving > 0 && (
            <p className="mt-1 inline-flex w-fit rounded-full bg-accent/15 px-2.5 py-1 text-xs font-semibold text-primary">
              Ahorrás {price(saving, combo.currency)}
            </p>
          )}

          <button
            type="button"
            onClick={addToCart}
            disabled={soldOut}
            className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-control bg-primary px-4 py-2.5 text-sm font-medium text-on-primary transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {added ? <Check size={16} weight="bold" /> : <Plus size={16} weight="bold" />}
            {soldOut ? t.pdSoldOut : added ? t.comboAdded : t.comboAdd}
          </button>
        </div>
      </div>
    </article>
  );
}
