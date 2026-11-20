import { NextResponse } from "next/server";
import { getSettings } from "@/lib/settings";
import { manifestIcons } from "@/lib/pwa-icons";

export const dynamic = "force-dynamic";

/**
 * Manifest de la PWA generado en el servidor.
 *
 * Sale de los ajustes de la tienda, así que el nombre, los colores y el logo
 * que el administrador sube se reflejan en la app instalada en el móvil.
 *
 * ACTUALIZACIÓN: el manifiesto se sirve sin caché (no-store) para que el
 * sistema operativo lo vuelva a leer. Cada ícono lleva `?v=<hash del logo>`, así
 * que cuando el dueño cambia el logo, el ícono de la app instalada cambia solo.
 */
export async function GET() {
  const s = await getSettings();
  const icons = manifestIcons(s.logoUrl);

  const manifest = {
    name: s.brand || "Tienda",
    short_name: (s.brand || "Tienda").slice(0, 15),
    description: s.seoDescription || s.tagline || "",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f6f1e6",
    theme_color: "#6b1f2a",
    lang: "es",
    // El id es fijo ("/"): cambiarlo haría que el navegador trate la web como
    // OTRA app y duplique el ícono instalado. El refresco del ícono lo resuelve
    // la URL versionada de cada ícono (?v=<hash del logo>).
    id: "/",
    icons,
  };

  return new NextResponse(JSON.stringify(manifest), {
    status: 200,
    headers: {
      "Content-Type": "application/manifest+json; charset=utf-8",
      "Cache-Control": "no-cache, no-store, must-revalidate",
    },
  });
}
