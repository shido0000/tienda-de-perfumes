import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { verifyPassword } from "@/lib/auth";
import { setAuthCookie } from "@/lib/auth-cookie";
import { clientIp, rateLimit, tooManyRequests } from "@/lib/rate-limit";

const schema = z.object({
  email: z.string().email("Ingresá un email válido"),
  password: z.string().min(1, "Ingresá tu contraseña"),
});

/** Máximo de intentos fallidos por IP + email dentro de la ventana. */
const MAX_ATTEMPTS = 8;
const WINDOW_MS = 5 * 60_000;

export async function POST(req: Request) {
  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  }
  const { email, password } = parsed.data;

  // Fuerza bruta: se limita por IP y por email juntos, así una IP no puede
  // probar miles de contraseñas ni atacar muchas cuentas a la vez.
  const key = `login:${clientIp(req)}:${email.toLowerCase()}`;
  const gate = rateLimit(key, MAX_ATTEMPTS, WINDOW_MS);
  if (!gate.ok) return tooManyRequests(gate.retryAfterSeconds);

  const user = await prisma.user.findUnique({ where: { email } });
  // Same message whether the email is unknown or the password is wrong —
  // telling them apart lets anyone enumerate who has an account.
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    return NextResponse.json(
      { error: "Email o contraseña incorrectos" },
      { status: 401 },
    );
  }

  const res = NextResponse.json({
    user: { id: user.id, email: user.email, name: user.name, role: user.role },
  });
  return setAuthCookie(res, user.id, req);
}
