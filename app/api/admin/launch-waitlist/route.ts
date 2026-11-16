import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { z } from "zod";

export const dynamic = "force-dynamic";

/** Lista de espera de lanzamientos, para el panel de administración. */
export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const rows = await prisma.launchWaitlist.findMany({
    where: { status: { in: ["NEW", "NOTIFIED"] } },
    orderBy: { createdAt: "desc" },
    take: 300,
  });

  return NextResponse.json({
    entries: rows.map((r) => ({
      id: r.id,
      name: r.name,
      email: r.email,
      phone: r.phone,
      interest: r.interest,
      status: r.status as "NEW" | "NOTIFIED" | "CLOSED",
      createdAt: r.createdAt.toISOString(),
    })),
  });
}

const patchSchema = z.object({
  id: z.string().min(1),
  status: z.enum(["NEW", "NOTIFIED", "CLOSED"]),
});

export async function PATCH(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const parsed = patchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  }

  await prisma.launchWaitlist.update({
    where: { id: parsed.data.id },
    data: {
      status: parsed.data.status,
      notifiedAt: parsed.data.status === "NOTIFIED" ? new Date() : undefined,
    },
  });

  return NextResponse.json({ ok: true });
}
