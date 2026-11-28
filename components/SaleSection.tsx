import Link from "next/link";
import { prisma } from "@/lib/db";
import { publicImages } from "@/lib/image-url";
import { DEFAULT_SITE_TEXTS, type SiteTexts } from "@/lib/site-texts";
import { ProductCard } from "./ProductCard";
import { getRefManager, withManagerPrice } from "@/lib/manager";
import type { ProductDTO } from "@/lib/types";

/**
 * Sección "Rebajas" de la portada: productos con precio anterior cargado
 * (compareAtPrice > price). Se lee en el servidor para que salga en el HTML.
 */
export async function SaleSection({
  wishlistIds = [],
  signedIn = false,
  texts,
}: {
  wishlistIds?: string[];
  signedIn?: boolean;
  texts?: Partial<SiteTexts>;
}) {
  let products: ProductDTO[] = [];
  const manager = await getRefManager().catch(() => null);
  try {
    const rows = await prisma.product.findMany({
      where: { visible: true, compareAtPrice: { not: null } },
      orderBy: { updatedAt: "desc" },
      take: 6,
      select: {
        id: true,
        name: true,
        brand: true,
        description: true,
        category: true,
        categoryId: true,
        notes: true,
        gender: true,
        price: true,
        compareAtPrice: true,
        currency: true,
        images: true,
        visible: true,
        stock: true,
      },
    });
    products = rows
      .filter(
        (p) => p.compareAtPrice !== null && Number(p.compareAtPrice) > Number(p.price)
      )
      .map<ProductDTO>((p) => ({
        id: p.id,
        name: p.name,
        brand: p.brand,
        description: p.description,
        category: p.category,
        categoryId: p.categoryId,
        notes: p.notes,
        gender: p.gender,
        price: Number(p.price),
        compareAtPrice: p.compareAtPrice === null ? null : Number(p.compareAtPrice),
        currency: p.currency,
        images: publicImages(p.id, p.images).slice(0, 1),
        visible: p.visible,
        stock: p.stock,
      }))
      .map((p) => withManagerPrice(p, manager));
  } catch (error) {
    console.error("[rebajas] no se pudieron leer:", (error as Error).message);
    return null;
  }

  if (products.length === 0) return null;

  const t = { ...DEFAULT_SITE_TEXTS, ...(texts ?? {}) };

  return (
    <section className="mx-auto mt-24 w-full max-w-6xl px-4 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-line pb-4">
        <div>
          <h2 className="text-h2 text-ink">{t.saleTitle}</h2>
          <p className="mt-1 max-w-xl text-sm text-muted">{t.saleIntro}</p>
        </div>
        <Link
          href="/rebajas"
          className="text-sm text-primary underline decoration-primary/40 underline-offset-4 hover:decoration-primary"
        >
          Ver todas
        </Link>
      </div>

      <div className="mt-8 grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
        {products.map((p) => (
          <ProductCard
            key={p.id}
            product={p}
            initialSaved={wishlistIds.includes(p.id)}
            signedIn={signedIn}
          />
        ))}
      </div>
    </section>
  );
}
