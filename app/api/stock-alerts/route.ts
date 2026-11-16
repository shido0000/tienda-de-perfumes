import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { z } from "zod";

export const dynamic = "force-dynamic";

const schema = z.object({
  productId: z.string().min(1),
  name: z.string().max(120).optional(),
  email: z.string().email().max(160).optional().or(z.literal("")),
  phone: z.string().max(40).optional(),
});

/** El cliente pide que le avisen cuando vuelva el stock de un perfume. */
export async function POST(req: Request) {
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Revisá los datos del aviso." }, { status: 400 });
  }
  const { productId, name, email, phone } = parsed.data;

  const cleanEmail = email?.trim() || null;
  const cleanPhone = phone?.replace(/[^\d+]/g, "") || null;
  if (!cleanEmail && !cleanPhone) {
    return NextResponse.json(
      { error: "Dejá un correo o un WhatsApp para poder avisarte." },
      { status: 400 },
    );
  }

  const product = await prisma.product.findFirst({
    where: { id: productId, visible: true },
    select: { id: true },
  });
  if (!product) {
    return NextResponse.json({ error: "Producto no encontrado." }, { status: 404 });
  }

  const user = await getCurrentUser();

  // Una sola alerta por persona y producto: si vuelve a pedirlo, se refresca.
  const existing = await prisma.stockAlert.findFirst({
    where: {
      productId,
      OR: [
        cleanEmail ? { email: cleanEmail } : undefined,
        cleanPhone ? { phone: cleanPhone } : undefined,
      ].filter(Boolean) as never,
    },
    select: { id: true },
  });

  if (existing) {
    await prisma.stockAlert.update({
      where: { id: existing.id },
      data: {
        name: name?.trim() || null,
        status: "NEW",
        notifiedAt: null,
        userId: user?.id ?? null,
      },
    });
    return NextResponse.json({ ok: true, already: true });
  }

  await prisma.stockAlert.create({
    data: {
      productId,
      userId: user?.id ?? null,
      name: name?.trim() || null,
      email: cleanEmail,
      phone: cleanPhone,
      status: "NEW",
    },
  });

  return NextResponse.json({ ok: true });
}
