import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { z } from "zod";

export const dynamic = "force-dynamic";

const patchSchema = z.object({
  name: z.string().trim().max(80).nullable().optional(),
  phone: z.string().trim().max(30).nullable().optional(),
  rateType: z.enum(["PERCENT", "FIXED"]).optional(),
  rateValue: z.number().positive().max(1_000_000).optional(),
  active: z.boolean().optional(),
});

/** Detalle de un gestor: sus últimas ventas y sus pagos registrados. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const manager = await prisma.user.findFirst({
    where: { id, role: "GESTOR" },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      managerCode: true,
      managerRateType: true,
      managerRateValue: true,
      managerActive: true,
    },
  });
  if (!manager) return NextResponse.json({ error: "Gestor no encontrado" }, { status: 404 });

  const [sales, payouts] = await Promise.all([
    prisma.reservation.findMany({
      where: { managerId: manager.id },
      orderBy: { createdAt: "desc" },
      take: 30,
      select: {
        id: true,
        code: true,
        status: true,
        total: true,
        currency: true,
        managerCommission: true,
        managerSurcharge: true,
        payoutId: true,
        createdAt: true,
      },
    }),
    prisma.managerPayout.findMany({
      where: { managerId: manager.id },
      orderBy: { createdAt: "desc" },
      select: { id: true, amount: true, currency: true, note: true, createdAt: true },
    }),
  ]);

  return NextResponse.json({
    manager: {
      ...manager,
      rateType: manager.managerRateType === "FIXED" ? "FIXED" : "PERCENT",
      rateValue: Number(manager.managerRateValue ?? 0),
      active: manager.managerActive,
    },
    sales: sales.map((s) => ({
      id: s.id,
      code: s.code,
      status: s.status,
      total: Number(s.total),
      currency: s.currency,
      commission: Number(s.managerCommission),
      surcharge: Number(s.managerSurcharge),
      settled: Boolean(s.payoutId),
      createdAt: s.createdAt.toISOString(),
    })),
    payouts: payouts.map((p) => ({
      id: p.id,
      amount: Number(p.amount),
      currency: p.currency,
      note: p.note,
      createdAt: p.createdAt.toISOString(),
    })),
  });
}

/** Cambia la tasa de ganancia, el nombre o enciende/apaga su enlace. */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const parsed = patchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Datos inválidos" },
      { status: 400 },
    );
  }
  const body = parsed.data;

  const target = await prisma.user.findFirst({
    where: { id, role: "GESTOR" },
    select: { id: true },
  });
  if (!target) return NextResponse.json({ error: "Gestor no encontrado" }, { status: 404 });

  await prisma.user.update({
    where: { id: target.id },
    data: {
      ...(body.name !== undefined ? { name: body.name } : {}),
      ...(body.phone !== undefined ? { phone: body.phone || null } : {}),
      ...(body.rateType ? { managerRateType: body.rateType } : {}),
      ...(body.rateValue !== undefined ? { managerRateValue: body.rateValue } : {}),
      ...(body.active !== undefined ? { managerActive: body.active } : {}),
    },
  });

  return NextResponse.json({ ok: true });
}

/** Quitarle el rol de gestor (su historial de ventas se conserva). */
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const target = await prisma.user.findFirst({
    where: { id, role: "GESTOR" },
    select: { id: true },
  });
  if (!target) return NextResponse.json({ error: "Gestor no encontrado" }, { status: 404 });

  await prisma.user.update({
    where: { id: target.id },
    data: {
      role: "CLIENT",
      managerActive: false,
      managerCode: null,
      managerRateType: null,
      managerRateValue: null,
    },
  });

  return NextResponse.json({ ok: true });
}
