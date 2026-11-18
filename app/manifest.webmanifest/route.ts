import { NextResponse } from "next/server";
import { getSettings } from "@/lib/settings";
import { manifestIcons } from "@/lib/pwa-icons";

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

  // El logo que el dueño subió en el panel es el ícono de la app instalada:
  // va primero en el manifest. Si no hay logo, quedan los íconos por defecto.
  const icons = manifestIcons(icon);

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
