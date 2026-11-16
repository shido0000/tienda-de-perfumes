import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * Banners promocionales públicos. Se filtra por página (`placement`) y por
 * fecha de fin; un banner vencido deja de mostrarse solo.
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const placement = searchParams.get("placement"); // HOME | CATALOG

  const now = new Date();
  const banners = await prisma.banner.findMany({
    where: {
      visible: true,
      ...(placement ? { placement: { in: [placement, "BOTH"] } } : {}),
      OR: [{ endsAt: null }, { endsAt: { gt: now } }],
    },
    orderBy: [{ order: "asc" }, { createdAt: "desc" }],
  });

  return NextResponse.json({ banners });
}
