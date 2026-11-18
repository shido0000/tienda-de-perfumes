import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { z } from "zod";

export const dynamic = "force-dynamic";

/** Todos los usuarios de la tienda, con su actividad. Solo administración. */
export async function GET(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") ?? "").trim();
  const role = (searchParams.get("role") ?? "").trim();

  const users = await prisma.user.findMany({
    where: {
      ...(role && role !== "all" ? { role } : {}),
      ...(q
        ? {
            OR: [
              { email: { contains: q, mode: "insensitive" } },
              { name: { contains: q, mode: "insensitive" } },
              { phone: { contains: q } },
            ],
          }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      email: true,
      name: true,
      phone: true,
      role: true,
      createdAt: true,
      reservations: { select: { total: true, currency: true } },
    },
  });

  return NextResponse.json({
    users: users.map((u) => ({
      id: u.id,
      email: u.email,
      name: u.name,
      phone: u.phone,
      role: u.role,
      createdAt: u.createdAt.toISOString(),
      reservationCount: u.reservations.length,
      totalSpent: u.reservations.reduce((s, r) => s + Number(r.total), 0),
    })),
  });
}

const schema = z.object({
  id: z.string().min(1),
  role: z.enum(["CLIENT", "ADMIN"]),
});

/** Otorga o quita el acceso a la administración. */
export async function PATCH(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  }
  const { id, role } = parsed.data;

  const target = await prisma.user.findUnique({
    where: { id },
    select: { id: true, role: true, managerCode: true },
  });
  if (!target) return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });

  // Nunca dejar la tienda sin administradores.
  if (target.role === "ADMIN" && role === "CLIENT") {
    const admins = await prisma.user.count({ where: { role: "ADMIN" } });
    if (admins <= 1) {
      return NextResponse.json(
        { error: "Debe quedar al menos un administrador. Nombrá otro antes de quitarte el acceso." },
        { status: 409 },
      );
    }
  }

  const user = await prisma.user.update({
    where: { id },
    data: {
      role,
      // Al convertir un gestor en cliente se apaga su enlace: sus precios
      // dejan de llevar recargo y de generar comisiones.
      ...(target.managerCode && role === "CLIENT" ? { managerActive: false } : {}),
    },
    select: {
      id: true,
      email: true,
      name: true,
      phone: true,
      role: true,
      createdAt: true,
    },
  });
  return NextResponse.json({ user });
}
