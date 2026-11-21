"use client";

import { REF_COOKIE } from "./manager-constants";

/**
 * Código del gestor por el que llegó esta persona, leído desde el navegador.
 *
 * Se usa para adjuntarlo a los avisos de audiencia (`/api/track`). La cookie la
 * pone el middleware cuando la visita trae `?ref=CODIGO`; si por algún motivo
 * no estuviera, se mira la dirección actual. Así el panel del dueño siempre sabe
 * si la visita y el carrito vinieron por el enlace de un gestor o directo a la
 * tienda.
 */
export function currentRefCode(): string | null {
  try {
    const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${REF_COOKIE}=([^;]+)`));
    if (match?.[1]) return decodeURIComponent(match[1]).trim() || null;
    const fromUrl = new URLSearchParams(window.location.search).get("ref");
    return fromUrl ? fromUrl.trim() : null;
  } catch {
    return null;
  }
}

/** URL de `/api/track` con el código del gestor, si lo hay. */
export function trackUrl(): string {
  const ref = currentRefCode();
  return ref ? `/api/track?ref=${encodeURIComponent(ref)}` : "/api/track";
}
