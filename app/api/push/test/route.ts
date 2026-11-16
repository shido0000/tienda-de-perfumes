import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { notifyAdmins } from "@/lib/push";

export const dynamic = "force-dynamic";

/**
 * Manda una notificación de prueba a los dispositivos del administrador.
 * Sirve para comprobar que los avisos de reservas llegan de verdad, sin
 * esperar a que entre un cliente.
 */
export async function POST() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const devices = await prisma.pushSubscription.count({ where: { userId: admin.id } });
  if (devices === 0) {
    return NextResponse.json(
      { error: "Este dispositivo todavía no está suscrito a los avisos." },
      { status: 409 },
    );
  }

  await notifyAdmins({
    title: "Aviso de prueba · Mist & Mood",
    body: "Si ves este mensaje, los avisos de reservas funcionan en este dispositivo.",
    url: "/admin",
    tag: "mistmood-test",
  });

  return NextResponse.json({ ok: true, devices });
}
