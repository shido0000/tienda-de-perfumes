"use client";

import { useEffect } from "react";

/**
 * Límite de error de la aplicación. Sin esto, cualquier excepción de un
 * componente deja la página en blanco con el mensaje crudo de Next; acá
 * mostramos el encabezado y una salida clara.
 */
export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[app] error de render:", error);
  }, [error]);

  return (
    <div className="mx-auto flex min-h-[60vh] w-full max-w-2xl flex-col items-start justify-center px-4 py-16 sm:px-6">
      <p className="text-[11px] uppercase tracking-[0.28em] text-muted">Mist &amp; Mood</p>
      <h1 className="mt-3 font-display text-3xl text-ink sm:text-4xl">
        Algo se trabó al cargar esta página
      </h1>
      <p className="mt-4 max-w-prose text-sm leading-relaxed text-muted">
        El problema es de la página, no de tus datos. Probá recargar; si sigue
        igual, volvé al catálogo y seguí desde ahí.
      </p>
      <div className="mt-8 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={reset}
          className="rounded-control bg-primary px-5 py-2.5 text-sm font-medium text-on-primary transition-colors duration-200 ease-theme hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
        >
          Reintentar
        </button>
        <a
          href="/"
          className="rounded-control border border-line px-5 py-2.5 text-sm text-ink transition-colors duration-200 ease-theme hover:border-primary hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
        >
          Ir al catálogo
        </a>
      </div>
    </div>
  );
}
