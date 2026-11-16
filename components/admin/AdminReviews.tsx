"use client";

import { useCallback, useEffect, useState } from "react";
import { Star, CheckCircle, XCircle, ArrowClockwise, ChatCircleText } from "@phosphor-icons/react/dist/ssr";
import { formatDateTime } from "@/lib/format-date";

type AdminReview = {
  id: string;
  productId: string;
  productName: string;
  authorName: string;
  rating: number;
  comment: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  createdAt: string;
};

const FILTERS = ["PENDING", "APPROVED", "REJECTED", "ALL"] as const;
const FILTER_LABEL: Record<string, string> = {
  PENDING: "Pendientes",
  APPROVED: "Publicadas",
  REJECTED: "Rechazadas",
  ALL: "Todas",
};

type ReviewStats = {
  total: number;
  approved: number;
  pending: number;
  rejected: number;
  average: number;
  distribution: { rating: number; count: number }[];
  topProducts: { name: string; count: number; average: number }[];
};

/**
 * Moderación de opiniones. Solo se muestran en la web las aprobadas, y solo
 * puede opinar quien reservó el perfume (lo garantiza el servidor).
 */
export function AdminReviews() {
  const [reviews, setReviews] = useState<AdminReview[]>([]);
  const [stats, setStats] = useState<ReviewStats | null>(null);
  const [filter, setFilter] = useState<string>("PENDING");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async (f: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/reviews?status=${f}`);
      const data = await res.json().catch(() => ({}));
      setReviews(data.reviews ?? []);
      if (data.stats) setStats(data.stats as ReviewStats);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(filter);
  }, [filter, load]);

  const setStatus = async (id: string, status: "APPROVED" | "REJECTED" | "PENDING") => {
    setBusy(id);
    await fetch("/api/admin/reviews", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    }).catch(() => null);
    setBusy(null);
    load(filter);
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-h2">Opiniones</h1>
          <p className="mt-1 text-sm text-muted">
            Publicá solo lo que leas y te guste. En la web aparece únicamente lo aprobado.
          </p>
        </div>
        <button
          onClick={() => load(filter)}
          className="flex items-center gap-2 rounded-control border border-line px-3 py-2 text-sm text-muted transition-colors hover:text-ink"
        >
          <ArrowClockwise size={15} /> Actualizar
        </button>
      </div>

      {stats && (
        <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
          <div className="rounded-card border border-line bg-surface p-5">
            <div className="flex items-end gap-3">
              <span className="font-display text-4xl tabular-nums text-ink">
                {stats.average.toFixed(1)}
              </span>
              <span className="pb-2 text-xs text-muted">promedio de {stats.approved} publicadas</span>
            </div>
            <span className="mt-1 flex" aria-label={`${stats.average} de 5`}>
              {Array.from({ length: 5 }).map((_, i) => (
                <Star
                  key={i}
                  size={16}
                  weight={i < Math.round(stats.average) ? "fill" : "regular"}
                  className={i < Math.round(stats.average) ? "text-primary" : "text-line"}
                />
              ))}
            </span>
            <dl className="mt-4 grid grid-cols-3 gap-2 text-center">
              <div className="rounded-control bg-bg/60 px-2 py-2">
                <dt className="text-[11px] text-muted">Pendientes</dt>
                <dd className="text-lg font-medium tabular-nums text-ink">{stats.pending}</dd>
              </div>
              <div className="rounded-control bg-bg/60 px-2 py-2">
                <dt className="text-[11px] text-muted">Publicadas</dt>
                <dd className="text-lg font-medium tabular-nums text-primary">{stats.approved}</dd>
              </div>
              <div className="rounded-control bg-bg/60 px-2 py-2">
                <dt className="text-[11px] text-muted">Rechazadas</dt>
                <dd className="text-lg font-medium tabular-nums text-muted">{stats.rejected}</dd>
              </div>
            </dl>
          </div>

          <div className="rounded-card border border-line bg-surface p-5">
            <h2 className="text-sm font-medium text-ink">Cómo se reparten las estrellas</h2>
            <ul className="mt-3 space-y-1.5">
              {[...stats.distribution].reverse().map((d) => {
                const max = Math.max(1, ...stats.distribution.map((x) => x.count));
                const pct = Math.round((d.count / max) * 100);
                return (
                  <li key={d.rating} className="flex items-center gap-2 text-xs">
                    <span className="flex w-8 items-center gap-0.5 tabular-nums text-muted">
                      {d.rating}
                      <Star size={10} weight="fill" className="text-primary" />
                    </span>
                    <span className="h-2 flex-1 overflow-hidden rounded-full bg-line">
                      <span
                        className="block h-full rounded-full bg-primary transition-[width] duration-300 ease-theme"
                        style={{ width: `${pct}%` }}
                      />
                    </span>
                    <span className="w-6 text-right tabular-nums text-muted">{d.count}</span>
                  </li>
                );
              })}
            </ul>
            {stats.topProducts.length > 0 && (
              <>
                <h3 className="mt-4 text-xs font-medium uppercase tracking-wide text-muted">
                  Más opinados
                </h3>
                <ul className="mt-2 space-y-1 text-xs">
                  {stats.topProducts.map((p) => (
                    <li key={p.name} className="flex items-center justify-between gap-2">
                      <span className="truncate text-ink">{p.name}</span>
                      <span className="shrink-0 tabular-nums text-muted">
                        {p.average.toFixed(1)}★ · {p.count}
                      </span>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        </div>
      )}

      <div className="mt-5 flex flex-wrap gap-1.5">
        {FILTERS.map((f) => (          <button
            key={f}
            onClick={() => setFilter(f)}
            aria-pressed={filter === f}
            className={`rounded-control border px-3 py-1.5 text-xs transition-colors ${
              filter === f
                ? "border-primary bg-primary/10 text-primary"
                : "border-line text-muted hover:text-ink"
            }`}
          >
            {FILTER_LABEL[f]}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="mt-6 text-sm text-muted">Cargando opiniones…</p>
      ) : reviews.length === 0 ? (
        <div className="mt-6 rounded-card border border-line bg-surface p-8 text-center">
          <ChatCircleText size={28} weight="duotone" className="mx-auto text-muted" />
          <p className="mt-3 text-sm text-muted">
            No hay opiniones en este filtro. Cuando una clienta opine sobre un perfume que
            reservó, aparecerá acá para que la revises.
          </p>
        </div>
      ) : (
        <ul className="mt-6 space-y-3">
          {reviews.map((r) => (
            <li key={r.id} className="rounded-card border border-line bg-surface p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-ink">
                    {r.authorName} <span className="text-muted">· {r.productName}</span>
                  </p>
                  <span className="mt-1 flex" aria-label={`${r.rating} de 5`}>
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        size={13}
                        weight={i < r.rating ? "fill" : "regular"}
                        className={i < r.rating ? "text-primary" : "text-line"}
                      />
                    ))}
                  </span>
                </div>
                <span className="text-[11px] text-muted">{formatDateTime(r.createdAt)}</span>
              </div>
              <p className="mt-2 text-sm leading-relaxed text-muted">{r.comment}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {r.status !== "APPROVED" && (
                  <button
                    onClick={() => setStatus(r.id, "APPROVED")}
                    disabled={busy === r.id}
                    className="flex items-center gap-1 rounded-control border border-primary/40 px-3 py-1.5 text-xs text-primary transition-colors hover:bg-primary/10 disabled:opacity-50"
                  >
                    <CheckCircle size={13} /> Publicar
                  </button>
                )}
                {r.status !== "REJECTED" && (
                  <button
                    onClick={() => setStatus(r.id, "REJECTED")}
                    disabled={busy === r.id}
                    className="flex items-center gap-1 rounded-control border border-line px-3 py-1.5 text-xs text-muted transition-colors hover:text-danger disabled:opacity-50"
                  >
                    <XCircle size={13} /> Rechazar
                  </button>
                )}
                {r.status === "APPROVED" && (
                  <span className="rounded-control border border-primary/40 bg-primary/5 px-2.5 py-1.5 text-[11px] text-primary">
                    Publicada
                  </span>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
