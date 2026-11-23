import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { findManagerByCode } from "@/lib/manager";
import { REF_COOKIE } from "@/lib/manager-constants";
import { getCurrentUser } from "@/lib/session";

export const dynamic = "force-dynamic";

/**
 * Registra que alguien entró a la tienda por el enlace de un gestor.
 *
 * Lo llama un beacon del navegador (ManagerVisitTracker) una vez por sesión de
 * navegación. La cookie mm_ref dice qué gestor; la cookie mm_vid identifica al
 * navegador (anónimo). Se guarda UNA fila por gestor + navegador + día: si la
 * misma persona vuelve a entrar el mismo día solo sube el contador `hits`, así
 * el número de "personas que entraron" no se infla con recargas de página.
 */

const VISITOR_COOKIE = "mm_vid";
const VISITOR_MAX_AGE = 60 * 60 * 24 * 365; // 1 año

function todayKey(): string {
  const d = new Date();
  const pad = (n: number) => (n < 10 ? `0${n}` : String(n));
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function newVisitorId(): string {
  // id anónimo, no adivinable
  return `v_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
}

export async function POST() {
  const jar = await cookies();
  const code = jar.get(REF_COOKIE)?.value;
  const manager = await findManagerByCode(code).catch(() => null);
  if (!manager) return NextResponse.json({ ok: false, reason: "no_manager" });

  let visitorId = jar.get(VISITOR_COOKIE)?.value;
  const shouldSetVisitor = !visitorId;
  if (!visitorId) visitorId = newVisitorId();

  const user = await getCurrentUser().catch(() => null);

  await prisma.managerVisit
    .upsert({
      where: {
        managerId_visitorId_day: { managerId: manager.id, visitorId, day: todayKey() },
      },
      create: {
        managerId: manager.id,
        visitorId,
        day: todayKey(),
        userId: user?.id ?? null,
      },
      update: {
        hits: { increment: 1 },
        lastSeenAt: new Date(),
        ...(user?.id ? { userId: user.id } : {}),
      },
    })
    .catch(() => null);

  const res = NextResponse.json({ ok: true });
  if (shouldSetVisitor) {
    res.cookies.set(VISITOR_COOKIE, visitorId!, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: VISITOR_MAX_AGE,
    });
  }
  return res;
}
