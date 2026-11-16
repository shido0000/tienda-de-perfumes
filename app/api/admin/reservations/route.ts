import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { z } from "zod";

export const dynamic = "force-dynamic";

const STATUSES = [
  "PENDING",
  "CONFIRMED",
  "PREPARING",
  "SHIPPED",
  "DELIVERED",
  "CANCELLED",
] as const;

export async function GET(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const status = new URL(req.url).searchParams.get("status");
  const reservations = await prisma.reservation.findMany({
    where: status && status !== "all" ? { status } : {},
    include: {
      items: true,
      user: { select: { email: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ reservations });
}

const patchSchema = z.object({
  status: z.enum(STATUSES),
});

export async function PATCH(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Falta id" }, { status: 400 });

  const parsed = patchSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Estado inválido" }, { status: 400 });
  }

  const reservation = await prisma.reservation
    .update({ where: { id }, data: { status: parsed.data.status } })
    .catch(() => null);
  if (!reservation) {
    return NextResponse.json({ error: "Reserva no encontrada" }, { status: 404 });
  }
  return NextResponse.json({ reservation });
}
