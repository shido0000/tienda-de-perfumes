"use client";

import { useEffect, useState } from "react";
import { CaretLeft, CaretRight, Pause, Play } from "@phosphor-icons/react/dist/ssr";
import { SafeImage } from "@/components/SafeImage";

const AUTOPLAY_MS = 6000;

type FeaturedProduct = {
  id: string;
  name: string;
  brand: string;
  image: string | null;
};

export function HeroProductCarousel({
  products,
  brand,
  imageAlt,
}: {
  products: FeaturedProduct[];
  brand: string;
  imageAlt?: string;
}) {
  const [index, setIndex] = useState(0);
  const [hoverPaused, setHoverPaused] = useState(false);
  const [manualPaused, setManualPaused] = useState(false);
  const count = products.length;
  const paused = hoverPaused || manualPaused;
  const active = count ? products[index % count] : null;

  useEffect(() => {
    if (count < 2 || paused) return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    const timer = window.setInterval(() => {
      setIndex((current) => (current + 1) % count);
    }, AUTOPLAY_MS);
    return () => window.clearInterval(timer);
  }, [count, index, paused]);

  useEffect(() => {
    if (index >= count && count > 0) setIndex(0);
  }, [count, index]);

  if (!count) {
    return (
      <div className="relative mx-auto flex w-full max-w-sm items-center justify-center">
        <div aria-hidden className="halo absolute inset-0 rounded-full" />
        <div className="reveal relative w-full">
          <div className="mx-auto flex aspect-[3/4] w-full max-w-[320px] items-center justify-center rounded-card border border-line bg-surface font-display text-2xl text-muted shadow-theme">
            {brand}
          </div>
        </div>
      </div>
    );
  }

  const go = (step: number) => {
    setIndex((current) => ((current + step) % count + count) % count);
  };

  return (
    <div
      className="relative mx-auto flex w-full max-w-sm items-center justify-center"
      onMouseEnter={() => setHoverPaused(true)}
      onMouseLeave={() => setHoverPaused(false)}
      onFocus={() => setHoverPaused(true)}
      onBlur={() => setHoverPaused(false)}
    >
      <div aria-hidden className="halo absolute inset-0 rounded-full" />
      <div className="reveal relative w-full">
        <div
          className="relative mx-auto aspect-[3/4] w-full max-w-[320px]"
          role={count > 1 ? "region" : undefined}
          aria-roledescription={count > 1 ? "carrusel" : undefined}
          aria-label={count > 1 ? "Perfumes destacados" : undefined}
        >
          {products.map((product, i) => {
            const current = i === index % count;
            return (
              <div
                key={product.id}
                aria-hidden={!current}
                className={`absolute inset-0 transition-opacity duration-700 ease-theme motion-reduce:transition-none ${
                  current ? "opacity-100" : "pointer-events-none opacity-0"
                }`}
              >
                {product.image ? (
                  <SafeImage
                    src={product.image}
                    alt={
                      imageAlt?.trim() ||
                      `${product.name} — ${product.brand || brand}`
                    }
                    loading={i === 0 ? "eager" : "lazy"}
                    fetchPriority={i === 0 ? "high" : undefined}
                    className="h-full w-full rounded-card object-cover shadow-theme ring-1 ring-line/60"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center rounded-card border border-line bg-surface font-display text-2xl text-muted shadow-theme">
                    {product.brand || brand}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {active?.name && (
          <p className="glass-panel float-slow mx-auto mt-[-1.25rem] w-max rounded-full px-4 py-2 text-center font-display text-sm font-semibold text-ink shadow-md">
            {active.name}
          </p>
        )}

        {count > 1 && (
          <div className="mx-auto mt-4 flex w-max items-center gap-3">
            <button
              type="button"
              onClick={() => go(-1)}
              aria-label="Perfume anterior"
              className="rounded-full border border-line bg-surface/70 p-1.5 text-muted transition-colors hover:border-primary hover:text-primary"
            >
              <CaretLeft size={16} weight="bold" />
            </button>
            <div className="flex items-center gap-1.5" role="group" aria-label="Elegir perfume destacado">
              {products.map((product, i) => (
                <button
                  key={`dot-${product.id}`}
                  type="button"
                  onClick={() => setIndex(i)}
                  aria-current={i === index % count}
                  aria-label={`Mostrar ${product.name}`}
                  className={`h-2 rounded-full transition-all duration-300 ${
                    i === index % count ? "w-5 bg-primary" : "w-2 bg-line hover:bg-primary/60"
                  }`}
                />
              ))}
            </div>
            <button
              type="button"
              onClick={() => go(1)}
              aria-label="Perfume siguiente"
              className="rounded-full border border-line bg-surface/70 p-1.5 text-muted transition-colors hover:border-primary hover:text-primary"
            >
              <CaretRight size={16} weight="bold" />
            </button>
            <button
              type="button"
              onClick={() => setManualPaused((value) => !value)}
              aria-label={manualPaused ? "Reanudar carrusel" : "Pausar carrusel"}
              className="rounded-full border border-line bg-surface/70 p-1.5 text-muted transition-colors hover:border-primary hover:text-primary"
            >
              {manualPaused ? <Play size={14} weight="fill" /> : <Pause size={14} weight="fill" />}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
