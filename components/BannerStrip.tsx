"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowRight, CaretLeft, CaretRight } from "@phosphor-icons/react/dist/ssr";
import type { BannerDTO } from "@/lib/types";

const AUTOPLAY_MS = 6000;

/**
 * Franja de banners promocionales.
 *
 * El MARCO es uno solo y no cambia nunca: mismo alto, mismo fondo, mismos
 * bordes, mismas flechas. Lo único que rota es el CONTENIDO —título, subtítulo,
 * botón y una textura de fondo muy tenue—, que se funde suavemente mientras el
 * anterior se desvanece. Así, al pasar de un banner a otro, la caja se queda
 * quieta y no se ve "saltar" el bloque entero.
 *
 * Con un solo banner se muestra fijo; con dos o más avanza solo cada 6 s y se
 * pausa al pasar el mouse o al llegar con el teclado.
 */
export function BannerStrip({ banners }: { banners: BannerDTO[] }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const count = banners.length;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const go = useCallback(
    (next: number) => {
      if (count === 0) return;
      setIndex(((next % count) + count) % count);
    },
    [count],
  );

  useEffect(() => {
    if (count < 2 || paused) return;
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;

    timer.current = setInterval(() => {
      setIndex((i) => (i + 1) % count);
    }, AUTOPLAY_MS);
    return () => {
      if (timer.current) clearInterval(timer.current);
      timer.current = null;
    };
  }, [count, paused]);

  // Si el administrador borra banners, el índice no puede quedar fuera de rango.
  useEffect(() => {
    if (index >= count && count > 0) setIndex(0);
  }, [count, index]);

  if (count === 0) return null;

  const single = count === 1;

  return (
    <div
      className="mx-auto mt-14 w-full max-w-6xl px-4 sm:px-6"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      {/*
        MARCO FIJO. Todo lo visual que define "la caja" —fondo, alto, bordes,
        radios— vive aquí y NO depende del banner activo. Por eso cambiar de
        banner no mueve, redimensiona ni recolorea el elemento.
      */}
      <div
        className="relative isolate overflow-hidden rounded-card border border-primary/25 bg-primary text-on-primary shadow-lift"
        role={single ? undefined : "region"}
        aria-roledescription={single ? undefined : "carrusel"}
        aria-label={single ? undefined : "Promociones"}
        style={{ minHeight: "8.5rem" }}
      >
        {/* Textura decorativa del fondo de cada banner: se funde muy tenue para
            dar variedad sin que la caja cambie de color. */}
        {banners.map((b, i) => {
          if (!b.image) return null;
          const active = i === index;
          return (
            <span
              key={`bg-${b.id}`}
              aria-hidden="true"
              className={`pointer-events-none absolute inset-0 -z-10 bg-cover bg-center transition-opacity duration-700 ease-theme ${
                active ? "opacity-25" : "opacity-0"
              }`}
              style={{ backgroundImage: `url("${b.image}")` }}
            />
          );
        })}

        {/* Capas de CONTENIDO. Comparten el mismo espacio absoluto, así el
            marco nunca crece ni se encoge entre banners. */}
        <div className="relative grid min-h-[8.5rem]">
          {banners.map((b, i) => {
            const active = i === index;
            const body = (
              <div className="relative flex h-full flex-col justify-center gap-4 px-6 py-6 sm:flex-row sm:items-center sm:justify-between sm:px-8">
                <div className="relative z-[1] min-w-0">
                  <p className="font-display text-lg font-semibold leading-snug sm:text-xl">
                    {b.title}
                  </p>
                  {b.subtitle && (
                    <p className="mt-1 max-w-xl text-sm leading-relaxed opacity-85">
                      {b.subtitle}
                    </p>
                  )}
                </div>
                {b.ctaLabel && b.ctaUrl && (
                  <span className="relative z-[1] inline-flex w-fit shrink-0 items-center gap-1.5 rounded-control border border-on-primary/40 bg-on-primary/10 px-4 py-2 text-sm font-medium transition-colors hover:bg-on-primary/20">
                    {b.ctaLabel}
                    <ArrowRight size={15} aria-hidden="true" />
                  </span>
                )}
              </div>
            );

            const external = /^https?:\/\//i.test(b.ctaUrl ?? "");
            const linkClass =
              "block h-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-on-primary/70";
            const interactive =
              b.ctaUrl && b.ctaLabel ? (
                external ? (
                  <a
                    href={b.ctaUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={linkClass}
                    tabIndex={active ? 0 : -1}
                  >
                    {body}
                  </a>
                ) : (
                  <Link
                    href={b.ctaUrl}
                    className={linkClass}
                    tabIndex={active ? 0 : -1}
                  >
                    {body}
                  </Link>
                )
              ) : (
                body
              );

            return (
              <div
                key={b.id}
                aria-hidden={!active}
                // Cambio SECUENCIAL, no fundido cruzado: el banner que sale se
                // desvanece primero (240 ms, sin espera) y el que entra aparece
                // después (240 ms de espera + 260 ms). Si ambos se fundieran a
                // la vez, durante medio segundo se leerían los dos textos
                // superpuestos y se notaría el salto. Las capas comparten celda
                // de la grilla, así que el marco nunca cambia de alto.
                className={`col-start-1 row-start-1 transition-[opacity,transform] ease-theme motion-reduce:transition-none ${
                  active
                    ? "pointer-events-auto translate-y-0 opacity-100 duration-[260ms]"
                    : "pointer-events-none translate-y-1 opacity-0 duration-[240ms]"
                }`}
                style={{ transitionDelay: active ? "240ms" : "0ms" }}
              >
                {interactive}
              </div>
            );
          })}
        </div>

        {!single && (
          <>
            <button
              type="button"
              onClick={() => go(index - 1)}
              aria-label="Banner anterior"
              className="absolute left-2 top-1/2 z-[3] -translate-y-1/2 rounded-full bg-black/25 p-1.5 text-white transition-colors hover:bg-black/45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80"
            >
              <CaretLeft size={18} weight="bold" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => go(index + 1)}
              aria-label="Banner siguiente"
              className="absolute right-2 top-1/2 z-[3] -translate-y-1/2 rounded-full bg-black/25 p-1.5 text-white transition-colors hover:bg-black/45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80"
            >
              <CaretRight size={18} weight="bold" aria-hidden="true" />
            </button>
          </>
        )}
      </div>

      {!single && (
        <div className="mt-3 flex justify-center gap-1.5">
          {banners.map((b, i) => (
            <button
              key={b.id}
              type="button"
              onClick={() => go(i)}
              aria-label={`Ir al banner ${i + 1}`}
              aria-current={i === index}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === index ? "w-6 bg-primary" : "w-1.5 bg-line hover:bg-muted"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
