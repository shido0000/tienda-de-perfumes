import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { z } from "zod";

export const dynamic = "force-dynamic";

const patchSchema = z.object({
  title: z.string().trim().min(1).max(120).optional(),
  platform: z.enum(["FACEBOOK", "INSTAGRAM", "WHATSAPP", "TWITTER"]).optional(),
  message: z.string().trim().min(1).max(4000).optional(),
  link: z.string().trim().max(500).nullable().optional(),
  /** `true` cuando el dueño la copia para usarla: suma un uso. */
  used: z.boolean().optional(),
});

type Params = { params: { id: string } };

export async function PATCH(req: Request, { params }: Params) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const parsed = patchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos." }, { status: 400 });
  }

  const { used, link, ...rest } = parsed.data;
  const data: Record<string, unknown> = { ...rest };
  if (link !== undefined) data.link = link?.trim() || null;

  const exists = await prisma.campaignTemplate.findUnique({ where: { id: params.id } });
  if (!exists) return NextResponse.json({ error: "No encontrada." }, { status: 404 });

  const template = await prisma.campaignTemplate.update({
    where: { id: params.id },
    data: used && Object.keys(data).length === 0 ? { uses: { increment: 1 } } : data,
  });
  return NextResponse.json({ template });
}

export async function DELETE(_req: Request, { params }: Params) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const exists = await prisma.campaignTemplate.findUnique({ where: { id: params.id } });
  if (!exists) return NextResponse.json({ error: "No encontrada." }, { status: 404 });

  await prisma.campaignTemplate.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
