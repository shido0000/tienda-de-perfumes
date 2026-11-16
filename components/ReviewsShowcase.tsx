"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Star, ChatCircleText, ArrowRight } from "@phosphor-icons/react/dist/ssr";

type ShowcaseReview = {
  id: string;
  productId: string;
  productName: string;
  authorName: string;
  rating: number;
  comment: string;
  createdAt: string;
};

/**
 * Últimas opiniones publicadas, al final del catálogo.
 *
 * Muestra las 5 reseñas aprobadas más recientes con el perfume al que
 * pertenecen. Si todavía no hay ninguna, la sección no se dibuja (no mostramos
 * un bloque vacío en la portada).
 */
export function ReviewsShowcase({ title }: { title?: string }) {
  const [reviews, setReviews] = useState<ShowcaseReview[]>([]);
  const [average, setAverage] = useState(0);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/reviews")
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        const list = (d.reviews ?? []) as ShowcaseReview[];
        setReviews(list.slice(0, 5));
        setAverage(typeof d.average === "number" ? d.average : 0);
      })
      .catch(() => null)
      .finally(() => !cancelled && setLoaded(true));
    return () => {
      cancelled = true;
    };
  }, []);

  if (!loaded || reviews.length === 0) return null;

  return (
    <section className="mx-auto mt-20 w-full max-w-6xl px-4 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-h2 text-ink">
            {title?.trim() || "Lo que dicen quienes ya lo tienen"}
          </h2>
          <p className="mt-1 flex items-center gap-2 text-sm text-muted">
            <span className="flex" aria-label={`${average} de 5`}>
              {Array.from({ length: 5 }).map((_, i) => (
                <Star
                  key={i}
                  size={13}
                  weight={i < Math.round(average) ? "fill" : "regular"}
                  className={i < Math.round(average) ? "text-primary" : "text-line"}
                />
              ))}
            </span>
            {average.toFixed(1)} de promedio en las opiniones publicadas
          </p>
        </div>
      </div>

      <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {reviews.map((r) => (
          <li
            key={r.id}
            className="flex flex-col justify-between rounded-card border border-line bg-surface p-4"
          >
            <div>
              <span className="flex" aria-label={`${r.rating} de 5`}>
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    size={12}
                    weight={i < r.rating ? "fill" : "regular"}
                    className={i < r.rating ? "text-primary" : "text-line"}
                  />
                ))}
              </span>
              <p className="mt-2 line-clamp-4 text-sm leading-relaxed text-muted">“{r.comment}”</p>
            </div>
            <div className="mt-3 flex items-center justify-between gap-2 border-t border-line pt-2.5">
              <span className="min-w-0 text-xs text-muted">
                <span className="text-ink">{r.authorName}</span>
                <span className="mx-1">·</span>
                <Link
                  href={`/producto/${r.productId}`}
                  className="truncate underline decoration-line underline-offset-2 hover:text-ink hover:decoration-primary"
                >
                  {r.productName}
                </Link>
              </span>
              <ChatCircleText size={14} className="shrink-0 text-muted" />
            </div>
          </li>
        ))}
      </ul>

      <div className="mt-5 flex justify-center">
        <a
          href="#catalogo"
          className="inline-flex items-center gap-1 text-sm text-primary underline decoration-primary/40 underline-offset-4 hover:decoration-primary"
        >
          Ver los perfumes reseñados <ArrowRight size={14} />
        </a>
      </div>
    </section>
  );
}
