import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { z } from "zod";

export const dynamic = "force-dynamic";

const templateSchema = z.object({
  title: z.string().trim().min(1).max(120),
  platform: z.enum(["FACEBOOK", "INSTAGRAM", "WHATSAPP", "TWITTER"]).default("WHATSAPP"),
  message: z.string().trim().min(1).max(4000),
  link: z.string().trim().max(500).nullable().optional(),
});

/** Plantillas de mensaje guardadas para reusar con otro segmento de clientes. */
export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const templates = await prisma.campaignTemplate.findMany({
    orderBy: [{ uses: "desc" }, { createdAt: "desc" }],
  });
  return NextResponse.json({ templates });
}

export async function POST(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const parsed = templateSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "La plantilla necesita un nombre y un texto." },
      { status: 400 },
    );
  }

  const template = await prisma.campaignTemplate.create({
    data: {
      title: parsed.data.title,
      platform: parsed.data.platform,
      message: parsed.data.message,
      link: parsed.data.link?.trim() || null,
    },
  });
  return NextResponse.json({ template }, { status: 201 });
}
