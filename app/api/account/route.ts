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
    select: {
      id: true,
      email: true,
      name: true,
      phone: true,
      role: true,
      createdAt: true,
    },
  });
  if (!row) return NextResponse.json({ error: "Cuenta no encontrada" }, { status: 404 });
  return NextResponse.json({ user: row });
}

/**
 * Solo se valida lo que el formulario envía. Nombre y teléfono son opcionales:
 * un cliente puede guardar únicamente su teléfono, o únicamente cambiar la
 * contraseña, sin que el formulario le exija rellenar el resto.
 */
const schema = z.object({
  name: z.string().trim().max(80).optional(),
  phone: z
    .string()
    .trim()
    .regex(/^[+\d][\d\s\-()]{5,24}$/, "Teléfono inválido: incluí el código de país")
    .optional()
    .or(z.literal("")),
  currentPassword: z.string().optional(),
  newPassword: z.string().min(8, "La contraseña nueva debe tener al menos 8 caracteres").optional(),
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

  // Se guarda solo lo que vino en la petición: enviar el teléfono no toca el
  // nombre, y guardar los datos no obliga a cambiar la contraseña.
  const data: {
    name?: string | null;
    phone?: string | null;
    passwordHash?: string;
  } = {};
  if (name !== undefined) data.name = name.trim() || null;
  if (phone !== undefined) data.phone = phone.trim() || null;
  if (passwordHash) data.passwordHash = passwordHash;

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "No hay cambios para guardar." }, { status: 400 });
  }

  const updated = await prisma.user.update({
    where: { id: user.id },
    data,
    select: {
      id: true,
      email: true,
      name: true,
      phone: true,
      role: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ user: updated });
}
