import { parseJson } from "./json";

/**
 * Prisma devuelve `price`, `costCup` y `compareAtPrice` como Decimal, que al
 * pasar por JSON.stringify se convierten en TEXTO. El panel llamaba
 * `price.toFixed(2)` sobre ese texto y toda la página de administración
 * explotaba con "Algo se trabó al cargar esta página".
 *
 * Todo producto que salga por la API pasa por aquí: siempre números.
 *
 * `costCup` es el precio de COSTO de compra, en CUP (la misma moneda en que se
 * carga el precio de venta) y solo lo ve la administración. Sólo se normaliza
 * si la clave existe en el objeto de entrada: quien la omite (la API pública)
 * no debe recibirla de vuelta, ni siquiera como null.
 */
export function normalizeProduct<
  T extends { price: unknown; costCup?: unknown; compareAtPrice?: unknown },
>(p: T) {
  const out: Record<string, unknown> = {
    ...p,
    price: Number(p.price),
    compareAtPrice:
      p.compareAtPrice === null || p.compareAtPrice === undefined
        ? null
        : Number(p.compareAtPrice),
  };

  if ("costCup" in p) {
    out.costCup =
      p.costCup === null || p.costCup === undefined ? null : Number(p.costCup);
  }

  if ("faqs" in p) {
    out.faqs = normalizeFaqs((p as { faqs?: unknown }).faqs);
  }

  return out as Omit<T, "price" | "compareAtPrice" | "costCup"> & {
    price: number;
    compareAtPrice: number | null;
    costCup?: number | null;
  };
}

/**
 * Prisma devuelve el campo `faqs` (Json) como `JsonValue`: puede ser null, un
 * objeto o basura. La ficha del perfume necesita SIEMPRE un array de
 * `{ q, a }` válidos, así que se filtra acá y no en cada componente.
 */
export function normalizeFaqs(raw: unknown): { q: string; a: string }[] {
  const parsed = parseJson<unknown>(raw, []);
  if (!Array.isArray(parsed)) return [];
  return parsed
    .filter(
      (item): item is { q: string; a: string } =>
        !!item &&
        typeof item === "object" &&
        typeof (item as { q?: unknown }).q === "string" &&
        typeof (item as { a?: unknown }).a === "string",
    )
    .map((item) => ({ q: item.q.trim(), a: item.a.trim() }))
    .filter((item) => item.q.length > 0 && item.a.length > 0);
}

/** Combos: mismo problema con `price` / `compareAtPrice`. */
export function normalizeCombo<
  T extends { price: unknown; compareAtPrice?: unknown },
>(c: T) {
  return {
    ...c,
    price: Number(c.price),
    compareAtPrice:
      c.compareAtPrice === null || c.compareAtPrice === undefined
        ? null
        : Number(c.compareAtPrice),
  };
}
