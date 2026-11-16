import Link from "next/link";
import { prisma } from "@/lib/db";
import { ensureReady } from "@/lib/bootstrap";
import { getCurrentUser } from "@/lib/session";
import { ProductCard } from "@/components/ProductCard";
import { EmptyState } from "@/components/EmptyState";
import { publicImages } from "@/lib/image-url";
import type { ProductDTO } from "@/lib/types";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Rebajas",
};

/**
 * REBAJAS: productos con `compareAtPrice` mayor que `price`. El producto se
 * sigue gestionando desde Administración → Productos; para ponerlo en rebaja
 * basta con cargar "Precio anterior" en el formulario.
 */
export default async function SalePage() {
  await ensureReady();
  const user = await getCurrentUser();

  const rows = await prisma.product
    .findMany({
      where: { visible: true, compareAtPrice: { not: null } },
      orderBy: { updatedAt: "desc" },
    })
    .catch(() => []);

  const products: ProductDTO[] = rows
    .filter((p) => p.compareAtPrice !== null && Number(p.compareAtPrice) > Number(p.price))
    .map((p) => ({
      id: p.id,
      name: p.name,
      brand: p.brand,
      description: p.description,
      category: p.category,
      categoryId: p.categoryId,
      notes: p.notes,
      price: Number(p.price),
      compareAtPrice: p.compareAtPrice === null ? null : Number(p.compareAtPrice),
      currency: p.currency,
      images: publicImages(p.id, p.images),
      visible: p.visible,
      stock: p.stock,
    }));

  const wishlistIds = user
    ? await prisma.wishlistItem
        .findMany({ where: { userId: user.id }, select: { productId: true } })
        .then((w) => w.map((x) => x.productId))
        .catch(() => [])
    : [];

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6">
      <header className="border-b border-line pb-6">
        <span className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">
          Precios rebajados
        </span>
        <h1 className="mt-2 text-h1 text-ink">Rebajas</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
          Productos con descuento. El precio anterior aparece tachado junto al
          precio actual; la rebaja rige hasta agotar existencias.
        </p>
      </header>

      {products.length === 0 ? (
        <div className="mt-10">
          <EmptyState
            title="No hay rebajas activas"
            description="Cuando la tienda marque un producto en oferta, aparecerá aquí."
            actionLabel="Ver el catálogo"
            actionHref="/catalogo"
          />
        </div>
      ) : (
        <div className="mt-10 grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((p) => (
            <ProductCard
              key={p.id}
              product={p}
              initialSaved={wishlistIds.includes(p.id)}
              signedIn={Boolean(user)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
