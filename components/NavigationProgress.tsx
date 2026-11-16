"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

/**
 * Indicador de navegación: al pulsar un enlace interno se muestra una barra de
 * progreso en la parte superior y un velo tenue, porque las páginas que leen la
 * base de datos tardan un instante y sin señal parecía que el clic no hacía nada.
 * Se apaga al terminar la navegación (cambio de ruta) o si el enlace no lleva a
 * ninguna parte.
 */
export function NavigationProgress() {
  const pathname = usePathname();
  const [active, setActive] = useState(false);

  // Al cambiar de ruta (navegación completa) se apaga.
  useEffect(() => {
    setActive(false);
  }, [pathname]);

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

      const anchor = (event.target as HTMLElement | null)?.closest("a");
      if (!anchor) return;
      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("#")) return;
      if (anchor.target && anchor.target !== "_self") return;
      if (anchor.hasAttribute("download")) return;

      let url: URL;
      try {
        url = new URL(href, window.location.href);
      } catch {
        return;
      }
      if (url.origin !== window.location.origin) return;
      // Misma página (sólo hash o query igual): no mostramos nada.
      if (url.pathname === window.location.pathname && url.search === window.location.search) return;

      setActive(true);
    };

    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  // Red de seguridad: si algo falla y nunca llegamos a la nueva ruta, el velo
  // no puede quedarse para siempre bloqueando la pantalla.
  useEffect(() => {
    if (!active) return;
    const t = setTimeout(() => setActive(false), 8000);
    return () => clearTimeout(t);
  }, [active]);

  return (
    <>
      {active && (
        <div
          className="fixed inset-x-0 top-0 z-[100] h-0.5 overflow-hidden bg-primary/15"
          role="progressbar"
          aria-label="Cargando la página"
        >
          <div className="nav-progress-bar h-full w-1/3 bg-primary" />
        </div>
      )}
      {active && (
        <div
          aria-hidden
          className="pointer-events-none fixed inset-x-0 top-0 z-[95] flex justify-center pt-3"
        >
          <span className="flex items-center gap-2 rounded-full border border-line bg-surface/95 px-3.5 py-1.5 text-[11px] text-muted shadow-sm">
            <span className="h-3 w-3 animate-spin rounded-full border-2 border-line border-t-primary" />
            Cargando…
          </span>
        </div>
      )}
    </>
  );
}
