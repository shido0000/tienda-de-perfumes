import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { z } from "zod";

export const dynamic = "force-dynamic";

/** Carritos abandonados en el paso de pago. */
export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const intents = await prisma.checkoutIntent.findMany({
    where: { status: { in: ["OPEN", "CONTACTED"] } },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return NextResponse.json({
    intents: intents.map((i) => ({
      id: i.id,
      name: i.name,
      email: i.email,
      phone: i.phone,
      summary: i.summary,
      itemCount: i.itemCount,
      total: Number(i.total),
      currency: i.currency,
      status: i.status,
      createdAt: i.createdAt.toISOString(),
    })),
  });
}

const patchSchema = z.object({
  id: z.string().min(1),
  status: z.enum(["OPEN", "CONTACTED", "RECOVERED", "DISMISSED"]),
});

export async function PATCH(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const parsed = patchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  }

  await prisma.checkoutIntent.update({
    where: { id: parsed.data.id },
    data: {
      status: parsed.data.status,
      contactedAt: parsed.data.status === "CONTACTED" ? new Date() : undefined,
    },
  });

  return NextResponse.json({ ok: true });
}
