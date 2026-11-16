import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { z } from "zod";

export const dynamic = "force-dynamic";

/** Lista de espera de stock, agrupada por producto. */
export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const alerts = await prisma.stockAlert.findMany({
    where: { status: { in: ["NEW", "NOTIFIED"] } },
    orderBy: { createdAt: "desc" },
    include: { product: { select: { id: true, name: true, stock: true, brand: true } } },
  });

  return NextResponse.json({
    alerts: alerts.map((a) => ({
      id: a.id,
      productId: a.productId,
      productName: a.product.name,
      productStock: a.product.stock,
      brand: a.product.brand,
      name: a.name,
      email: a.email,
      phone: a.phone,
      status: a.status,
      createdAt: a.createdAt.toISOString(),
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

  await prisma.stockAlert.update({
    where: { id: parsed.data.id },
    data: {
      status: parsed.data.status,
      notifiedAt: parsed.data.status === "NOTIFIED" ? new Date() : undefined,
    },
  });

  return NextResponse.json({ ok: true });
}
