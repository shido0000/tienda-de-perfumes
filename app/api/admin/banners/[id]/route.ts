import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { bannerSchema } from "@/lib/promo-schema";

export const dynamic = "force-dynamic";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const parsed = bannerSchema.partial().safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Datos inválidos" },
      { status: 400 },
    );
  }

  const { endsAt, ...rest } = parsed.data;
  const banner = await prisma.banner
    .update({
      where: { id },
      data: {
        ...rest,
        ...(endsAt !== undefined ? { endsAt: endsAt ? new Date(endsAt) : null } : {}),
      },
    })
    .catch(() => null);

  if (!banner) return NextResponse.json({ error: "Banner no encontrado" }, { status: 404 });
  return NextResponse.json({ banner });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const deleted = await prisma.banner.delete({ where: { id } }).catch(() => null);
  if (!deleted) return NextResponse.json({ error: "Banner no encontrado" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
