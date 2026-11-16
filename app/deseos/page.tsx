import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { ProductCard } from "@/components/ProductCard";
import { publicImages } from "@/lib/image-url";
import type { ProductDTO } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function WishlistPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=%2Fdeseos");

  const items = await prisma.wishlistItem.findMany({
    where: { userId: user.id, product: { visible: true } },
    include: { product: true },
    orderBy: { createdAt: "desc" },
  });

  const products: ProductDTO[] = items.map(({ product: p }) => ({
    id: p.id,
    name: p.name,
    brand: p.brand,
    description: p.description,
    category: p.category,
    categoryId: p.categoryId,
    notes: p.notes,
    price: Number(p.price),
    currency: p.currency,
    images: publicImages(p.id, p.images),
    visible: p.visible,
    stock: p.stock,
  }));

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6">
      <h1 className="text-h2">Lista de deseos</h1>
      <p className="mt-2 max-w-lg text-sm leading-relaxed text-muted">
        Guardaste estas piezas para más adelante. La lista es privada: solo vos
        la ves.
      </p>

      {products.length === 0 ? (
        <div className="mt-12 flex flex-col items-start border border-dashed border-line px-6 py-14">
          <p className="font-display text-h3 text-ink">Tu lista está vacía</p>
          <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted">
            Tocá el corazón en cualquier producto del catálogo para guardarlo acá.
          </p>
          <Link
            href="/"
            className="mt-5 rounded-control bg-primary px-5 py-2.5 text-sm font-medium text-on-primary transition-colors hover:bg-primary/90"
          >
            Ver el catálogo
          </Link>
        </div>
      ) : (
        <div className="mt-10 grid grid-cols-1 gap-x-10 gap-y-14 sm:grid-cols-2">
          {products.map((p) => (
            <ProductCard key={p.id} product={p} initialSaved signedIn />
          ))}
        </div>
      )}
    </div>
  );
}
