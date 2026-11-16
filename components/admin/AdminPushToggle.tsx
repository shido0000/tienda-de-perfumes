"use client";

import { useCallback, useEffect, useState } from "react";
import { Bell, BellSlash, PaperPlaneTilt } from "@phosphor-icons/react/dist/ssr";
import { useToast } from "@/components/ui/ToastProvider";

type State = "unsupported" | "default" | "granted" | "denied" | "working";
/** Convierte la clave pública VAPID (base64url) al formato que pide el navegador. */
function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const normalized = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(normalized);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

/** Ruta del service worker, respetando un despliegue bajo un subcamino. */
function swUrl(): string {
  const path = window.location.pathname;
  const prefix = path.includes("/preview/") ? path.split("/preview/")[0] + "/preview/" + path.split("/preview/")[1].split("/")[0] + "/" : "/";
  return prefix + "sw.js";
}

/**
 * Avisos de reservas en el móvil/escritorio del administrador.
 *
 * Usa Web Push: cuando entra una reserva nueva, el servidor manda una
 * notificación y el sistema la muestra aunque la web esté cerrada (igual que
 * WhatsApp). Las claves del servidor se generan solas la primera vez; desde aquí
 * solo hay que activar el permiso en cada dispositivo.
 */
export function AdminPushToggle() {
  const [state, setState] = useState<State>("working");
  const [ready, setReady] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const toast = useToast();

  const sync = useCallback(async () => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      setState("unsupported");
      setReady(false);
      return;
    }

    const keyRes = await fetch("/api/push/key").catch(() => null);
    const keyData = keyRes ? await keyRes.json().catch(() => ({})) : {};
    setReady(Boolean(keyData.publicKey));

    // Lo que manda es si ESTE dispositivo está suscrito, no solo el permiso.
    try {
      const reg = await navigator.serviceWorker.getRegistration();
      const sub = reg ? await reg.pushManager.getSubscription() : null;
      if (sub && Notification.permission === "granted") {
        setState("granted");
        return;
      }
    } catch {
      /* si falla la consulta se usa el permiso del navegador */
    }
    setState(
      Notification.permission === "denied"
        ? "denied"
        : "default",
    );
  }, []);

  useEffect(() => {
    void sync();
  }, [sync]);

  /** Espera como mucho `ms` a una promesa; si no llega, devuelve null. */
  const withTimeout = <T,>(p: Promise<T>, ms: number): Promise<T | null> =>
    Promise.race([p, new Promise<null>((res) => setTimeout(() => res(null), ms))]);

  const enable = async () => {
    setBusy(true);
    try {
      const keyRes = await fetch("/api/push/key");
      const { publicKey } = await keyRes.json();
      if (!publicKey) throw new Error("El servidor no pudo generar las claves de aviso.");

      // El service worker debe estar listo antes de suscribirse. Tiene un
      // límite de tiempo: si el navegador no lo registra, se avisa en vez de
      // dejar el botón colgado para siempre.
      const registered = await withTimeout(
        navigator.serviceWorker.register(swUrl()).catch(() => null),
        10000,
      );
      const ready =
        registered ?? (await withTimeout(navigator.serviceWorker.ready, 10000));
      if (!ready || !("pushManager" in ready)) {
        throw new Error(
          "Este navegador no pudo preparar el aviso ahora mismo. Probá desde el sitio publicado de la tienda (o recargá la página).",
        );
      }

      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setState(permission === "denied" ? "denied" : "default");
        throw new Error("El navegador no dio permiso para las notificaciones.");
      }

      const sub = await withTimeout(
        ready.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey) as unknown as BufferSource,
        }),
        15000,
      );
      if (!sub) throw new Error("El navegador tardó demasiado en confirmar el aviso. Probá otra vez.");

      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sub.toJSON()),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error ?? "No se pudo guardar la suscripción.");
      }
      setState("granted");
      toast.success("Avisos activados", "Te llegarán las reservas nuevas a este dispositivo.");
    } catch (err) {
      toast.error("No se pudieron activar los avisos", err instanceof Error ? err.message : "");
    } finally {
      setBusy(false);
    }
  };

  const disable = async () => {
    setBusy(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await fetch("/api/push/subscribe", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        });
        await sub.unsubscribe();
      }
      setState("default");
      toast.success("Avisos desactivados", "Este dispositivo ya no recibirá reservas.");
    } catch (err) {
      toast.error("No se pudieron desactivar", err instanceof Error ? err.message : "");
    } finally {
      setBusy(false);
    }
  };

  const sendTest = async () => {
    setBusy(true);
    try {
      const res = await fetch("/api/push/test", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "No se pudo enviar la prueba.");
      toast.success("Prueba enviada", "Mirá las notificaciones de este dispositivo.");
    } catch (err) {
      toast.error("No se pudo enviar la prueba", err instanceof Error ? err.message : "");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="mt-8 rounded-card border border-line bg-surface p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="flex items-center gap-2 text-h3">
            <Bell size={18} className="text-primary" /> Avisos de reservas
          </h2>
          <p className="mt-1 max-w-xl text-sm leading-relaxed text-muted">
            Recibí una notificación en este dispositivo cada vez que un cliente haga una
            reserva, incluso con la web cerrada. Es el aviso del sistema, como el de WhatsApp.
          </p>
          {ready === false && (
            <p className="mt-2 text-xs text-danger">
              No se pudieron preparar las claves de aviso en el servidor. Probá recargar la
              página; si sigue igual, revisá los registros del servidor.
            </p>
          )}
          {state === "unsupported" && (
            <p className="mt-2 text-xs text-danger">
              Este navegador no admite notificaciones push. Probá con Chrome, Edge o Safari
              actualizado, y en iPhone primero instalá la app desde Compartir → Añadir a inicio.
            </p>
          )}
          {state === "denied" && (
            <p className="mt-2 text-xs text-danger">
              Bloqueaste las notificaciones para este sitio. Habilitalas desde el candado de la
              barra de direcciones.
            </p>
          )}
          {state === "granted" && (
            <p className="mt-2 text-xs text-success">
              Este dispositivo está suscrito: las reservas nuevas te avisan acá.
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {state === "granted" && (
            <button
              type="button"
              onClick={sendTest}
              disabled={busy}
              className="flex items-center gap-1.5 rounded-control border border-line px-4 py-2 text-sm text-ink transition-colors hover:border-primary hover:text-primary disabled:opacity-50"
            >
              <PaperPlaneTilt size={16} /> Enviar prueba
            </button>
          )}
          {state === "granted" ? (
            <button
              type="button"
              onClick={disable}
              disabled={busy}
              className="flex items-center gap-1.5 rounded-control border border-line px-4 py-2 text-sm text-ink transition-colors hover:border-danger hover:text-danger disabled:opacity-50"
            >
              <BellSlash size={16} /> Desactivar
            </button>
          ) : (
            <button
              type="button"
              onClick={enable}
              disabled={busy || state === "unsupported"}
              className="flex items-center gap-1.5 rounded-control bg-primary px-4 py-2 text-sm font-medium text-on-primary transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              <Bell size={16} /> Activar avisos
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
