/**
 * Limitador de intentos en memoria (ventana deslizante simple).
 *
 * Frena ataques de fuerza bruta contra login/registro y evita que una misma IP
 * sature endpoints públicos. Vive en memoria del proceso: en Vercel cada
 * instancia tiene su propio contador, que es suficiente como primera barrera
 * (no es un WAF) y no requiere base de datos ni dependencias nuevas.
 */

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

/** Cada cuánto se barren los cubos vencidos para no crecer sin límite. */
let lastSweep = Date.now();

function sweep(now: number) {
  if (now - lastSweep < 60_000) return;
  lastSweep = now;
  for (const [key, b] of buckets) {
    if (b.resetAt <= now) buckets.delete(key);
  }
}

export type RateLimitResult = {
  ok: boolean;
  remaining: number;
  retryAfterSeconds: number;
};

/**
 * Cuenta un intento para `key`. Devuelve ok=false cuando se superó el máximo
 * de `limit` intentos dentro de `windowMs`.
 */
export function rateLimit(key: string, limit = 10, windowMs = 60_000): RateLimitResult {
  const now = Date.now();
  sweep(now);

  const current = buckets.get(key);
  if (!current || current.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, remaining: limit - 1, retryAfterSeconds: 0 };
  }

  current.count += 1;
  if (current.count > limit) {
    return {
      ok: false,
      remaining: 0,
      retryAfterSeconds: Math.max(1, Math.ceil((current.resetAt - now) / 1000)),
    };
  }
  return { ok: true, remaining: limit - current.count, retryAfterSeconds: 0 };
}

/** IP del cliente a partir de las cabeceras del proxy. */
export function clientIp(req: Request): string {
  const h = req.headers;
  const forwarded = h.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return h.get("x-real-ip") ?? "desconocida";
}

/** Respuesta 429 estándar con cabecera Retry-After. */
export function tooManyRequests(retryAfterSeconds: number): Response {
  return new Response(
    JSON.stringify({
      error: `Demasiados intentos. Probá de nuevo en ${retryAfterSeconds} segundos.`,
    }),
    {
      status: 429,
      headers: {
        "Content-Type": "application/json",
        "Retry-After": String(retryAfterSeconds),
      },
    },
  );
}
