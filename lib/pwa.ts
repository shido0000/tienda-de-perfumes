"use client";

/**
 * Estado de la app instalable (PWA), compartido entre componentes.
 *
 * El navegador dispara `beforeinstallprompt` UNA sola vez y muy temprano, a
 * veces antes de que React monte el encabezado. Por eso el evento se captura en
 * un almacén a nivel de módulo (al importar este archivo) y los componentes se
 * suscriben: el botón del encabezado y el aviso flotante ven el mismo estado y
 * comparten el mismo evento de instalación.
 *
 * También cubre la actualización: cuando el service worker nuevo termina de
 * instalarse queda "esperando"; avisamos al usuario y, si acepta, se le manda
 * SKIP_WAITING y se recarga una vez.
 */
import { useEffect, useState } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export type PwaState = {
  /** El navegador ofreció instalar y todavía no se instaló. */
  canInstall: boolean;
  /** La web ya corre como app instalada (pantalla completa). */
  installed: boolean;
  /** En iOS no hay evento: hay que explicar los pasos a mano. */
  iosHint: boolean;
  /** Hay una versión nueva del service worker esperando. */
  updateReady: boolean;
};

const DISMISS_KEY = "mistmood_install_dismissed";

let deferredPrompt: BeforeInstallPromptEvent | null = null;
let updateRegistration: ServiceWorkerRegistration | null = null;

const listeners = new Set<() => void>();
let snapshot: PwaState = {
  canInstall: false,
  installed: false,
  iosHint: false,
  updateReady: false,
};

function emit(patch: Partial<PwaState>) {
  snapshot = { ...snapshot, ...patch };
  listeners.forEach((fn) => fn());
}

function subscribe(fn: () => void) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

export function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia?.("(display-mode: standalone)").matches === true ||
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

export function wasInstallDismissed(): boolean {
  try {
    return localStorage.getItem(DISMISS_KEY) === "1";
  } catch {
    return false;
  }
}

export function dismissInstallPrompt() {
  try {
    localStorage.setItem(DISMISS_KEY, "1");
  } catch {
    /* modo privado: se ignora */
  }
  emit({ canInstall: false });
}

/** Instala la app. Devuelve true si el usuario aceptó. */
export async function promptInstall(): Promise<boolean> {
  if (snapshot.installed) return false;
  if (!deferredPrompt) return false;
  await deferredPrompt.prompt();
  const choice = await deferredPrompt.userChoice.catch(() => ({ outcome: "dismissed" as const }));
  deferredPrompt = null;
  if (choice.outcome === "accepted") {
    emit({ canInstall: false, installed: true });
    return true;
  }
  dismissInstallPrompt();
  return false;
}

/** Aplica la actualización pendiente del service worker. */
export async function applyUpdate() {
  const reg = updateRegistration ?? (await navigator.serviceWorker?.getRegistration());
  const worker = reg?.waiting;
  if (worker) {
    worker.postMessage({ type: "SKIP_WAITING" });
    // El nuevo worker toma el control en `controllerchange`: recargamos ahí.
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      window.location.reload();
    });
    return;
  }
  window.location.reload();
}

// ── Arranque: se ejecuta una vez por carga de página ──────────────────────
if (typeof window !== "undefined") {
  emit({ installed: isStandalone() });

  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredPrompt = e as BeforeInstallPromptEvent;
    emit({ canInstall: !isStandalone() });
  });

  window.addEventListener("appinstalled", () => {
    deferredPrompt = null;
    emit({ canInstall: false, installed: true });
  });

  // Cambio de modo de pantalla: detecta instalación y desinstalación.
  const mq = window.matchMedia?.("(display-mode: standalone)");
  mq?.addEventListener?.("change", (e) => emit({ installed: e.matches }));

  const ios = /iphone|ipad|ipod/i.test(window.navigator.userAgent);
  if (ios) emit({ iosHint: !isStandalone() });

  if ("serviceWorker" in navigator) {
    const register = async () => {
      try {
        const reg = await navigator.serviceWorker.register("/sw.js");
        // Si ya hay un worker esperando (versión nueva), lo avisamos.
        if (reg.waiting) {
          updateRegistration = reg;
          emit({ updateReady: true });
        }
        reg.addEventListener("updatefound", () => {
          const next = reg.installing;
          next?.addEventListener("statechange", () => {
            // "installed" con un controlador activo = hay versión nueva lista.
            if (next.state === "installed" && navigator.serviceWorker.controller) {
              updateRegistration = reg;
              emit({ updateReady: true });
            }
          });
        });
        // Buscar actualizaciones al volver a la pestaña y cada hora.
        document.addEventListener("visibilitychange", () => {
          if (document.visibilityState === "visible") reg.update().catch(() => {});
        });
        setInterval(() => reg.update().catch(() => {}), 60 * 60 * 1000);
      } catch {
        /* si falla, la web sigue funcionando igual */
      }
    };

    if (document.readyState === "complete") void register();
    else window.addEventListener("load", () => void register(), { once: true });
  }
}

/** Hook de suscripción al estado de la PWA. */
export function usePwa(): PwaState {
  const [state, setState] = useState<PwaState>(snapshot);
  useEffect(() => {
    const sync = () => setState(snapshot);
    sync();
    return subscribe(sync);
  }, []);
  return state;
}
