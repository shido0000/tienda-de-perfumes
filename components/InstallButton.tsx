"use client";

import { useEffect, useRef, useState } from "react";
import {
  DeviceMobile,
  DownloadSimple,
  ArrowClockwise,
  X,
  CheckCircle,
} from "@phosphor-icons/react/dist/ssr";
import { applyUpdate, isStandalone, promptInstall, usePwa } from "@/lib/pwa";

type Platform = "ios" | "android" | "desktop";

function detectPlatform(): Platform {
  if (typeof navigator === "undefined") return "desktop";
  const ua = navigator.userAgent;
  if (/iphone|ipad|ipod/i.test(ua)) return "ios";
  // iPad con iPadOS se identifica como MacIntel con pantalla táctil.
  if (/macintosh/i.test(ua) && (navigator as unknown as { maxTouchPoints?: number }).maxTouchPoints! > 1)
    return "ios";
  if (/android/i.test(ua)) return "android";
  return "desktop";
}

/**
 * Botón "Instalar app" del encabezado.
 *
 * Se muestra SIEMPRE que la tienda no esté ya abierta como app instalada (o
 * cuando hay una versión nueva lista para aplicar). Al pulsarlo:
 *  - si hay una actualización del service worker esperando, la aplica y recarga;
 *  - si el navegador ofreció el instalador nativo, lo abre;
 *  - si no (Safari/iPhone, Firefox, o navegadores que no disparan el evento),
 *    abre un instructivo con los pasos de ESE dispositivo, en vez de fingir
 *    que instaló algo.
 */
export function InstallButton({ compact = false }: { compact?: boolean }) {
  const { canInstall, installed, updateReady } = usePwa();
  const [busy, setBusy] = useState(false);
  const [help, setHelp] = useState(false);
  const [done, setDone] = useState(false);
  const [platform, setPlatform] = useState<Platform>("desktop");
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => setPlatform(detectPlatform()), []);

  // Cerrar el instructivo al tocar fuera o con Escape.
  useEffect(() => {
    if (!help) return;
    const onDown = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setHelp(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setHelp(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [help]);

  const click = async () => {
    if (busy) return;
    if (updateReady) {
      setBusy(true);
      await applyUpdate();
      return;
    }
    if (canInstall) {
      setBusy(true);
      const ok = await promptInstall();
      setBusy(false);
      if (ok) setDone(true);
      else setHelp(true);
      return;
    }
    setHelp(true);
  };

  // Ya instalada y sin actualización pendiente: no hay nada que ofrecer.
  if (installed && !updateReady) return null;

  const label = updateReady ? "Actualizar" : "Instalar app";
  const Icon = updateReady ? ArrowClockwise : done ? CheckCircle : DownloadSimple;

  return (
    <div className="relative" ref={boxRef}>
      <button
        type="button"
        onClick={click}
        disabled={busy}
        aria-label={
          updateReady
            ? "Actualizar la app a la última versión"
            : "Instalar la tienda en el móvil o el ordenador"
        }
        aria-haspopup={updateReady ? undefined : "dialog"}
        aria-expanded={updateReady ? undefined : help}
        data-install-button=""
        title={label}
        className={
          compact
            ? "flex w-full items-center gap-2 rounded-control border border-line px-3 py-2 text-sm text-ink transition-colors hover:border-primary hover:text-primary disabled:opacity-50"
            : "flex items-center gap-1.5 whitespace-nowrap rounded-control border border-primary/40 px-2.5 py-1.5 text-xs text-primary transition-colors duration-200 ease-theme hover:bg-primary hover:text-on-primary disabled:opacity-50"
        }
      >
        <Icon size={compact ? 18 : 16} weight="duotone" aria-hidden="true" />
        <span>{label}</span>
      </button>

      {help && (
        <div
          role="dialog"
          aria-label="Cómo instalar la app"
          className="absolute right-0 top-full z-50 mt-2 w-72 rounded-card border border-line bg-surface p-4 text-left shadow-lift"
        >
          <div className="flex items-start justify-between gap-2">
            <p className="flex items-center gap-1.5 text-sm font-medium text-ink">
              <DeviceMobile size={16} weight="duotone" aria-hidden="true" />
              Instalar la tienda como app
            </p>
            <button
              type="button"
              onClick={() => setHelp(false)}
              aria-label="Cerrar"
              className="-mr-1 -mt-1 rounded-control p-1 text-muted transition-colors hover:text-ink"
            >
              <X size={14} />
            </button>
          </div>

          <p className="mt-1.5 text-xs leading-relaxed text-muted">
            Queda como un icono en tu pantalla de inicio y abre a pantalla completa, sin barra
            del navegador. No hace falta ninguna tienda de aplicaciones.
          </p>

          <ol className="mt-3 list-decimal space-y-1.5 pl-4 text-xs leading-relaxed text-ink">
            {platform === "ios" && (
              <>
                <li>Abrí la tienda en Safari.</li>
                <li>Tocá el botón Compartir (el cuadro con la flecha).</li>
                <li>Elegí «Agregar a pantalla de inicio».</li>
                <li>Confirmá con «Agregar».</li>
              </>
            )}
            {platform === "android" && (
              <>
                <li>Abrí la tienda en Chrome.</li>
                <li>Tocá el menú de tres puntos (⋮) arriba a la derecha.</li>
                <li>Elegí «Instalar aplicación» o «Agregar a pantalla principal».</li>
                <li>Confirmá con «Instalar».</li>
              </>
            )}
            {platform === "desktop" && (
              <>
                <li>Buscá en la barra de direcciones el icono de instalar (una pantalla con flecha).</li>
                <li>Si no aparece, abrí el menú del navegador.</li>
                <li>En Chrome o Edge elegí «Instalar Mist &amp; Mood»; en Safari, «Agregar al Dock».</li>
              </>
            )}
          </ol>

          {updateReady && (
            <p className="mt-3 rounded-control bg-accent/10 px-2.5 py-2 text-xs text-ink">
              Hay una versión nueva: usá el botón «Actualizar» para aplicarla.
            </p>
          )}

          <button
            type="button"
            onClick={() => setHelp(false)}
            className="mt-3 w-full rounded-control bg-primary px-3 py-1.5 text-xs font-medium text-on-primary transition-colors hover:bg-primary/90"
          >
            Entendido
          </button>
        </div>
      )}
    </div>
  );
}

/** Variante por si se quiere forzar el cartel fuera del header. */
export function useInstallLabel() {
  const { updateReady, installed, canInstall, iosHint } = usePwa();
  if (typeof window !== "undefined" && isStandalone()) return "Actualizar";
  if (updateReady) return "Actualizar";
  if (!installed && (canInstall || iosHint)) return "Instalar app";
  if (!installed) return "Instalar app";
  return null;
}
