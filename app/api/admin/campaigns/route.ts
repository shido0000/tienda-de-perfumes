import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { z } from "zod";

export const dynamic = "force-dynamic";

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const campaigns = await prisma.campaign.findMany({ orderBy: { createdAt: "desc" } });
  return NextResponse.json({ campaigns });
}

const schema = z.object({
  title: z.string().min(1, "Ponele un título a la campaña").max(120),
  platform: z.enum(["FACEBOOK", "INSTAGRAM", "WHATSAPP", "TWITTER"]),
  message: z.string().min(1, "Escribí el texto de la publicación").max(2000),
  link: z.string().url("El enlace no es válido").max(500).optional().or(z.literal("")),
  image: z.string().max(1_600_000).nullable().optional(),
  status: z.enum(["DRAFT", "SCHEDULED", "PUBLISHED"]).default("DRAFT"),
  scheduledAt: z.string().datetime().optional().nullable(),
});

export async function POST(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Datos inválidos" },
      { status: 400 },
    );
  }
  const d = parsed.data;
  const campaign = await prisma.campaign.create({
    data: {
      title: d.title.trim(),
      platform: d.platform,
      message: d.message.trim(),
      link: d.link?.trim() || null,
      image: d.image?.trim() || null,
      status: d.status,
      scheduledAt: d.scheduledAt ? new Date(d.scheduledAt) : null,
    },
  });
  return NextResponse.json({ campaign }, { status: 201 });
}
