import { prisma } from "@/lib/db";

/**
 * Sirve una foto de producto desde la base con caché agresiva.
 *
 * Las fotos subidas desde el panel se guardan como data URL (base64) dentro del
 * registro del producto. Antes, cada HTML/JSON las incluía inline: la portada
 * pesaba ~15 MB (18 perfumes × ~800 KB) y el navegador no podía cachearlas, por
 * eso la web se sentía lenta aunque hubiera pocos productos.
 *
 * Esta ruta las entrega aparte: el navegador y la CDN de Vercel las cachean un
 * año (`immutable`), así que una segunda visita ya no descarga ninguna imagen.
 *
 *   GET /api/img/{productId}/{index}
 */
export const dynamic = "force-dynamic";

const DATA_URL = /^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/;

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string; index: string }> },
) {
  const { id, index } = await params;
  const productId = decodeURIComponent(id);
  const imageIndex = Number.parseInt(index, 10);

  if (!productId || !Number.isInteger(imageIndex) || imageIndex < 0) {
    return new Response("Imagen inválida", { status: 400 });
  }

  const product = await prisma.product
    .findUnique({ where: { id: productId }, select: { images: true } })
    .catch(() => null);

  const url = product?.images?.[imageIndex];
  if (!url) {
    return new Response("Imagen no encontrada", { status: 404 });
  }

  // Una URL externa (http/https): redirigimos para no duplicar tráfico.
  if (!url.startsWith("data:")) {
    return Response.redirect(url, 302);
  }

  const match = DATA_URL.exec(url);
  if (!match) {
    return new Response("Formato de imagen no soportado", { status: 415 });
  }

  const [, mime, base64] = match;
  const buffer = Buffer.from(base64, "base64");

  return new Response(buffer, {
    status: 200,
    headers: {
      "Content-Type": mime,
      // El contenido de una posición concreta no cambia; si el dueño reemplaza
      // la foto, la URL se pide con un `?v` nuevo desde el panel.
      "Cache-Control": "public, max-age=31536000, immutable",
      "Content-Length": String(buffer.byteLength),
    },
  });
}
