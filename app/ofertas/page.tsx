import { prisma } from "@/lib/db";
import { ensureReady } from "@/lib/bootstrap";
import { normalizeCombo } from "@/lib/normalize-product";
import { getRefManager, markedPrice } from "@/lib/manager";
import { ComboCard } from "@/components/ComboCard";
import { EmptyState } from "@/components/EmptyState";
import type { ComboDTO } from "@/lib/types";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Ofertas y combos",
};

export default async function OffersPage() {
  await ensureReady();
  const manager = await getRefManager().catch(() => null);

  const rows = await prisma.combo
    .findMany({
      where: { visible: true },
      orderBy: [{ order: "asc" }, { createdAt: "desc" }],
      include: {
        items: {
          include: { product: { select: { id: true, name: true, brand: true, stock: true, visible: true } } },
        },
      },
    })
    .catch(() => []);

  const combos: ComboDTO[] = rows
    .filter((c) => c.items.length > 0 && c.items.every((i) => i.product.visible))
    .map((c) => {
      const available = c.items.reduce((min, item) => {
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

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6">
      <header className="border-b border-line pb-6">
        <h1 className="text-h1 text-ink">Ofertas</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
          Combos de varios productos a un precio especial. Al reservarlos se
          descuenta el stock de cada producto que los compone.
        </p>
      </header>

      {combos.length === 0 ? (
        <div className="mt-10">
          <EmptyState
            title="Todavía no hay ofertas"
            description="Cuando la tienda publique un combo, aparecerá aquí."
            actionLabel="Ver el catálogo"
            actionHref="/catalogo"
          />
        </div>
      ) : (
        <div className="mt-10 grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
          {combos.map((c) => (
            <ComboCard key={c.id} combo={c} />
          ))}
        </div>
      )}
    </div>
  );
}
