import { NextResponse } from "next/server";
import { getSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

/**
 * Manifest de la PWA generado en el servidor.
 *
 * Sale de los ajustes de la tienda, así que el nombre, los colores y el logo
 * que el administrador sube se reflejan en la app instalada en el móvil.
 */
export async function GET() {
  const s = await getSettings();
  const icon = s.logoUrl ?? null;

  // Los íconos PNG 192/512 SIEMPRE van: sin ellos Chrome no ofrece instalar la
  // app de verdad (solo crea un "acceso directo" que se abre dentro del
  // navegador). Si el dueño subió un logo, se agrega ADEMÁS como primer ícono.
  const baseIcons = [
    { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
    { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
    {
      src: "/icons/icon-maskable-512.png",
      sizes: "512x512",
      type: "image/png",
      purpose: "maskable",
    },
  ];

  const icons = icon && /\.(png|jpe?g|webp)$/i.test(icon)
    ? [{ src: icon, sizes: "512x512", type: "image/png", purpose: "any" }, ...baseIcons]
    : baseIcons;

  const manifest = {
    id: "/",
    name: `${s.brand} — ${s.tagline || "Perfumería"}`,
    short_name: s.brand.length > 12 ? s.brand.slice(0, 12) : s.brand,
    description: s.seoDescription,
    start_url: "/?source=pwa",
    scope: "/",
    display: "standalone",
    display_override: ["standalone", "minimal-ui"],
    orientation: "portrait",
    background_color: "#f7f4ee",
    theme_color: "#6e1f2c",
    lang: "es",
    dir: "ltr",
    categories: ["shopping", "lifestyle"],
    icons,
    shortcuts: [
      { name: "Catálogo", short_name: "Catálogo", url: "/catalogo" },
      { name: "Mi carrito", short_name: "Carrito", url: "/carrito" },
      { name: "Mis reservas", short_name: "Reservas", url: "/mis-reservas" },
    ],
  };

  return NextResponse.json(manifest, {
    headers: {
      "Content-Type": "application/manifest+json",
      "Cache-Control": "public, max-age=0, must-revalidate",
    },
  });
}
