"use client";

import { useState } from "react";
import { CaretDown } from "@phosphor-icons/react/dist/ssr";
import type { ProductFaqItem } from "@/lib/types";

/**
 * Preguntas frecuentes de la ficha del perfume.
 *
 * Las carga el dueño desde Productos. Se muestran plegadas (una abierta a la
 * vez) para no empujar el botón de reserva hacia abajo, y el JSON-LD `FAQPage`
 * lo agrega la página para que Google pueda mostrarlas en los resultados.
 */
export function ProductFaq({ faqs }: { faqs: ProductFaqItem[] }) {
  const [open, setOpen] = useState<number | null>(faqs.length ? 0 : null);

  if (!faqs.length) return null;

  return (
    <section className="mt-12 border-t border-line pt-8" aria-labelledby="faq-title">
      <h2 id="faq-title" className="text-h3">
        Preguntas frecuentes
      </h2>
      <dl className="mt-4 divide-y divide-line border-y border-line">
        {faqs.map((faq, i) => {
          const abierta = open === i;
          return (
            <div key={`${faq.q}-${i}`} className="py-3">
              <dt>
                <button
                  type="button"
                  aria-expanded={abierta}
                  onClick={() => setOpen(abierta ? null : i)}
                  className="flex w-full items-center justify-between gap-4 text-left text-sm font-medium text-ink transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                >
                  <span>{faq.q}</span>
                  <CaretDown
                    size={14}
                    className={`shrink-0 text-muted transition-transform duration-200 ease-theme ${
                      abierta ? "rotate-180" : ""
                    }`}
                  />
                </button>
              </dt>
              {abierta && (
                <dd className="mt-2 max-w-[68ch] text-sm leading-relaxed text-muted">{faq.a}</dd>
              )}
            </div>
          );
        })}
      </dl>
    </section>
  );
}
