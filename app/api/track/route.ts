import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getRefManager, findManagerByCode } from "@/lib/manager";
import { REF_COOKIE } from "@/lib/manager-constants";
import { getCurrentUser } from "@/lib/session";
import { readVisitor, todayKey, visitorCookieOptions } from "@/lib/visitor";
import { rateLimit } from "@/lib/rate-limit";
import { z } from "zod";

export const dynamic = "force-dynamic";

/**
 * Resuelve el gestor de esta visita.
 *
 * Primero por la cookie que lee el resto de la tienda; si por algún motivo la
 * cookie no llegara a este endpoint, se mira el encabezado de la petición y,
 * como último recurso, un `?ref=` en la URL. Así el canal (gestor o directo)
 * nunca se pierde al registrar una visita o un agregado al carrito.
 */
async function resolveManager(req: NextRequest) {
  const fromCookie = await getRefManager().catch(() => null);
  if (fromCookie) return fromCookie;

  const header = req.headers.get("cookie") ?? "";
  const match = header.match(new RegExp(`${REF_COOKIE}=([^;]+)`));
  const fromHeader = match?.[1]?.trim();
  const fromQuery = req.nextUrl.searchParams.get("ref")?.trim();
  const code = (fromHeader || fromQuery || "").toUpperCase();
  if (!code) return null;
  return findManagerByCode(code).catch(() => null);
}

/**
 * Registro de audiencia de la tienda.
 *
 * Lo llama el navegador (components/VisitTracker.tsx) una vez por sesión de
 * navegación para decir "esta persona entró a la tienda". El servidor decide
 * el canal: si la cookie del gestor está puesta, la visita cuenta como MANAGER
 * además de contar en el total; si no, es DIRECT.
 *
 * Nunca devuelve datos de nadie ni identifica a la persona: guarda un id
 * anónimo de navegador y, si había sesión, el id de la cuenta.
 */
export async function POST(req: NextRequest) {
  const who = await readVisitor();

  // Freno anti-abuso: muchísimos beacons seguidos desde el mismo navegador se
  // ignoran (no afecta a una persona normal navegando).
  const limit = rateLimit(`track:${who.visitorId}`, 40, 60_000);
  if (!limit.ok) {
    return NextResponse.json({ ok: false, reason: "rate_limited" });
  }

  const manager = await resolveManager(req);
  const user = await getCurrentUser().catch(() => null);
  const day = todayKey();
  const firstPath = req.headers.get("referer") ? safePath(req.headers.get("referer")!) : null;

  // Total del día (sin importar el canal).
  await prisma.siteVisit
    .upsert({
      where: { visitorId_day_scope: { visitorId: who.visitorId, day, scope: "ALL" } },
      create: {
        visitorId: who.visitorId,
        day,
        scope: "ALL",
        firstPath,
        userId: user?.id ?? null,
      },
      update: {
        hits: { increment: 1 },
        lastSeenAt: new Date(),
        ...(user?.id ? { userId: user.id } : {}),
      },
    })
    .catch(() => null);

  // Entrada por el enlace de un gestor.
  if (manager) {
    await prisma.siteVisit
      .upsert({
        where: { visitorId_day_scope: { visitorId: who.visitorId, day, scope: "MANAGER" } },
        create: {
          visitorId: who.visitorId,
          day,
          scope: "MANAGER",
          managerId: manager.id,
          firstPath,
          userId: user?.id ?? null,
        },
        update: {
          hits: { increment: 1 },
          lastSeenAt: new Date(),
          managerId: manager.id,
          ...(user?.id ? { userId: user.id } : {}),
        },
      })
      .catch(() => null);
  }

  const res = NextResponse.json({ ok: true, channel: manager ? "MANAGER" : "DIRECT" });
  if (who.shouldSet) {
    res.cookies.set("mm_vid", who.visitorId, visitorCookieOptions());
  }
  return res;
}

/** De una URL absoluta saca solo la ruta (`/producto/abc`), nunca el host. */
function safePath(url: string): string | null {
  try {
    return new URL(url).pathname.slice(0, 300);
  } catch {
    return null;
  }
}

const CartEventSchema = z.object({
  productId: z.string().min(1).max(200),
  productName: z.string().min(1).max(300),
  quantity: z.coerce.number().int().min(1).max(999),
  unitPrice: z.coerce.number().min(0).max(10_000_000),
  currency: z.string().min(1).max(8).default("ARS"),
});

/**
 * Registra que alguien agregó un producto al carrito. Sirve para que el panel
 * muestre los carritos armados, distinguiendo si la persona llegó por el enlace
 * de un gestor o directo a la tienda.
 */
export async function PUT(req: NextRequest) {
  const who = await readVisitor();
  const limit = rateLimit(`cartadd:${who.visitorId}`, 60, 60_000);
  if (!limit.ok) return NextResponse.json({ ok: false, reason: "rate_limited" });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, reason: "bad_json" }, { status: 400 });
  }
  const parsed = CartEventSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, reason: "invalid" }, { status: 400 });
  }
  const d = parsed.data;

  const manager = await resolveManager(req);
  const user = await getCurrentUser().catch(() => null);

  await prisma.cartAdd
    .create({
      data: {
        visitorId: who.visitorId,
        userId: user?.id ?? null,
        managerId: manager?.id ?? null,
        source: manager ? "MANAGER" : "DIRECT",
        productId: d.productId.slice(0, 200),
        productName: d.productName.slice(0, 300),
        quantity: d.quantity,
        unitPrice: d.unitPrice,
        currency: d.currency || "ARS",
      },
    })
    .catch(() => null);

  const res = NextResponse.json({ ok: true });
  if (who.shouldSet) {
    res.cookies.set("mm_vid", who.visitorId, visitorCookieOptions());
  }
  return res;
}
