import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { z } from "zod";

export const dynamic = "force-dynamic";

/** Reseñas aprobadas de un producto (las únicas que se muestran en la web). */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const productId = url.searchParams.get("productId");

  const reviews = await prisma.review.findMany({
    where: { status: "APPROVED", ...(productId ? { productId } : {}) },
    orderBy: { createdAt: "desc" },
    take: 50,
    include: { product: { select: { name: true } } },
  });

  const count = reviews.length;
  const average = count
    ? Math.round((reviews.reduce((s, r) => s + r.rating, 0) / count) * 10) / 10
    : 0;

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
    average,
    count,
  });
}

const schema = z.object({
  productId: z.string().min(1),
  rating: z.number().int().min(1).max(5),
  comment: z.string().min(10).max(1200),
});

/** Un cliente opina SOLO sobre un perfume que reservó de verdad. */
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { error: "Iniciá sesión para dejar tu opinión." },
      { status: 401 },
    );
  }

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Elegí una puntuación y escribí al menos 10 caracteres." },
      { status: 400 },
    );
  }
  const { productId, rating, comment } = parsed.data;

  const reserved = await prisma.reservationItem.findFirst({
    where: {
      productId,
      reservation: { userId: user.id, status: { not: "CANCELLED" } },
    },
    select: { id: true },
  });
  if (!reserved) {
    return NextResponse.json(
      { error: "Podés opinar cuando hayas reservado este perfume." },
      { status: 403 },
    );
  }

  const authorName = (user.name?.trim() || user.email.split("@")[0]).split(/\s+/)[0];

  const review = await prisma.review.upsert({
    where: { productId_userId: { productId, userId: user.id } },
    create: {
      productId,
      userId: user.id,
      authorName,
      rating,
      comment: comment.trim(),
      status: "PENDING",
    },
    update: { rating, comment: comment.trim(), status: "PENDING", authorName },
  });

  return NextResponse.json({
    ok: true,
    review: { id: review.id, status: review.status },
  });
}
