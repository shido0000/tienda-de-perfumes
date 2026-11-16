"use client";

/**
 * Instalación automática de la app + aviso de actualización.
 *
 * Los navegadores NO permiten instalar una web sin una interacción del usuario:
 * `prompt()` tiene que salir dentro de un gesto (toque o clic). Así que en vez
 * de pedirle al cliente que busque un botón, la app abre el instalador sola en
 * el PRIMER toque en cualquier parte de la página. El sistema muestra su propio
 * diálogo ("¿Instalar Mist & Mood?") y, si acepta, queda el ícono en la
 * pantalla de inicio como una app real (pantalla completa, sin barra del
 * navegador).
 *
 * El botón de "Instalar" sigue existiendo en el pie y en la portada para quien
 * diga "ahora no".
 */
import { useEffect, useRef, useState } from "react";
import { ArrowClockwise, DownloadSimple, X } from "@phosphor-icons/react/dist/ssr";
import { applyUpdate, promptInstall, usePwa, wasInstallDismissed } from "@/lib/pwa";

const AUTO_KEY = "mistmood_install_auto_tried";

export function PwaRegister() {
  const { canInstall, installed, iosHint, updateReady } = usePwa();
  const [dismissed, setDismissed] = useState(true);
  const [busy, setBusy] = useState(false);
  const autoTried = useRef(false);

  // La decisión de "no ahora" se lee en el cliente (no en el render del server).
  useEffect(() => setDismissed(wasInstallDismissed()), []);

  // Instalación automática en el primer gesto del usuario. Se registra una sola
  // vez por sesión y se quita apenas se dispara (o si ya se intentó antes).
  useEffect(() => {
    if (!canInstall || installed) return;
    if (autoTried.current) return;
    try {
      if (sessionStorage.getItem(AUTO_KEY) === "1") return;
    } catch {
      /* modo privado */
    }

    const cleanup = () => {
      document.removeEventListener("pointerdown", fire, true);
      document.removeEventListener("keydown", fire, true);
    };

    const fire = () => {
      autoTried.current = true;
      try {
        sessionStorage.setItem(AUTO_KEY, "1");
      } catch {
        /* modo privado */
      }
      cleanup();
      void promptInstall();
    };

    document.addEventListener("pointerdown", fire, true);
    document.addEventListener("keydown", fire, true);
    return cleanup;
  }, [canInstall, installed]);

  const showInstall = !installed && !dismissed && (canInstall || iosHint);
  if (!showInstall && !updateReady) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-[60] flex flex-col items-center gap-2 px-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] sm:items-end sm:px-4">
      {updateReady && (
        <div className="pointer-events-auto flex w-full items-center gap-3 rounded-card border border-line bg-surface p-3 shadow-lift sm:w-80">
          <span
            aria-hidden="true"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent/15 text-accent"
          >
            <ArrowClockwise size={18} weight="bold" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-ink">Hay una versión nueva</p>
            <p className="mt-0.5 text-xs leading-relaxed text-muted">
              Actualizá para ver los últimos cambios de la tienda.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setBusy(true);
              void applyUpdate();
            }}
            disabled={busy}
            className="shrink-0 rounded-control bg-primary px-3 py-1.5 text-xs font-medium text-on-primary transition-colors duration-200 ease-theme hover:bg-primary/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-60"
          >
            {busy ? "Actualizando…" : "Actualizar"}
          </button>
        </div>
      )}

      {showInstall && (
        <div className="pointer-events-auto flex w-full items-start gap-3 rounded-card border border-line bg-surface p-4 shadow-lift sm:w-80">
          <span
            aria-hidden="true"
            className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary"
          >
            <DownloadSimple size={18} weight="bold" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-ink">Instalá la tienda en tu móvil</p>
            <p className="mt-1 text-xs leading-relaxed text-muted">
              {iosHint && !canInstall
                ? "Tocá Compartir y elegí «Agregar a pantalla de inicio» para abrirla como una app."
                : "Se abre como cualquier app: ícono en la pantalla, a pantalla completa. Sin tiendas de aplicaciones."}
            </p>
            {canInstall && (
              <button
                type="button"
                onClick={() => void promptInstall()}
                className="mt-3 rounded-control bg-primary px-3 py-1.5 text-xs font-medium text-on-primary transition-colors duration-200 ease-theme hover:bg-primary/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                Instalar ahora
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={() => setDismissed(true)}
            aria-label="Ahora no"
            className="-mr-1 -mt-1 rounded-control p-1 text-muted transition-colors duration-150 ease-theme hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            <X size={14} />
          </button>
        </div>
      )}
    </div>
  );
}
