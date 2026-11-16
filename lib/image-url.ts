/**
 * Las fotos de producto se guardan en la base como data URL (base64) cuando la
 * tienda las sube desde el panel. Enviar esas cadenas dentro del HTML de la
 * portada era lo que hacía la web lenta: 18 perfumes × ~800 KB = ~14,5 MB que
 * el navegador tenía que descargar en cada visita y no podía cachear.
 *
 * `publicImageUrl` convierte una imagen de la base en una dirección que el
 * navegador descarga aparte, con caché de un año (`/api/img/...`). Así el HTML
 * queda liviano, las fotos se cachean y la portada carga rápido. Las URLs
 * externas (http/https) se dejan tal cual.
 */
export function publicImageUrl(productId: string, index: number, url: string | undefined | null): string {
  if (!url) return "";
  if (url.startsWith("data:") || url.startsWith("blob:")) {
    return `/api/img/${encodeURIComponent(productId)}/${index}`;
  }
  return url;
}

/** Mapea la galería completa de un producto a URLs servidas con caché. */
export function publicImages(productId: string, images: string[] | undefined | null): string[] {
  if (!images || images.length === 0) return [];
  return images.map((url, i) => publicImageUrl(productId, i, url)).filter(Boolean);
}

/**
 * Reescribe la galería de un producto (tal como viene de la base) a URLs
 * servidas con caché. Se usa en TODAS las respuestas públicas (catálogo, ficha,
 * deseos, rebajas) para que el navegador nunca descargue megabytes en base64.
 */
export function withPublicImages<T extends { id: string; images?: string[] | null }>(p: T): T {
  return { ...p, images: publicImages(p.id, p.images) };
}

/**
 * Reescribe las galerías de una LISTA de entidades (combos, banners, productos)
 * a URLs con caché. Los combos y banners también pueden traer sus fotos como
 * base64; si no se convierten, la portada vuelve a pesar decenas de MB.
 */
export function withPublicImagesAll<T extends { id: string; images?: string[] | null }>(
  list: T[] | null | undefined,
): T[] {
  if (!list || list.length === 0) return [];
  return list.map(withPublicImages);
}

