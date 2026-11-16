"use client";

import { useEffect, useState } from "react";
import { DeviceMobile, DownloadSimple, ArrowClockwise, CheckCircle } from "@phosphor-icons/react/dist/ssr";
import { applyUpdate, promptInstall, usePwa } from "@/lib/pwa";

/**
 * Franja "Llevate la tienda en el teléfono" de la portada.
 *
 * El botón del encabezado es pequeño y en móvil puede pasar desapercibido, así
 * que la portada ofrece también este bloque visible. Muestra:
 *  - "Actualizar app" cuando hay una versión nueva del service worker esperando;
 *  - "Instalar app" cuando el navegador permite instalar;
 *  - los pasos manuales cuando el navegador no ofrece el instalador (iPhone,
 *    Firefox…), en vez de un botón que no hace nada;
 *  - nada si la tienda ya está abierta como aplicación instalada.
 */
export function InstallCta() {
  const { canInstall, installed, updateReady } = usePwa();
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [help, setHelp] = useState(false);
  const [isIos, setIsIos] = useState(false);

  useEffect(() => {
    const ua = navigator.userAgent;
    setIsIos(/iphone|ipad|ipod/i.test(ua) || (/macintosh/i.test(ua) && navigator.maxTouchPoints > 1));
  }, []);

  if (installed && !updateReady) return null;

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

  return (
    <section className="mx-auto mt-16 w-full max-w-6xl px-4 sm:px-6">
      <div className="flex flex-col gap-4 rounded-card border border-line bg-surface p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
            <DeviceMobile size={20} weight="duotone" aria-hidden="true" />
          </span>
          <div>
            <h2 className="font-display text-lg text-ink">Llevá Mist &amp; Mood en tu teléfono</h2>
            <p className="mt-1 max-w-lg text-sm leading-relaxed text-muted">
              Se abre como una app: ícono en la pantalla de inicio, a pantalla completa y con el
              carrito y tus reservas a mano, incluso con mala conexión.
            </p>
          </div>
        </div>

        <div className="flex shrink-0 flex-col items-stretch gap-2 sm:items-end">
          <button
            type="button"
            onClick={click}
            disabled={busy}
            className="inline-flex items-center justify-center gap-2 rounded-control bg-primary px-4 py-2.5 text-sm font-medium text-on-primary transition-colors duration-200 ease-theme hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface disabled:opacity-50"
          >
            {updateReady ? (
              <ArrowClockwise size={17} weight="bold" aria-hidden="true" />
            ) : done ? (
              <CheckCircle size={17} weight="fill" aria-hidden="true" />
            ) : (
              <DownloadSimple size={17} weight="bold" aria-hidden="true" />
            )}
            {updateReady ? "Actualizar app" : done ? "Instalada" : "Instalar app"}
          </button>
          {!canInstall && !updateReady && (
            <button
              type="button"
              onClick={() => setHelp((v) => !v)}
              aria-expanded={help}
              className="text-xs text-muted underline decoration-line underline-offset-4 transition-colors hover:text-primary"
            >
              ¿Cómo se instala?
            </button>
          )}
        </div>
      </div>

      {help && (
        <div className="mt-3 rounded-card border border-line bg-bg p-4 text-sm leading-relaxed text-muted">
          {isIos ? (
            <p>
              En el iPhone o iPad: abrí esta página en <strong className="text-ink">Safari</strong>,
              tocá el botón <strong className="text-ink">Compartir</strong> (el cuadro con la flecha
              hacia arriba) y elegí <strong className="text-ink">Añadir a pantalla de inicio</strong>.
            </p>
          ) : (
            <p>
              En Android con <strong className="text-ink">Chrome</strong>: tocá el menú de tres puntos
              arriba a la derecha y elegí <strong className="text-ink">Instalar aplicación</strong>.
              En el ordenador, buscá el ícono de instalar en la barra de direcciones.
            </p>
          )}
        </div>
      )}
    </section>
  );
}
