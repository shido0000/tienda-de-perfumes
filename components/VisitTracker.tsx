"use client";

import { useEffect } from "react";
import { trackUrl } from "@/lib/manager-client";

/**
 * Avisa una sola vez por sesión de navegación que esta persona entró a la
 * tienda. El servidor decide el canal (directo o por enlace de gestor) y anota
 * la visita para las estadísticas del panel.
 *
 * Lleva el código del gestor en la dirección para que el canal no se pierda
 * aunque la cookie todavía no esté puesta al cargar la página.
 *
 * Nunca muestra nada y cualquier falla se ignora: jamás debe interrumpir la
 * tienda.
 */
export function VisitTracker() {
  useEffect(() => {
    try {
      const KEY = "mm_site_visit_sent";
      if (sessionStorage.getItem(KEY)) return;
      sessionStorage.setItem(KEY, "1");
      fetch(trackUrl(), { method: "POST", keepalive: true }).catch(() => {});
    } catch {
      /* sessionStorage no disponible: se ignora */
    }
  }, []);
  return null;
}
