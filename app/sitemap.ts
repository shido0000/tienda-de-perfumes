import type { MetadataRoute } from "next";
import { prisma } from "@/lib/db";
import { getSiteUrl } from "@/lib/site-url";

/**
 * sitemap.xml — la lista de direcciones que le entregamos a Google.
 *
 * Antes se armaba con `https://mistmood.example.com` (un dominio de ejemplo que
 * no existe), así que Google descartaba todas las URLs y la tienda no aparecía
 * en las búsquedas. Ahora la base es la URL real de la tienda.
 *
 * Se regenera en cada visita (la tienda cambia de productos seguido).
 */
export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = await getSiteUrl();

  // Sin URL real no se puede publicar un sitemap válido: se devuelve vacío
  // (Google lo ignora) en vez de mandarle direcciones falsas.
  if (!base) return [];

  const staticRoutes: MetadataRoute.Sitemap = [
    "",
    "/catalogo",
    "/ofertas",
    "/rebajas",
    "/encuentra-tu-aroma",
    "/login",
    "/registro",
    "/carrito",
    "/deseos",
    "/mi-cuenta",
    "/legal/terminos",
    "/legal/reservas-pagos",
    "/legal/privacidad",
    "/legal/cookies",
  ].map((path) => ({
    url: `${base}${path}`,
    lastModified: new Date(),
    changeFrequency: path === "" || path === "/catalogo" ? "weekly" : "monthly",
    priority: path === "" ? 1 : path === "/catalogo" ? 0.9 : 0.5,
  }));

  let productRoutes: MetadataRoute.Sitemap = [];
  try {
    const products = await prisma.product.findMany({
      where: { visible: true },
      select: { id: true, updatedAt: true },
      orderBy: { updatedAt: "desc" },
    });
    productRoutes = products.map((p) => ({
      url: `${base}/producto/${p.id}`,
      lastModified: p.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    }));
  } catch {
    productRoutes = [];
  }

  return [...staticRoutes, ...productRoutes];
}
