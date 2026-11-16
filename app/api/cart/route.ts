import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { z } from "zod";

export const dynamic = "force-dynamic";

/** Tope de unidades por línea: el stock disponible, o 20 si no se controla. */
function capFor(stock: number | null | undefined): number {
  return typeof stock === "number" ? Math.max(0, Math.min(20, stock)) : 20;
}

/** The signed-in user's persisted cart. Guests keep theirs in localStorage. */
export async function GET() {
  const user = await requireUser();
  if (!user) return NextResponse.json({ items: [] });

  const items = await prisma.cartItem.findMany({
    where: { userId: user.id },
    include: { product: true },
    orderBy: { createdAt: "asc" },
  });

  // Drop rows whose product was deleted or hidden by the admin.
  const live = items.filter((i) => i.product && i.product.visible);
  return NextResponse.json({
    items: live.map((i) => ({
      productId: i.productId,
      quantity: Math.min(i.quantity, capFor(i.product.stock)),
      product: { ...i.product, costUsd: undefined },
    })),
  });
}

const addSchema = z.object({
  productId: z.string().min(1),
  quantity: z.number().int().min(1).max(20).default(1),
});

export async function POST(req: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const parsed = addSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  }

  const product = await prisma.product.findFirst({
    where: { id: parsed.data.productId, visible: true },
    select: { id: true, stock: true, name: true },
  });
  if (!product) {
    return NextResponse.json({ error: "Producto no disponible" }, { status: 404 });
  }

  const cap = capFor(product.stock);
  if (product.stock !== null && product.stock <= 0) {
    return NextResponse.json(
      { error: `${product.name} está agotado.` },
      { status: 409 },
    );
  }

  const existing = await prisma.cartItem.findUnique({
    where: { userId_productId: { userId: user.id, productId: product.id } },
  });
  const quantity = Math.min(cap, (existing?.quantity ?? 0) + parsed.data.quantity);

  await prisma.cartItem.upsert({
    where: { userId_productId: { userId: user.id, productId: product.id } },
    update: { quantity },
    create: { userId: user.id, productId: product.id, quantity },
  });
  return NextResponse.json({ ok: true, quantity, cap });
}

const patchSchema = z.object({
  productId: z.string().min(1),
  quantity: z.number().int().min(0).max(20),
});

export async function PATCH(req: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const parsed = patchSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  }
  const { productId, quantity } = parsed.data;

  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { stock: true },
  });
  const cap = capFor(product?.stock);
  const q = Math.min(cap, quantity);

  if (q === 0) {
    await prisma.cartItem.deleteMany({ where: { userId: user.id, productId } });
  } else {
    await prisma.cartItem.updateMany({
      where: { userId: user.id, productId },
      data: { quantity: q },
    });
  }
  return NextResponse.json({ ok: true, quantity: q, cap });
}

export async function DELETE(req: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  await prisma.cartItem.deleteMany({ where: { userId: user.id } });
  return NextResponse.json({ ok: true });
}
