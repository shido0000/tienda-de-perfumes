"use client";

import { useEffect } from "react";

/**
 * Envía UN beacon por sesión de navegación para registrar que este visitante
 * entró por el enlace de un gestor. El servidor decide si cuenta (cookie del
 * gestor + dedupe por navegador y día); aquí solo avisamos una vez.
 *
 * No renderiza nada y envuelve todo en try/catch: si el registro falla, jamás
 * debe interrumpir la tienda.
 */
export function ManagerVisitTracker() {
  useEffect(() => {
    try {
      const KEY = "mm_visit_sent";
      if (sessionStorage.getItem(KEY)) return;
      sessionStorage.setItem(KEY, "1");
      fetch("/api/manager/visit", { method: "POST", keepalive: true }).catch(() => {});
    } catch {
      /* sessionStorage no disponible: se ignora */
    }
  }, []);
  return null;
}
