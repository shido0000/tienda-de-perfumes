import { getSettings } from "@/lib/settings";

/**
 * Sirve el logo de la tienda (que se guarda en la base como data URL base64)
 * como una imagen aparte, cacheable durante un año.
 *
 *   GET /api/logo
 *
 * Antes el logo base64 viajaba DENTRO del HTML de cada página (favicon,
 * JSON-LD, cabecera y la copia del stream de React): ~11 KB repetidos 8 veces
 * en cada visita. Con esta ruta el navegador lo descarga una vez y lo cachea.
 */
export const dynamic = "force-dynamic";

const DATA_URL = /^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/;

export async function GET() {
  let settings: Awaited<ReturnType<typeof getSettings>>;
  try {
    settings = await getSettings();
  } catch {
    return new Response("Logo no disponible", { status: 404 });
  }

  const url = settings.logoUrl;
  if (!url) return new Response("Logo no encontrado", { status: 404 });

  if (!url.startsWith("data:")) {
    // Un logo http(s) externo: redirigimos a él.
    return Response.redirect(url, 302);
  }

  const match = DATA_URL.exec(url);
  if (!match) return new Response("Formato de logo no soportado", { status: 415 });

  const [, mime, base64] = match;
  const buffer = Buffer.from(base64, "base64");

  return new Response(buffer, {
    status: 200,
    headers: {
      "Content-Type": mime,
      "Cache-Control": "public, max-age=31536000, immutable",
      "Content-Length": String(buffer.byteLength),
    },
  });
}
