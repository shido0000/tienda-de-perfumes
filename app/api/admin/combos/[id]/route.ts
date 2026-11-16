import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { normalizeCombo } from "@/lib/normalize-product";
import { comboSchema } from "@/lib/promo-schema";

export const dynamic = "force-dynamic";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const parsed = comboSchema.partial().safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Datos inválidos" },
      { status: 400 },
    );
  }

  const { items, ...rest } = parsed.data;

  const merged = new Map<string, number>();
  for (const item of items ?? []) {
    merged.set(item.productId, (merged.get(item.productId) ?? 0) + item.quantity);
  }

  const combo = await prisma.combo
    .update({
      where: { id: params.id },
      data: {
        ...rest,
        ...(rest.currency ? { currency: rest.currency.toUpperCase() } : {}),
        ...(items
          ? {
              items: {
                deleteMany: {},
                create: [...merged].map(([productId, quantity]) => ({ productId, quantity })),
              },
            }
          : {}),
      },
      include: { items: true },
    })
    .catch(() => null);

  if (!combo) return NextResponse.json({ error: "Oferta no encontrada" }, { status: 404 });
  return NextResponse.json({ combo: normalizeCombo(combo) });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const deleted = await prisma.combo.delete({ where: { id: params.id } }).catch(() => null);
  if (!deleted) return NextResponse.json({ error: "Oferta no encontrada" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
