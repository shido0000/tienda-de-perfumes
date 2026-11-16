import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/session";
import { restockConversion } from "@/lib/restock-stats";

export const dynamic = "force-dynamic";

/** ¿Cuántos de la lista de espera compraron después del aviso de reposición? */
export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const stats = await restockConversion();
  return NextResponse.json(stats);
}
