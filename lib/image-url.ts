import { parseJson } from "./json";

export function publicImageUrl(
  productId: string,
  index: number,
  url: string | undefined | null,
): string {
  if (!url) return "";
  if (url.startsWith("data:") || url.startsWith("blob:")) {
    return `/api/img/${encodeURIComponent(productId)}/${index}`;
  }
  return url;
}

export function publicImages(productId: string, images: unknown): string[] {
  const parsed = parseJson<unknown>(images, []);
  if (!Array.isArray(parsed)) return [];
  return parsed
    .map((url, index) => publicImageUrl(productId, index, typeof url === "string" ? url : ""))
    .filter(Boolean);
}

export function withPublicImages<T extends { id: string }>(
  p: T,
): Omit<T, "images"> & { images: string[] } {
  return { ...p, images: publicImages(p.id, (p as { images?: unknown }).images) };
}

export function withPublicImagesAll<T extends { id: string }>(
  list: T[] | null | undefined,
): (Omit<T, "images"> & { images: string[] })[] {
  if (!list || list.length === 0) return [];
  return list.map(withPublicImages);
}
