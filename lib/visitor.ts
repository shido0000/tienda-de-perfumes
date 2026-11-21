import { cookies } from "next/headers";

/**
 * Identificador anónimo del navegador.
 *
 * Se guarda en la cookie `mm_vid` y NO es la cuenta del cliente: sirve para no
 * contar dos veces a la misma persona y para poder rastrear un carrito aunque
 * todavía no haya iniciado sesión. Nunca se usa para identificar a alguien por
 * nombre.
 */
export const VISITOR_COOKIE = "mm_vid";
export const VISITOR_MAX_AGE = 60 * 60 * 24 * 365; // 1 año

function newVisitorId(): string {
  return `v_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
}

/** Día local YYYY-MM-DD, para deduplicar visitas del mismo día. */
export function todayKey(): string {
  const d = new Date();
  const pad = (n: number) => (n < 10 ? `0${n}` : String(n));
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/**
 * Lee el visitorId de la petición. Si todavía no existe, genera uno y avisa que
 * hay que guardarlo en la respuesta (shouldSet = true).
 */
export function readVisitor(): { visitorId: string; shouldSet: boolean } {
  const existing = cookies().get(VISITOR_COOKIE)?.value;
  if (existing) return { visitorId: existing, shouldSet: false };
  return { visitorId: newVisitorId(), shouldSet: true };
}

/** Cookie que debe devolverse cuando readVisitor() pidió guardar el id. */
export function visitorCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    path: "/",
    maxAge: VISITOR_MAX_AGE,
  };
}
