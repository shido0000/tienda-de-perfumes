import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { normalizeCombo } from "@/lib/normalize-product";
import { getRefManager, markedPrice } from "@/lib/manager";

export const dynamic = "force-dynamic";

/**
 * Ofertas públicas (combos). Solo se devuelven los visibles y con al menos un
 * producto; cada combo trae sus componentes para que la tarjeta pueda decir
 * "incluye 2× Ámbar Nº7" y para comprobar el stock disponible.
 */
export async function GET() {
  const manager = await getRefManager().catch(() => null);
  const combos = await prisma.combo.findMany({
    where: { visible: true },
    orderBy: [{ order: "asc" }, { createdAt: "desc" }],
    include: {
      items: {
        include: {
          product: {
            select: { id: true, name: true, brand: true, stock: true, visible: true },
          },
        },
      },
    },
  });

  const payload = combos
    .filter((c) => c.items.length > 0)
    .map((c) => {
      // Unidades que se pueden vender: el mínimo entre los componentes.
      const available = c.items.reduce((min, item) => {
        if (!item.product.visible) return 0;
        if (item.product.stock === null) return min;
        const possible = Math.floor(item.product.stock / Math.max(1, item.quantity));
        return Math.min(min, possible);
      }, Number.POSITIVE_INFINITY);

      return {
        ...normalizeCombo(c),
        price: markedPrice(Number(normalizeCombo(c).price), manager),
        items: c.items.map((i) => ({
          productId: i.productId,
          name: i.product.name,
          brand: i.product.brand,
          quantity: i.quantity,
        })),
        available: Number.isFinite(available) ? available : null,
      };
    });

  return NextResponse.json({ combos: payload });
}
