"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { CheckCircle, WarningCircle, Info, X } from "@phosphor-icons/react/dist/ssr";

type Tone = "success" | "error" | "info";

type Toast = { id: number; tone: Tone; title: string; description?: string };

type ToastContextValue = {
  toast: (tone: Tone, title: string, description?: string) => void;
  success: (title: string, description?: string) => void;
  error: (title: string, description?: string) => void;
  info: (title: string, description?: string) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

const ICONS: Record<Tone, React.ElementType> = {
  success: CheckCircle,
  error: WarningCircle,
  info: Info,
};

const TONE_CLASS: Record<Tone, string> = {
  success: "text-success",
  error: "text-danger",
  info: "text-primary",
};

/**
 * Avisos no bloqueantes en la esquina inferior.
 *
 * Reemplaza `alert()`: interrumpe menos, se puede cerrar, se apila y se lee
 * igual en móvil (aparece abajo, sobre el pulgar). Los avisos de error usan
 * `role="alert"` para que los lectores de pantalla los anuncien.
 */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(1);
  const timers = useRef<Map<number, number>>(new Map());

  const dismiss = useCallback((id: number) => {
    setToasts((list) => list.filter((t) => t.id !== id));
    const timer = timers.current.get(id);
    if (timer) {
      window.clearTimeout(timer);
      timers.current.delete(id);
    }
  }, []);

  const toast = useCallback(
    (tone: Tone, title: string, description?: string) => {
      const id = nextId.current++;
      setToasts((list) => [...list.slice(-3), { id, tone, title, description }]);
      const timer = window.setTimeout(() => dismiss(id), tone === "error" ? 7000 : 4500);
      timers.current.set(id, timer);
    },
    [dismiss],
  );

  useEffect(() => {
    const map = timers.current;
    return () => {
      map.forEach((t) => window.clearTimeout(t));
      map.clear();
    };
  }, []);

  const value = useMemo<ToastContextValue>(
    () => ({
      toast,
      success: (t, d) => toast("success", t, d),
      error: (t, d) => toast("error", t, d),
      info: (t, d) => toast("info", t, d),
    }),
    [toast],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        aria-atomic="false"
        className="pointer-events-none fixed inset-x-0 bottom-0 z-[80] flex flex-col items-center gap-2 px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:items-end sm:px-6"
      >
        {toasts.map((t) => {
          const Icon = ICONS[t.tone];
          return (
            <div
              key={t.id}
              role={t.tone === "error" ? "alert" : "status"}
              className="pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-card border border-line bg-surface p-4 shadow-lift motion-safe:animate-[toast-in_var(--duration-base)_var(--ease-out-soft)]"
            >
              <Icon size={19} weight="fill" className={`mt-0.5 shrink-0 ${TONE_CLASS[t.tone]}`} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium leading-snug text-ink">{t.title}</p>
                {t.description && (
                  <p className="mt-1 text-xs leading-relaxed text-muted">{t.description}</p>
                )}
              </div>
              <button
                type="button"
                onClick={() => dismiss(t.id)}
                aria-label="Cerrar aviso"
                className="-mr-1 -mt-1 rounded-control p-1 text-muted transition-colors duration-150 ease-theme hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                <X size={14} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast debe usarse dentro de <ToastProvider>");
  }
  return ctx;
}
