import { NextResponse } from "next/server";
import { getSettings } from "@/lib/settings";
import { logoVersion } from "@/lib/pwa-icons";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const ICON_CACHE_LIMIT = 8;
const iconCache = new Map<string, Uint8Array>();

function rememberIcon(key: string, bytes: Uint8Array): Uint8Array {
  const cached = iconCache.get(key);
  if (cached) return cached;
  iconCache.set(key, bytes);
  while (iconCache.size > ICON_CACHE_LIMIT) {
    const oldest = iconCache.keys().next().value;
    if (oldest === undefined) break;
    iconCache.delete(oldest);
  }
  return bytes;
}

/**
 * Sirve el logo de la tienda (que se guarda en la base como data URL base64)
 * como una imagen aparte.
 *
 *   GET /api/logo                 -> el logo tal cual
 *   GET /api/logo?v=<hash>        -> mismo logo, con ?v= para forzar refresco
 *   GET /api/logo?size=192        -> recortado/cuadrado a 192×192 (ícono de app)
 *   GET /api/logo?size=512&pad=20 -> 512×512 con margen (ícono "maskable" Android)
 *
 * Los íconos de la app instalada (PWA) salen de acá: se toma el logo que subió
 * el administrador, se encaja en un cuadrado del tamaño pedido y se devuelve.
 * Así el ícono nunca sale deformado ni con el logo estirado, sea cual sea la
 * forma del logo original.
 *
 * ACTUALIZACIÓN AUTOMÁTICA
 * ------------------------
 * Cada URL lleva `?v=<hash del logo>`. Cuando el dueño cambia el logo, cambia
 * el hash, cambia la URL y el navegador descarga el ícono nuevo por su cuenta
 * (sin reinstalar la app). El manifiesto además se sirve sin caché.
 */
export async function GET(req: Request) {
  const settings = await getSettings();
  const raw = (settings.logoUrl ?? "").trim();

  if (!raw) {
    return NextResponse.json({ error: "La tienda no tiene logo configurado." }, { status: 404 });
  }

  const url = new URL(req.url);
  const sizeParam = Number(url.searchParams.get("size") ?? "0");
  const size = Number.isFinite(sizeParam) && sizeParam >= 32 && sizeParam <= 1024 ? Math.round(sizeParam) : 0;
  const padParam = Number(url.searchParams.get("pad") ?? "0");
  const padPct = Number.isFinite(padParam) && padParam >= 0 && padParam <= 40 ? Math.round(padParam) : 0;

  const version = logoVersion(raw);
  const etag = `"logo-${version}-${size}-${padPct}"`;
  const inm = req.headers.get("if-none-match");
  if (inm && inm.split(",").some((t) => t.trim() === etag)) {
    return new NextResponse(null, { status: 304, headers: { ETag: etag } });
  }

  // Logo externo (URL): redirigimos si no hay que redimensionar.
  if (!raw.startsWith("data:")) {
    if (!size) {
      return NextResponse.redirect(raw, {
        status: 307,
        headers: { "Cache-Control": "public, max-age=3600" },
      });
    }
    return NextResponse.redirect(raw, {
      status: 307,
      headers: { "Cache-Control": "public, max-age=3600" },
    });
  }

  const match = /^data:([^;,]+)?(;base64)?,(.*)$/s.exec(raw);
  if (!match) {
    return NextResponse.json({ error: "El logo guardado no es válido." }, { status: 400 });
  }

  const mime = (match[1] || "image/png").toLowerCase();
  const isBase64 = Boolean(match[2]);
  const payload = match[3] ?? "";
  const source = isBase64
    ? Buffer.from(payload, "base64")
    : Buffer.from(decodeURIComponent(payload), "utf8");

  const cacheHeaders = {
    "Cache-Control": "public, max-age=3600, must-revalidate",
    ETag: etag,
    "X-Content-Type-Options": "nosniff",
  };

  // Sin tamaño pedido: se devuelve la imagen original tal cual.
  if (!size) {
    return new NextResponse(new Uint8Array(source), {
      status: 200,
      headers: {
        ...cacheHeaders,
        "Content-Type": mime,
        "Content-Length": String(source.length),
      },
    });
  }

  // Ícono cuadrado: se encaja el logo en el tamaño pedido, con margen opcional
  // (para que Android no recorte los bordes del ícono "maskable").
  try {
    const sharp = (await import("sharp")).default;
    // Un SVG puede tener fondo transparente; lo rasterizamos a alta densidad
    // para que no salga borroso al agrandarlo.
    const inner = Math.max(1, Math.round(size * (1 - (padPct / 100) * 2)));
    const png = await sharp(source, { density: 384 })
      .resize(inner, inner, {
        fit: "contain",
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      })
      .extend({
        top: Math.round((size - inner) / 2),
        bottom: size - inner - Math.round((size - inner) / 2),
        left: Math.round((size - inner) / 2),
        right: size - inner - Math.round((size - inner) / 2),
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      })
      .png()
      .toBuffer();

    const cached = rememberIcon(etag, new Uint8Array(png));
    return new NextResponse(new Uint8Array(cached), {
      status: 200,
      headers: {
        ...cacheHeaders,
        "Content-Type": "image/png",
        "Content-Length": String(cached.length),
      },
    });
  } catch {
    // Si la imagen no se pudo procesar, se entrega el original: el ícono
    // puede salir recortado, pero la app sigue funcionando.
    return new NextResponse(new Uint8Array(source), {
      status: 200,
      headers: {
        ...cacheHeaders,
        "Content-Type": mime,
        "Content-Length": String(source.length),
      },
    });
  }
}
