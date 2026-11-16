"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { X, Warning } from "@phosphor-icons/react/dist/ssr";

export type ConfirmOptions = {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** `danger` pinta el botón de acción en rojo (borrados, cancelaciones). */
  tone?: "default" | "danger";
};

type PendingConfirm = ConfirmOptions & { resolve: (ok: boolean) => void };

type ConfirmContextValue = {
  /** Devuelve una promesa que resuelve `true` si el usuario confirma. */
  confirm: (options: ConfirmOptions) => Promise<boolean>;
};

const ConfirmContext = createContext<ConfirmContextValue | null>(null);

/**
 * Diálogo de confirmación propio de la tienda.
 *
 * Reemplaza `window.confirm()`: el nativo no se puede estilar, muestra la URL
 * del sitio y en móvil aparece como un aviso del sistema que rompe la
 * experiencia. Este usa los tokens de tema, atrapa el foco y se cierra con Esc.
 */
export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [pending, setPending] = useState<PendingConfirm | null>(null);
  const cancelRef = useRef<HTMLButtonElement | null>(null);
  const confirmRef = useRef<HTMLButtonElement | null>(null);
  const lastFocus = useRef<HTMLElement | null>(null);

  const confirm = useCallback((options: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      lastFocus.current = document.activeElement as HTMLElement | null;
      setPending({ ...options, resolve });
    });
  }, []);

  const close = useCallback(
    (ok: boolean) => {
      setPending((current) => {
        current?.resolve(ok);
        return null;
      });
      // Devolvemos el foco al control que abrió el diálogo.
      window.setTimeout(() => lastFocus.current?.focus?.(), 0);
    },
    [],
  );

  useEffect(() => {
    if (!pending) return;
    // El foco arranca en "Cancelar": la acción destructiva nunca es la primera.
    cancelRef.current?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        close(false);
      }
      if (e.key === "Tab") {
        const a = cancelRef.current;
        const b = confirmRef.current;
        if (!a || !b) return;
        if (e.shiftKey && document.activeElement === a) {
          e.preventDefault();
          b.focus();
        } else if (!e.shiftKey && document.activeElement === b) {
          e.preventDefault();
          a.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [pending, close]);

  const danger = pending?.tone === "danger";

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      {pending && (
        <div
          className="fixed inset-0 z-[70] flex items-end justify-center bg-ink/45 p-4 backdrop-blur-[2px] sm:items-center"
          onClick={() => close(false)}
          role="presentation"
        >
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="confirm-title"
            aria-describedby={pending.description ? "confirm-desc" : undefined}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-card border border-line bg-surface p-6 shadow-lift motion-safe:animate-[confirm-in_var(--duration-base)_var(--ease-theme)]"
          >
            <div className="flex items-start gap-3">
              <span
                aria-hidden="true"
                className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                  danger ? "bg-danger/12 text-danger" : "bg-primary/10 text-primary"
                }`}
              >
                <Warning size={18} weight="bold" />
              </span>
              <div className="min-w-0 flex-1">
                <h2 id="confirm-title" className="font-display text-h3 leading-tight text-ink">
                  {pending.title}
                </h2>
                {pending.description && (
                  <p id="confirm-desc" className="mt-2 text-sm leading-relaxed text-muted">
                    {pending.description}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => close(false)}
                aria-label="Cerrar"
                className="-mr-1 -mt-1 rounded-control p-1.5 text-muted transition-colors duration-150 ease-theme hover:bg-bg hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                <X size={16} />
              </button>
            </div>

            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                ref={cancelRef}
                type="button"
                onClick={() => close(false)}
                className="rounded-control border border-line px-4 py-2.5 text-sm text-ink transition-colors duration-200 ease-theme hover:border-ink/40 hover:bg-bg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                {pending.cancelLabel ?? "Cancelar"}
              </button>
              <button
                ref={confirmRef}
                type="button"
                onClick={() => close(true)}
                className={`rounded-control px-4 py-2.5 text-sm font-medium transition-colors duration-200 ease-theme focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ${
                  danger
                    ? "bg-danger text-white hover:bg-danger/90 focus-visible:outline-danger"
                    : "bg-primary text-on-primary hover:bg-primary/90 focus-visible:outline-primary"
                }`}
              >
                {pending.confirmLabel ?? "Confirmar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) {
    throw new Error("useConfirm debe usarse dentro de <ConfirmProvider>");
  }
  return ctx.confirm;
}
