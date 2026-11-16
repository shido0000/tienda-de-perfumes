import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/auth";
import { setAuthCookie } from "@/lib/auth-cookie";

const schema = z.object({
  email: z.string().email("Ingresá un email válido"),
  password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres"),
  name: z.string().max(80).optional(),
  phone: z
    .string()
    .regex(/^[+\d][\d\s\-()]{5,24}$/, "Teléfono inválido: incluí el código de país")
    .optional()
    .or(z.literal("")),
});

export async function POST(req: Request) {
  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Datos inválidos" },
      { status: 400 },
    );
  }
  const { email, password, name, phone } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json(
      { error: "Ya existe una cuenta con ese email" },
      { status: 409 },
    );
  }

  const user = await prisma.user.create({
    data: {
      email,
      name,
      phone: phone?.trim() || null,
      passwordHash: await hashPassword(password),
    },
    select: { id: true, email: true, name: true, phone: true },
  });

  const res = NextResponse.json({ user }, { status: 201 });
  return setAuthCookie(res, user.id, req);
}
