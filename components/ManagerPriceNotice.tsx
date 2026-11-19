"use client";

import { useRef, useState } from "react";
import { Tag, X } from "@phosphor-icons/react/dist/ssr";

/**
 * Aviso que aparece cuando el visitante llegó por el enlace de un gestor.
 *
 * Le dice, en una línea, que los precios incluyen la ganancia del revendedor, y
 * le ofrece volver a los precios normales. Así los precios no parecen "subidos"
 * sin explicación y el cliente puede salir del modo gestor sin cerrar el
 * navegador ni borrar cookies a mano.
 */
export function ManagerPriceNotice({ managerName }: { managerName: string | null }) {
  const [hidden, setHidden] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  if (hidden) return null;

  return (
    <div className="border-b border-line bg-accent/10 print:hidden">
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-2 text-xs text-ink sm:text-sm">
        <Tag size={15} className="shrink-0 text-accent-ink" aria-hidden />
        <p className="min-w-0 flex-1">
          Estás viendo los precios con el recargo de{" "}
          <strong className="font-semibold">
            {managerName ? managerName : "un revendedor"}
          </strong>
          .
        </p>
        <form ref={formRef} action="/api/manager/exit" method="post" className="shrink-0">
          <button
            type="submit"
            onClick={() => setLeaving(true)}
            disabled={leaving}
            className="rounded-control border border-line bg-surface px-2.5 py-1 text-xs font-medium text-ink transition-colors duration-200 ease-theme hover:border-primary hover:text-primary disabled:opacity-60"
          >
            {leaving ? "Quitando…" : "Ver precios normales"}
          </button>
        </form>
        <button
          type="button"
          aria-label="Ocultar este aviso"
          onClick={() => setHidden(true)}
          className="shrink-0 rounded-control p-1 text-muted transition-colors duration-200 ease-theme hover:bg-line/60 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}
