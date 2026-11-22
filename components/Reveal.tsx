"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

type RevealProps = {
  children: ReactNode;
  /** Retardo en ms para escalonar varios bloques. */
  delay?: number;
  className?: string;
  as?: "div" | "section" | "li" | "article";
};

/**
 * Aparición suave al cargar, sin dependencias y sin riesgo de contenido oculto.
 *
 * Regla de oro: el contenido NUNCA queda invisible. La animación es sólo un
 * extra que se dispara al montar; si el navegador no ejecuta JS, no hay
 * IntersectionObserver o el usuario pidió menos movimiento, todo se ve igual.
 * (Antes se esperaba al scroll con IntersectionObserver: en capturas de página
 * completa o con el observer sin dispararse, las tarjetas quedaban en opacidad 0.)
 */
export function Reveal({ children, delay = 0, className = "", as = "div" }: RevealProps) {
  const ref = useRef<HTMLElement | null>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const reduced =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (reduced) {
      setShown(true);
      return;
    }

    // Se muestra en el siguiente frame tras la hidratación: la transición de
    // opacidad se reproduce una vez y el contenido queda visible para siempre.
    const raf = window.requestAnimationFrame(() => setShown(true));
    // Red de seguridad extra por si el frame no llega (pestaña en segundo plano).
    const failsafe = window.setTimeout(() => setShown(true), 1200);

    return () => {
      window.cancelAnimationFrame(raf);
      window.clearTimeout(failsafe);
    };
  }, []);

  const Tag = as as any;
  return (
    <Tag
      ref={ref as any}
      style={{ transitionDelay: shown ? `${delay}ms` : undefined }}
      className={`${shown ? "reveal-in" : ""} ${className}`}
    >
      {children}
    </Tag>
  );
}
