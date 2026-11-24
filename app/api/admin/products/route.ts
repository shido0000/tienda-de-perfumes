import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { normalizeProduct } from "@/lib/normalize-product";
import { publicImages } from "@/lib/image-url";

export const dynamic = "force-dynamic";

/**
 * Lista de productos para la ADMINISTRACIÓN.
 *
 * Incluye los ocultos (la API pública no) y garantiza que cada perfume llegue
 * con `duration`, `occasion` y `faqs` ya normalizados: si el panel recibe una
 * fila sin esos campos, el editor de preguntas frecuentes se abre SIEMPRE
 * vacío y guardar lo borra. El `select` explícito evita que un cambio futuro
 * en el schema (o un `omit`) deje esos campos afuera sin que nadie lo note.
 */
export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const products = await prisma.product.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      brand: true,
      description: true,
      category: true,
      categoryId: true,
      notes: true,
      price: true,
      compareAtPrice: true,
      currency: true,
      costCup: true,
      images: true,
      visible: true,
      stock: true,
      duration: true,
      occasion: true,
      faqs: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return NextResponse.json({
    products: products.map((p) =>
      normalizeProduct({
        ...p,
        images: publicImages(p.id, p.images),
        duration: p.duration ?? null,
        occasion: p.occasion ?? null,
        faqs: p.faqs,
      }),
    ),
  });
}
