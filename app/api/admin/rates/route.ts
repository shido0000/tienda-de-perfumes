import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { parseJson } from "@/lib/json";

export const dynamic = "force-dynamic";

/** Historial de cambios de cotización, con fecha. */
export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const logs = await prisma.currencyRateLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 30,
  });

  return NextResponse.json({
    history: logs.map((l) => ({
      id: l.id,
      code: l.code,
      snapshot: parseJson<Record<string, number>>(l.snapshot, {}),
      createdAt: l.createdAt.toISOString(),
    })),
  });
}
