import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { hashPassword, verifyPassword } from "@/lib/auth";
import { z } from "zod";

export const dynamic = "force-dynamic";

/** Datos de la cuenta del propio cliente. Nunca de otra persona. */
export async function GET() {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const row = await prisma.user.findUnique({
    where: { id: user.id },
    select: { id: true, email: true, name: true, phone: true, role: true, createdAt: true },
  });
  if (!row) return NextResponse.json({ error: "Cuenta no encontrada" }, { status: 404 });
  return NextResponse.json({ user: row });
}

const schema = z.object({
  name: z.string().min(1, "Escribí tu nombre").max(80),
  phone: z
    .string()
    .regex(/^[+\d][\d\s\-()]{5,24}$/, "Teléfono inválido: incluí el código de país")
    .optional()
    .or(z.literal("")),
  currentPassword: z.string().optional(),
  newPassword: z.string().min(6, "La contraseña nueva debe tener al menos 6 caracteres").optional(),
});

export async function PATCH(req: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Datos inválidos" },
      { status: 400 },
    );
  }
  const { name, phone, currentPassword, newPassword } = parsed.data;

  const row = await prisma.user.findUnique({ where: { id: user.id } });
  if (!row) return NextResponse.json({ error: "Cuenta no encontrada" }, { status: 404 });

  let passwordHash: string | undefined;
  if (newPassword) {
    if (!currentPassword) {
      return NextResponse.json(
        { error: "Escribí tu contraseña actual para cambiarla." },
        { status: 400 },
      );
    }
    const ok = await verifyPassword(currentPassword, row.passwordHash);
    if (!ok) {
      return NextResponse.json({ error: "La contraseña actual no es correcta." }, { status: 403 });
    }
    passwordHash = await hashPassword(newPassword);
  }

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: {
      name: name.trim(),
      phone: phone?.trim() || null,
      ...(passwordHash ? { passwordHash } : {}),
    },
    select: { id: true, email: true, name: true, phone: true, role: true, createdAt: true },
  });

  return NextResponse.json({ user: updated });
}
