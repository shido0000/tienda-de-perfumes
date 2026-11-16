import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { normalizeCombo } from "@/lib/normalize-product";
import { comboSchema } from "@/lib/promo-schema";

export const dynamic = "force-dynamic";

/** Lista de combos para el panel (incluye ocultos). */
export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const combos = await prisma.combo.findMany({
    orderBy: [{ order: "asc" }, { createdAt: "desc" }],
    include: {
      items: {
        include: { product: { select: { id: true, name: true, brand: true, stock: true } } },
      },
    },
  });

  return NextResponse.json({
    combos: combos.map((c) => ({
      ...normalizeCombo(c),
      items: c.items.map((i) => ({
        productId: i.productId,
        quantity: i.quantity,
        name: i.product.name,
        brand: i.product.brand,
        stock: i.product.stock,
      })),
    })),
  });
}

export async function POST(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const parsed = comboSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Datos inválidos" },
      { status: 400 },
    );
  }

  // Productos duplicados dentro del mismo combo romperían la unique
  // (comboId, productId); se agrupan sumando cantidades.
  const merged = new Map<string, number>();
  for (const item of parsed.data.items) {
    merged.set(item.productId, (merged.get(item.productId) ?? 0) + item.quantity);
  }

  const combo = await prisma.combo.create({
    data: {
      title: parsed.data.title,
      description: parsed.data.description,
      image: parsed.data.image ?? null,
      price: parsed.data.price,
      compareAtPrice: parsed.data.compareAtPrice ?? null,
      currency: parsed.data.currency.toUpperCase(),
      visible: parsed.data.visible,
      order: parsed.data.order,
      items: {
        create: [...merged].map(([productId, quantity]) => ({ productId, quantity })),
      },
    },
    include: { items: true },
  });

  return NextResponse.json({ combo: normalizeCombo(combo) }, { status: 201 });
}
