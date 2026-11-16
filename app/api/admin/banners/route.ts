import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { bannerSchema } from "@/lib/promo-schema";

export const dynamic = "force-dynamic";

/** Lista completa de banners para el panel (incluye ocultos y vencidos). */
export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const banners = await prisma.banner.findMany({
    orderBy: [{ order: "asc" }, { createdAt: "desc" }],
  });
  return NextResponse.json({ banners });
}

export async function POST(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const parsed = bannerSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Datos inválidos" },
      { status: 400 },
    );
  }

  const { endsAt, ...rest } = parsed.data;
  const banner = await prisma.banner.create({
    data: {
      ...rest,
      image: rest.image ?? null,
      endsAt: endsAt ? new Date(endsAt) : null,
    },
  });
  return NextResponse.json({ banner }, { status: 201 });
}
