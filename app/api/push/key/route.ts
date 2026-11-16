import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/session";
import { getVapidKeys } from "@/lib/push";

export const dynamic = "force-dynamic";

/** Clave pública VAPID que necesita el navegador para suscribirse a los avisos. */
export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const keys = await getVapidKeys();
  return NextResponse.json({ publicKey: keys?.publicKey ?? null });
}
