import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { z } from "zod";

export const dynamic = "force-dynamic";

/** Todas las reseñas para moderar, con el nombre del producto. */
export async function GET(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const url = new URL(req.url);
  const status = url.searchParams.get("status");

  const reviews = await prisma.review.findMany({
    where: status && status !== "ALL" ? { status } : {},
    orderBy: { createdAt: "desc" },
    include: { product: { select: { name: true } } },
  });

  // Estadísticas para el panel: cuántas hay, cómo están repartidas y qué
  // productos reciben mejores/más opiniones. Se calculan SOLO sobre aprobadas
  // para el promedio público, y sobre todas para el estado de moderación.
  const approved = reviews.filter((r) => r.status === "APPROVED");
  const pending = reviews.filter((r) => r.status === "PENDING").length;
  const rejected = reviews.filter((r) => r.status === "REJECTED").length;
  const average = approved.length
    ? Math.round((approved.reduce((s, r) => s + r.rating, 0) / approved.length) * 10) / 10
    : 0;

  const distribution = [1, 2, 3, 4, 5].map((rating) => ({
    rating,
    count: approved.filter((r) => r.rating === rating).length,
  }));

  const byProduct = new Map<string, { name: string; count: number; sum: number }>();
  for (const r of approved) {
    const entry = byProduct.get(r.productId) ?? {
      name: r.product.name,
      count: 0,
      sum: 0,
    };
    entry.count += 1;
    entry.sum += r.rating;
    byProduct.set(r.productId, entry);
  }
  const topProducts = [...byProduct.entries()]
    .map(([, v]) => ({
      name: v.name,
      count: v.count,
      average: Math.round((v.sum / v.count) * 10) / 10,
    }))
    .sort((a, b) => b.count - a.count || b.average - a.average)
    .slice(0, 5);

  return NextResponse.json({
    reviews: reviews.map((r) => ({
      id: r.id,
      productId: r.productId,
      productName: r.product.name,
      authorName: r.authorName,
      rating: r.rating,
      comment: r.comment,
      status: r.status,
      createdAt: r.createdAt.toISOString(),
    })),
    stats: {
      total: reviews.length,
      approved: approved.length,
      pending,
      rejected,
      average,
      distribution,
      topProducts,
    },
  });
}

const patchSchema = z.object({
  id: z.string().min(1),
  status: z.enum(["PENDING", "APPROVED", "REJECTED"]),
});

export async function PATCH(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const parsed = patchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  }

  await prisma.review.update({
    where: { id: parsed.data.id },
    data: { status: parsed.data.status },
  });

  return NextResponse.json({ ok: true });
}
