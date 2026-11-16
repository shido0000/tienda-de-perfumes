"use client";

import { useSiteTexts } from "@/lib/use-site-texts";
import { useEffect, useState } from "react";
import { Star } from "@phosphor-icons/react/dist/ssr";
import type { ReviewDTO } from "@/lib/types";

/**
 * Opiniones de clientas.
 *
 * Solo se muestran las que la tienda aprobó. Para dejar una opinión nueva, el
 * cliente tiene que haber reservado ese perfume (lo valida el servidor) y su
 * comentario entra como "pendiente" hasta que la tienda lo publique.
 */
export function ReviewsBlock({
  productId,
  signedIn,
}: {
  productId: string;
  signedIn: boolean;
}) {
  const t = useSiteTexts();
  const [reviews, setReviews] = useState<ReviewDTO[]>([]);
  const [average, setAverage] = useState(0);
  const [loading, setLoading] = useState(true);

  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [msgError, setMsgError] = useState(false);

  const load = async () => {
    try {
      const res = await fetch(`/api/reviews?productId=${encodeURIComponent(productId)}`);
      const data = await res.json().catch(() => ({}));
      setReviews(data.reviews ?? []);
      setAverage(data.average ?? 0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    setMsgError(false);
    if (comment.trim().length < 10) {
      setMsgError(true);
      setMsg("Escribí al menos 10 caracteres contando tu experiencia.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, rating, comment: comment.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMsgError(true);
        setMsg(data.error ?? "No pudimos enviar tu opinión.");
        return;
      }
      setComment("");
      setMsgError(false);
      setMsg("¡Gracias! Tu opinión quedó pendiente de revisión y se publicará pronto.");
    } catch {
      setMsgError(true);
      setMsg("No pudimos enviar tu opinión. Revisá tu conexión.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="mt-14 border-t border-line pt-8" aria-label="Opiniones de clientas">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 className="text-h3 text-ink">{t.reviewsHeading}</h2>
        {reviews.length > 0 && (
          <span className="flex items-center gap-1.5 text-sm text-muted">
            <Star size={16} weight="fill" className="text-primary" />
            <strong className="tabular-nums text-ink">{average}</strong>
            <span>
              · {reviews.length} {reviews.length === 1 ? "opinión" : "opiniones"}
            </span>
          </span>
        )}
      </div>

      {loading ? (
        <p className="mt-4 text-sm text-muted">{t.reviewsLoading}</p>
      ) : reviews.length === 0 ? (
        <p className="mt-4 text-sm text-muted">
          Todavía no hay opiniones publicadas de este perfume. Si ya lo reservaste, podés ser la
          primera persona en contarnos qué te pareció.
        </p>
      ) : (
        <ul className="mt-5 space-y-4">
          {reviews.map((r) => (
            <li key={r.id} className="rounded-card border border-line bg-surface p-4">
              <div className="flex items-center gap-2">
                <span className="flex" aria-label={`${r.rating} de 5 estrellas`}>
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      size={14}
                      weight={i < r.rating ? "fill" : "regular"}
                      className={i < r.rating ? "text-primary" : "text-line"}
                    />
                  ))}
                </span>
                <span className="text-sm font-medium text-ink">{r.authorName}</span>
              </div>
              <p className="mt-2 text-sm leading-relaxed text-muted">{r.comment}</p>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-8 rounded-card border border-line bg-surface p-5">
        <h3 className="text-sm font-medium text-ink">{t.reviewsFormTitle}</h3>
        {!signedIn ? (
          <p className="mt-2 text-sm text-muted">
            Ingresá a tu cuenta para opinar. Solo aceptamos opiniones de perfumes que hayas
            reservado.
          </p>
        ) : (
          <form onSubmit={submit} className="mt-3">
            <div className="flex items-center gap-1" role="radiogroup" aria-label="Puntuación">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setRating(n)}
                  aria-label={`${n} estrellas`}
                  aria-checked={rating === n}
                  role="radio"
                  className="p-0.5"
                >
                  <Star
                    size={22}
                    weight={n <= rating ? "fill" : "regular"}
                    className={n <= rating ? "text-primary" : "text-line"}
                  />
                </button>
              ))}
            </div>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
              placeholder="¿Cómo te fue con esta fragancia? ¿Cuánto duró, en qué ocasión la usaste?"
              className="mt-3 w-full rounded-control border border-line bg-bg px-3 py-2 text-sm text-ink placeholder:text-muted focus:border-primary focus:outline-none"
            />
            {msg && (
              <p className={`mt-2 text-xs ${msgError ? "text-danger" : "text-primary"}`}>{msg}</p>
            )}
            <button
              type="submit"
              disabled={busy}
              className="mt-3 rounded-control bg-primary px-4 py-2 text-sm font-medium text-on-primary transition-colors hover:bg-primary/90 disabled:opacity-50"
            >
              {busy ? "Enviando…" : "Enviar opinión"}
            </button>
          </form>
        )}
      </div>
    </section>
  );
}
