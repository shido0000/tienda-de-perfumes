import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { z } from "zod";

export const dynamic = "force-dynamic";

/** Wishlist is per authenticated account — guests get an empty list. */
export async function GET() {
  const user = await requireUser();
  if (!user) return NextResponse.json({ items: [], productIds: [] });

  const items = await prisma.wishlistItem.findMany({
    where: { userId: user.id, product: { visible: true } },
    include: { product: true },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({
    items: items.map((i) => ({ id: i.id, product: i.product })),
    productIds: items.map((i) => i.productId),
  });
}

const schema = z.object({ productId: z.string().min(1) });

/** Toggles: adding an existing favourite removes it. */
export async function POST(req: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  }
  const { productId } = parsed.data;

  const existing = await prisma.wishlistItem.findUnique({
    where: { userId_productId: { userId: user.id, productId } },
  });

  if (existing) {
    await prisma.wishlistItem.delete({ where: { id: existing.id } });
    return NextResponse.json({ saved: false });
  }

  const product = await prisma.product.findFirst({
    where: { id: productId, visible: true },
    select: { id: true },
  });
  if (!product) {
    return NextResponse.json({ error: "Producto no disponible" }, { status: 404 });
  }

  await prisma.wishlistItem.create({ data: { userId: user.id, productId } });
  return NextResponse.json({ saved: true });
}

export async function DELETE(req: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const url = new URL(req.url);
  const productId = url.searchParams.get("productId");
  if (productId) {
    await prisma.wishlistItem.deleteMany({ where: { userId: user.id, productId } });
  }
  return NextResponse.json({ ok: true });
}
