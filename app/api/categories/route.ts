import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * Categorías del catálogo. Público: la tienda las usa para los filtros y el
 * formulario de producto. El CRUD vive en /api/admin/categories.
 */
export async function GET() {
  const categories = await prisma.category.findMany({
    orderBy: [{ order: "asc" }, { name: "asc" }],
    include: { _count: { select: { products: true } } },
  });
  return NextResponse.json({
    categories: categories.map((c) => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      order: c.order,
      productCount: c._count.products,
    })),
  });
}
