import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/site-url";

export const dynamic = "force-dynamic";

/**
 * robots.txt — deja libre el catálogo público y bloquea el panel de la tienda
 * y las rutas privadas de cada cliente.
 *
 * El `sitemap` se declara con la URL completa y real: si se deja relativo, o
 * apuntando a un dominio de ejemplo, Google no encuentra la lista de páginas y
 * la tienda tarda meses (o nunca) en aparecer en los resultados.
 */
export default async function robots(): Promise<MetadataRoute.Robots> {
  const base = await getSiteUrl();

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/admin",
          "/api/",
          "/mis-reservas",
          "/checkout",
          "/carrito",
          "/deseos",
          "/mi-cuenta",
          "/offline",
        ],
      },
    ],
    ...(base ? { sitemap: `${base}/sitemap.xml`, host: base } : {}),
  };
}
