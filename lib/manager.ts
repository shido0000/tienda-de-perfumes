import { cookies } from "next/headers";
import { prisma } from "./db";
import { round2 } from "./currency";
import {
  REF_COOKIE,
  REF_COOKIE_MAX_AGE as REF_MAX_AGE_CONST,
} from "./manager-constants";

export { REF_COOKIE };
export const REF_COOKIE_MAX_AGE = REF_MAX_AGE_CONST;

/**
 * Gestores: revendedores con un enlace propio a la tienda.
 *
 * Cuando alguien llega a la tienda por `/r/<codigo>`, guardamos el código en
 * una cookie (`mm_ref`). Mientras esa cookie exista, TODOS los precios que ve
 * ese visitante llevan el recargo del gestor (un % sobre el precio real o una
 * cantidad fija por unidad). El recargo es la ganancia del gestor.
 *
 * Esa ganancia se copia a la reserva en el momento de la venta, junto con la
 * tasa usada: si después el administrador cambia la tasa del gestor, las
 * ventas ya cerradas conservan lo que se les debe.
 */

export type ManagerRateType = "PERCENT" | "FIXED";

export type ManagerInfo = {
  id: string;
  name: string | null;
  email: string;
  code: string;
  rateType: ManagerRateType;
  rateValue: number;
};

type ManagerRow = {
  id: string;
  name: string | null;
  email: string;
  managerCode: string | null;
  managerRateType: string | null;
  managerRateValue: unknown;
  managerActive: boolean;
  role: string;
};

function toManager(row: ManagerRow | null): ManagerInfo | null {
  if (!row || !row.managerCode || !row.managerActive) return null;
  if (row.role !== "GESTOR" && row.role !== "ADMIN") return null;
  const rateType: ManagerRateType = row.managerRateType === "FIXED" ? "FIXED" : "PERCENT";
  const rateValue = Number(row.managerRateValue ?? 0);
  if (!(rateValue > 0)) return null;
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    code: row.managerCode,
    rateType,
    rateValue,
  };
}

const SELECT = {
  id: true,
  name: true,
  email: true,
  managerCode: true,
  managerRateType: true,
  managerRateValue: true,
  managerActive: true,
  role: true,
} as const;

/** Busca un gestor activo por su código de enlace. */
export async function findManagerByCode(code: string | null | undefined): Promise<ManagerInfo | null> {
  const clean = (code ?? "").trim();
  if (!clean) return null;
  const row = await prisma.user
    .findUnique({ where: { managerCode: clean }, select: SELECT })
    .catch(() => null);
  return toManager(row);
}

/** El gestor del visitante actual, según su cookie. null si no vino por un enlace. */
export async function getRefManager(): Promise<ManagerInfo | null> {
  const code = (await cookies()).get(REF_COOKIE)?.value;
  if (!code) return null;
  return findManagerByCode(code);
}

/**
 * Precio que paga el cliente de este gestor.
 * PERCENT → precio * (1 + tasa/100). FIXED → precio + tasa (por unidad).
 */
export function markedPrice(price: number, manager: ManagerInfo | null): number {
  if (!manager || !(price > 0)) return price;
  if (manager.rateType === "FIXED") return round2(price + manager.rateValue);
  return round2(price * (1 + manager.rateValue / 100));
}

/** Recargo (ganancia del gestor) de una unidad a ese precio. */
export function markupOf(price: number, manager: ManagerInfo | null): number {
  if (!manager) return 0;
  return round2(Math.max(0, markedPrice(price, manager) - price));
}

/**
 * Aplica el recargo a cualquier objeto con `price` (y `compareAtPrice`, que
 * también se sube para que la rebaja siga siendo coherente).
 */
export function withManagerPrice<T extends { price: number; compareAtPrice?: number | null }>(
  product: T,
  manager: ManagerInfo | null,
): T {
  if (!manager) return product;
  return {
    ...product,
    price: markedPrice(product.price, manager),
    compareAtPrice:
      product.compareAtPrice === null || product.compareAtPrice === undefined
        ? product.compareAtPrice
        : markedPrice(product.compareAtPrice, manager),
  };
}

/** Código legible y estable para un gestor nuevo (mayúsculas y números). */
export function makeManagerCode(seed: string): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const base = seed
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .slice(0, 5)
    .toUpperCase();
  let out = "";
  for (let i = 0; i < 4; i++) {
    out += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return `${base || "GEST"}${out}`;
}
