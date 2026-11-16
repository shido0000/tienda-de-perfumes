import { getSettings } from "./settings";

/**
 * URL pública del sitio.
 *
 * Por qué existe: el sitemap se estaba generando con un dominio de ejemplo
 * (`https://mistmood.example.com`), así que Google recibía direcciones que no
 * existen y la web no se indexaba nunca. Acá se resuelve, en este orden:
 *
 * 1. `siteUrl` cargado en Administración → Contenido (lo que ve el dueño).
 * 2. `NEXT_PUBLIC_SITE_URL` del deploy (si lo fijó a mano).
 * 3. La URL de producción que inyecta Vercel.
 * 4. El dominio real con el que llegó la petición (sirve para la vista previa
 *    y para cualquier dominio propio que todavía no esté guardado).
 * 5. La URL del deploy puntual de Vercel.
 *
 * Nunca devuelve un dominio inventado: si no hay ninguno, devuelve "" y quien
 * la use omite el dato en vez de mentirle a Google.
 */
export async function getSiteUrl(): Promise<string> {
  const settings = await getSettings().catch(() => null);
  const fromDb = settings?.siteUrl?.trim();

  // Una URL guardada del tipo "…-6x5vec3ke-nocoder1.vercel.app" es la dirección
  // de UN deploy, no la del sitio: cambia en cada publicación y desaparece. Si
  // se le entrega así a Google, el sitemap queda apuntando a una dirección
  // muerta y la tienda no se indexa. Cuando Vercel nos dice cuál es el dominio
  // de producción, ese manda sobre una URL guardada que sea *.vercel.app.
  const vercelProduction = process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "";
  const savedLooksDeploy =
    !fromDb || /\.vercel\.app$/i.test(fromDb.replace(/^https?:\/\//i, ""));
  const dbWins = fromDb && !(vercelProduction && savedLooksDeploy);

  const raw =
    (dbWins ? fromDb : "") ||
    vercelProduction ||
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    (await getRequestOrigin()) ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "") ||
    "";

  if (!raw) return "";
  const withProto = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  return withProto.replace(/\/+$/, "");
}

/**
 * Dominio con el que llegó la petición actual (`tienda.com`, `localhost:3000`,
 * el host de la vista previa…). Es el último recurso antes de rendirse: así el
 * sitemap y el robots.txt siempre apuntan a una dirección viva, incluso cuando
 * el dueño todavía no cargó su dominio en Administración.
 *
 * Devuelve "" fuera de una petición (por ejemplo en un script), donde
 * `headers()` no está disponible.
 */
export async function getRequestOrigin(): Promise<string> {
  try {
    const { headers } = await import("next/headers");
    const h = headers();
    const host = (h.get("x-forwarded-host") || h.get("host") || "").split(",")[0]!.trim();
    if (!host) return "";
    const proto =
      (h.get("x-forwarded-proto") || "").split(",")[0]!.trim() ||
      (/^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/i.test(host) ? "http" : "https");
    return `${proto}://${host}`;
  } catch {
    return "";
  }
}
