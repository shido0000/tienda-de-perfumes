import Link from "next/link";
import { prisma } from "@/lib/db";
import { normalizeCombo } from "@/lib/normalize-product";
import { DEFAULT_SITE_TEXTS, type SiteTexts } from "@/lib/site-texts";
import { ComboCard } from "./ComboCard";
import { getRefManager, markedPrice } from "@/lib/manager";
import type { ComboDTO } from "@/lib/types";

/**
 * Sección "Ofertas" de la portada: combos de varios productos a un precio
 * especial. Se lee del servidor para que aparezca en el HTML (Google lo ve).
 */
export async function OffersSection({ texts }: { texts?: Partial<SiteTexts> } = {}) {
  let combos: ComboDTO[] = [];
  const manager = await getRefManager().catch(() => null);
  try {
    const rows = await prisma.combo.findMany({
      where: { visible: true },
      orderBy: [{ order: "asc" }, { createdAt: "desc" }],
      take: 6,
      include: {
        items: {
          include: { product: { select: { id: true, name: true, brand: true, stock: true, visible: true } } },
        },
      },
    });
    combos = rows
      .filter((c) => c.items.length > 0 && c.items.every((i) => i.product.visible))
      .map((c) => {
        const available = c.items.reduce((min, item) => {
          if (item.product.stock === null) return min;
          const possible = Math.floor(item.product.stock / Math.max(1, item.quantity));
          return Math.min(min, possible);
        }, Number.POSITIVE_INFINITY);
        return {
          ...normalizeCombo(c),
          // Con enlace de gestor, el combo también se muestra con su recargo.
          price: markedPrice(Number(normalizeCombo(c).price), manager),
          items: c.items.map((i) => ({
            productId: i.productId,
            name: i.product.name,
            brand: i.product.brand,
            quantity: i.quantity,
          })),
          available: Number.isFinite(available) ? available : null,
        } as ComboDTO;
      });
  } catch (error) {
    console.error("[ofertas] no se pudieron leer:", (error as Error).message);
    return null;
  }

  if (combos.length === 0) return null;

  const t = { ...DEFAULT_SITE_TEXTS, ...(texts ?? {}) };

  return (
    <section className="mx-auto mt-24 w-full max-w-6xl px-4 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-line pb-4">
        <div>
          <h2 className="text-h2 text-ink">{t.offerTitle}</h2>
          <p className="mt-1 max-w-xl text-sm text-muted">{t.offerSubtitle}</p>
        </div>
        <Link
          href="/ofertas"
          className="text-sm text-primary underline decoration-primary/40 underline-offset-4 hover:decoration-primary"
        >
          {t.offerLink}
        </Link>
      </div>

      <div className="mt-8 grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
        {combos.map((c) => (
          <ComboCard key={c.id} combo={c} />
        ))}
      </div>
    </section>
  );
}
