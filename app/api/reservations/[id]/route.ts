import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: { id: string } },
) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  // Scoped by userId as well as id: knowing someone else's reservation id must
  // not be enough to read it.
  const reservation = await prisma.reservation.findFirst({
    where: { id: params.id, userId: user.id },
    include: { items: true },
  });

  if (!reservation) {
    return NextResponse.json({ error: "Reserva no encontrada" }, { status: 404 });
  }
  return NextResponse.json({ reservation });
}
