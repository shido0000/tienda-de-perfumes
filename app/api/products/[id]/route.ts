import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { normalizeProduct } from "@/lib/normalize-product";
import { withPublicImages } from "@/lib/image-url";
import { handleRestock } from "@/lib/restock";
import { getRefManager, withManagerPrice } from "@/lib/manager";
import { z } from "zod";

export const dynamic = "force-dynamic";

const patchSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  brand: z.string().min(1).max(80).optional(),
  description: z.string().min(1).max(2000).optional(),
  category: z.string().min(1).max(80).optional(),
  categoryId: z.string().nullable().optional(),
  notes: z.string().max(300).nullable().optional(),
  price: z.number().positive().max(100_000_000).optional(),
  compareAtPrice: z.number().positive().max(100_000_000).nullable().optional(),
  currency: z.string().min(2).max(6).optional(),
  costUsd: z.number().min(0).max(100_000_000).nullable().optional(),
  images: z.array(z.string().min(1)).max(6).optional(),
  visible: z.boolean().optional(),
  stock: z.number().int().min(0).nullable().optional(),
  duration: z.string().max(40).nullable().optional(),
  occasion: z.enum(["DIA", "NOCHE", "AMBAS"]).nullable().optional(),
  gender: z.enum(["HOMBRE", "MUJER", "UNISEX"]).optional(),
  faqs: z
    .array(
      z.object({
        q: z.string().trim().min(1).max(200),
        a: z.string().trim().min(1).max(2000),
      }),
    )
    .max(15)
    .optional(),
});

export async function GET(
  _req: Request,
  { params }: { params: { id: string } },
) {
  const product = await prisma.product.findFirst({
    where: { id: params.id, visible: true },
  });
  if (!product) {
    return NextResponse.json({ error: "Producto no encontrado" }, { status: 404 });
  }
  const { costUsd: _cost, ...rest } = product;
  // Números, no Decimal serializado: las tarjetas hacen aritmética con price.
  // Fotos por /api/img (con caché) en vez de base64 inline.
  // Con enlace de gestor, el precio del detalle también lleva su recargo.
  const manager = await getRefManager().catch(() => null);
  return NextResponse.json({
    product: withManagerPrice(normalizeProduct(withPublicImages(rest)), manager),
  });
}

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } },
) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const parsed = patchSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Datos inválidos" },
      { status: 400 },
    );
  }

  // Una categoría vacía llega como "" desde el formulario: se guarda como null
  // para no romper la relación con Category.
  const data = {
    ...parsed.data,
    ...(parsed.data.categoryId === "" ? { categoryId: null } : {}),
    ...(parsed.data.currency ? { currency: parsed.data.currency.toUpperCase() } : {}),
  };

  const before = await prisma.product.findUnique({
    where: { id: params.id },
    select: { stock: true, name: true },
  });

  const product = await prisma.product
    .update({ where: { id: params.id }, data })
    .catch(() => null);

  if (!product) {
    return NextResponse.json({ error: "Producto no encontrado" }, { status: 404 });
  }

  // Si se repuso un perfume agotado, los avisos "volvió este perfume" se
  // disparan solos: se marcan como avisados y el panel los muestra listos.
  const restock = await handleRestock({
    productId: product.id,
    productName: product.name,
    previousStock: before?.stock,
    nextStock: product.stock,
  });

  // Decimal -> number: el panel formatea el precio con .toFixed().
  return NextResponse.json({ product: normalizeProduct(product), restock });
}

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } },
) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const deleted = await prisma.product.delete({ where: { id: params.id } }).catch(() => null);
  if (!deleted) {
    return NextResponse.json({ error: "Producto no encontrado" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
