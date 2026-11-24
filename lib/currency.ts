import { parseJson } from "./json";

export type Currency = { code: string; symbol: string; rate: number; label: string };

/**
 * Base monetaria: PESO CUBANO (CUP).
 *
 * `rate` = cuántas unidades de CUP vale 1 unidad de esa moneda. CUP siempre 1.
 * La tienda puede editar estos valores desde Administración → Ajustes.
 */
export const BASE_CURRENCY = "CUP";

export const DEFAULT_CURRENCIES: Currency[] = [
  { code: "CUP", symbol: "$", rate: 1, label: "Peso cubano" },
  { code: "USD", symbol: "US$", rate: 320, label: "Dólar" },
  { code: "EUR", symbol: "€", rate: 345, label: "Euro" },
  { code: "MLC", symbol: "MLC", rate: 270, label: "MLC" },
];

/**
 * Normaliza la lista de monedas que viene de la base (JSON) y garantiza que
 * CUP exista siempre con tasa 1: es la moneda base contra la que se convierte.
 */
export function parseCurrencies(raw: unknown): Currency[] {
  const parsed = parseJson<unknown>(raw, []);
  let list: Currency[] = [];
  if (Array.isArray(parsed)) {
    list = parsed
      .map((c) => {
        const o = c as Partial<Currency>;
        if (!o || typeof o.code !== "string") return null;
        return {
          code: o.code.toUpperCase(),
          symbol: typeof o.symbol === "string" ? o.symbol : o.code,
          rate: Number(o.rate) > 0 ? Number(o.rate) : 1,
          label: typeof o.label === "string" ? o.label : o.code,
        };
      })
      .filter(Boolean) as Currency[];
  }
  if (!list.length) list = DEFAULT_CURRENCIES.map((c) => ({ ...c }));

  const base = list.find((c) => c.code === BASE_CURRENCY);
  if (base) {
    base.rate = 1;
    base.symbol = base.symbol || "$";
  } else {
    list.unshift({ ...DEFAULT_CURRENCIES[0] });
  }
  return list;
}

export function findCurrency(list: Currency[], code: string): Currency {
  return (
    list.find((c) => c.code === code) ??
    list.find((c) => c.code === BASE_CURRENCY) ??
    list[0]
  );
}

/**
 * Convierte un importe entre monedas pasando por la base CUP.
 * `rate` = cuántos CUP vale 1 unidad de esa moneda.
 */
export function convert(
  amount: number,
  from: string,
  to: string,
  currencies: Currency[],
): number {
  if (from === to) return round2(amount);
  const f = findCurrency(currencies, from);
  const t = findCurrency(currencies, to);
  const inBase = amount * f.rate;
  return round2(inBase / t.rate);
}

export function round2(n: number): number {
  const v = Number(n);
  if (!Number.isFinite(v)) return 0;
  return Math.round(v * 100) / 100;
}

/**
 * Agrupa los miles con punto y los decimales con coma — formato de Cuba.
 *
 * Se arma a mano (en vez de `Intl.NumberFormat("es-CU")`) a propósito: el
 * servidor de Node y el navegador no siempre traen los mismos datos de
 * localización, y una diferencia de un carácter rompe la hidratación de React
 * (la página entera cae con "client-side exception"). Esto da el mismo texto
 * en ambos lados, siempre.
 */
function groupNumber(value: number, decimals: 0 | 2): string {
  const negative = value < 0;
  const abs = Math.abs(value);
  const fixed = abs.toFixed(decimals);
  const [intPart, decPart] = fixed.split(".");
  const grouped = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  const body = decPart ? `${grouped},${decPart}` : grouped;
  return negative ? `-${body}` : body;
}

/**
 * Formato de dinero. En CUP no se muestran centavos cuando el importe es
 * entero (el peso cubano casi nunca se usa con centavos); las demás monedas
 * se muestran siempre con dos decimales.
 */
export function formatMoney(amount: number, currency: Currency | string): string {
  const cur =
    typeof currency === "string"
      ? { code: currency, symbol: currency, rate: 1, label: currency }
      : currency;
  const safe = Number.isFinite(Number(amount)) ? Number(amount) : 0;
  const isBase = cur.code === BASE_CURRENCY;
  const wholeNumber = Math.abs(safe - Math.round(safe)) < 0.005;
  const body = groupNumber(safe, isBase && wholeNumber ? 0 : 2);
  return isBase ? `$${body}` : `${cur.symbol} ${body}`;
}
