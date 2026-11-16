import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { z } from "zod";

export const dynamic = "force-dynamic";

const patchSchema = z.object({
  title: z.string().min(1).max(120).optional(),
  platform: z.enum(["FACEBOOK", "INSTAGRAM", "WHATSAPP", "TWITTER"]).optional(),
  message: z.string().min(1).max(2000).optional(),
  link: z.string().url().max(500).nullable().optional().or(z.literal("")),
  image: z.string().max(1_600_000).nullable().optional(),
  status: z.enum(["DRAFT", "SCHEDULED", "PUBLISHED"]).optional(),
  scheduledAt: z.string().datetime().nullable().optional(),
});

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
  const d = parsed.data;

  const campaign = await prisma.campaign
    .update({
      where: { id: params.id },
      data: {
        ...(d.title !== undefined ? { title: d.title.trim() } : {}),
        ...(d.platform ? { platform: d.platform } : {}),
        ...(d.message !== undefined ? { message: d.message.trim() } : {}),
        ...(d.link !== undefined ? { link: d.link?.trim() || null } : {}),
        ...(d.image !== undefined ? { image: d.image?.trim() || null } : {}),
        ...(d.status ? { status: d.status } : {}),
        ...(d.scheduledAt !== undefined
          ? { scheduledAt: d.scheduledAt ? new Date(d.scheduledAt) : null }
          : {}),
      },
    })
    .catch(() => null);

  if (!campaign) return NextResponse.json({ error: "Campaña no encontrada" }, { status: 404 });
  return NextResponse.json({ campaign });
}

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } },
) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const deleted = await prisma.campaign.delete({ where: { id: params.id } }).catch(() => null);
  if (!deleted) return NextResponse.json({ error: "Campaña no encontrada" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
