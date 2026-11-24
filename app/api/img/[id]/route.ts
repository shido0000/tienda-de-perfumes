import { prisma } from "@/lib/db";
import { parseJson } from "@/lib/json";

/**
 * Sirve la PRIMERA foto de un producto (la que usa la tarjeta del catálogo).
 *
 *   GET /api/img/{productId}
 *
 * Mismas garantías que /api/img/{id}/{index}: se entrega aparte del HTML y con
 * caché de un año, así la portada no pesa ~15 MB en base64.
 */
export const dynamic = "force-dynamic";

const DATA_URL = /^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/;

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const productId = decodeURIComponent(id);
  if (!productId) return new Response("Imagen inválida", { status: 400 });

  const product = await prisma.product
    .findUnique({ where: { id: productId }, select: { images: true } })
    .catch(() => null);

  const images = parseJson<string[]>(product?.images, []);
  const url = Array.isArray(images) ? images[0] : undefined;
  if (!url) return new Response("Imagen no encontrada", { status: 404 });

  if (!url.startsWith("data:")) {
    return Response.redirect(url, 302);
  }

  const match = DATA_URL.exec(url);
  if (!match) return new Response("Formato de imagen no soportado", { status: 415 });

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
