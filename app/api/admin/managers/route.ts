import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { makeManagerCode } from "@/lib/manager";
import { z } from "zod";

export const dynamic = "force-dynamic";

const createSchema = z.object({
  email: z.string().trim().email("Correo inválido"),
  name: z.string().trim().max(80).optional(),
  rateType: z.enum(["PERCENT", "FIXED"]),
  rateValue: z.number().positive("La ganancia debe ser mayor que cero").max(1_000_000),
  /** Contraseña inicial para que el gestor pueda entrar a ver sus ventas. */
  password: z.string().min(6).optional(),
});

/**
 * Lista de gestores con sus métricas.
 *
 * "Ganado" = suma de comisiones de reservas que NO están canceladas.
 * "Pagado"  = suma de los pagos registrados.
 * "Pendiente" = ganado - pagado.
 */
export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const managers = await prisma.user.findMany({
    where: { role: "GESTOR" },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      email: true,
      managerCode: true,
      managerRateType: true,
      managerRateValue: true,
      managerActive: true,
      createdAt: true,
    },
  });

  const stats = await Promise.all(
    managers.map(async (m) => {
      const [sales, paidAgg, lastSale] = await Promise.all([
        prisma.reservation.aggregate({
          where: { managerId: m.id, status: { not: "CANCELLED" } },
          _count: { _all: true },
          _sum: { managerCommission: true, managerSurcharge: true, total: true },
        }),
        prisma.managerPayout.aggregate({
          where: { managerId: m.id },
          _sum: { amount: true },
        }),
        prisma.reservation.findFirst({
          where: { managerId: m.id },
          orderBy: { createdAt: "desc" },
          select: { createdAt: true },
        }),
      ]);

      const earned = Number(sales._sum.managerCommission ?? 0);
      const paid = Number(paidAgg._sum.amount ?? 0);

      return {
        id: m.id,
        name: m.name,
        email: m.email,
        code: m.managerCode,
        rateType: m.managerRateType === "FIXED" ? "FIXED" : "PERCENT",
        rateValue: Number(m.managerRateValue ?? 0),
        active: m.managerActive,
        createdAt: m.createdAt.toISOString(),
        salesCount: sales._count._all,
        salesTotal: Number(sales._sum.total ?? 0),
        surchargeTotal: Number(sales._sum.managerSurcharge ?? 0),
        earned,
        paid,
        pending: Math.round((earned - paid) * 100) / 100,
        lastSaleAt: lastSale?.createdAt.toISOString() ?? null,
      };
    }),
  );

  return NextResponse.json({ managers: stats });
}

/** Da de alta un gestor: crea la cuenta si no existe y activa su enlace. */
export async function POST(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const parsed = createSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Datos inválidos" },
      { status: 400 },
    );
  }
  const { email, name, rateType, rateValue, password } = parsed.data;

  const existing = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
    select: { id: true, managerCode: true, role: true },
  });

  if (existing && existing.role === "ADMIN") {
    return NextResponse.json(
      { error: "Esa cuenta es de administrador y no puede ser gestor." },
      { status: 409 },
    );
  }

  // Código de enlace único.
  let code = makeManagerCode(name || email);
  for (let i = 0; i < 5; i++) {
    const taken = await prisma.user.findUnique({ where: { managerCode: code }, select: { id: true } });
    if (!taken) break;
    code = makeManagerCode(name || email);
  }

  const data = {
    role: "GESTOR",
    managerCode: code,
    managerRateType: rateType,
    managerRateValue: rateValue,
    managerActive: true,
    name: name || undefined,
  };

  let managerId: string;
  if (existing) {
    const updated = await prisma.user.update({ where: { id: existing.id }, data, select: { id: true } });
    managerId = updated.id;
  } else {
    // Sin contraseña, la cuenta existe pero no puede entrar: el admin le pasa
    // el enlace y la tienda le liquida por fuera. Si se da contraseña, el
    // gestor puede entrar a ver sus propias ventas.
    const { hashPassword } = await import("@/lib/auth");
    const hash = password ? await hashPassword(password) : await hashPassword(`tmp-${code}-${Date.now()}`);
    const created = await prisma.user.create({
      data: { email: email.toLowerCase(), passwordHash: hash, ...data },
      select: { id: true },
    });
    managerId = created.id;
  }

  return NextResponse.json({ manager: { id: managerId, code } }, { status: 201 });
}
