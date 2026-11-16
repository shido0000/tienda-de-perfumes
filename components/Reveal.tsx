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
 * Aparición suave al entrar en pantalla, sin dependencias.
 *
 * Sólo se anima si hay IntersectionObserver y el usuario no pidió menos
 * movimiento; en cualquier otro caso el contenido se ve de entrada (nunca
 * queda invisible por un fallo del observer).
 */
export function Reveal({ children, delay = 0, className = "", as = "div" }: RevealProps) {
  const ref = useRef<HTMLElement | null>(null);
  const [shown, setShown] = useState(false);
  const [armed, setArmed] = useState(false);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced || typeof IntersectionObserver === "undefined") {
      setShown(true);
      return;
    }
    setArmed(true);
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setShown(true);
          io.disconnect();
        }
      },
      { rootMargin: "0px 0px -10% 0px", threshold: 0.08 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const Tag = as as any;
  return (
    <Tag
      ref={ref as any}
      style={{ transitionDelay: shown ? `${delay}ms` : undefined }}
      className={`${armed && !shown ? "reveal-init" : ""} ${shown ? "reveal-in" : ""} ${className}`}
    >
      {children}
    </Tag>
  );
}
