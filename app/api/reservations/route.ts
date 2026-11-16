import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { getSettings } from "@/lib/settings";
import { convert, round2, findCurrency, BASE_CURRENCY, formatMoney } from "@/lib/currency";
import { haversineKm, quoteShipping } from "@/lib/shipping";
import { notifyReservation } from "@/lib/whatsapp";
import { notifyAdmins } from "@/lib/push";
import { z } from "zod";

export const dynamic = "force-dynamic";

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function makeCode(): string {
  let out = "";
  for (let i = 0; i < 6; i++) {
    out += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  }
  return `MOOD-${out}`;
}

const MAX_PROOF_LENGTH = 2_800_000; // ~2 MB de imagen en base64

const createSchema = z.object({
  items: z
    .array(
      z.object({
        productId: z.string().min(1),
        quantity: z.number().int().min(1).max(20),
      }),
    )
    .min(1),
  currency: z.string().min(2).max(6).optional(),
  deliveryType: z.enum(["PICKUP", "DELIVERY"]),
  paymentMethod: z.enum(["CASH", "TRANSFER"]),
  address: z.string().max(300).optional().nullable(),
  latitude: z.number().min(-90).max(90).optional().nullable(),
  longitude: z.number().min(-180).max(180).optional().nullable(),
  customerNote: z.string().max(500).optional().nullable(),
  transferProofUrl: z.string().max(MAX_PROOF_LENGTH).optional().nullable(),
});

/** A user's own reservations. Admins use /api/admin/reservations. */
export async function GET() {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const reservations = await prisma.reservation.findMany({
    where: { userId: user.id },
    include: { items: true },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ reservations });
}

export async function POST(req: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const parsed = createSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const field = String(issue?.path?.[0] ?? "");
    const FIELD_LABEL: Record<string, string> = {
      items: "los productos de la reserva",
      deliveryType: "la forma de entrega (retiro o envío)",
      paymentMethod: "la forma de pago (efectivo o transferencia)",
      address: "la dirección de envío",
      latitude: "la ubicación en el mapa",
      longitude: "la ubicación en el mapa",
      customerNote: "la nota",
      transferProofUrl: "el comprobante de la transferencia",
    };
    const message = FIELD_LABEL[field]
      ? `Revisá ${FIELD_LABEL[field]}.`
      : "Revisá los datos de la reserva.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
  const body = parsed.data;
  const settings = await getSettings();

  // La moneda del pedido la fija la tienda (Administración → Ajustes), nunca el
  // navegador: así el precio que ve el cliente es el que se guarda.
  const currencies = settings.currencies;
  const orderCurrency = findCurrency(currencies, settings.displayCurrency);
  const cupCurrency = findCurrency(currencies, BASE_CURRENCY);

  // Prices come from the DATABASE, never from the request.
  const directItems = body.items.filter((i) => !i.productId.startsWith("combo:"));
  const comboRequests = body.items.filter((i) => i.productId.startsWith("combo:"));
  const comboIdOf = (productId: string) => productId.slice("combo:".length);

  const ids = [...new Set(directItems.map((i) => i.productId))];
  const products = await prisma.product.findMany({
    where: { id: { in: ids }, visible: true },
  });
  if (products.length !== ids.length) {
    return NextResponse.json(
      { error: "Algún producto del carrito ya no está disponible." },
      { status: 409 },
    );
  }

  const comboIds = [...new Set(comboRequests.map((i) => comboIdOf(i.productId)))];
  const combos = comboIds.length
    ? await prisma.combo.findMany({
        where: { id: { in: comboIds }, visible: true },
        include: { items: { include: { product: true } } },
      })
    : [];
  const comboById = new Map(combos.map((c) => [c.id, c]));
  const missingCombo = comboRequests.find((i) => !comboById.has(comboIdOf(i.productId)));
  if (missingCombo) {
    return NextResponse.json(
      { error: "Una de las ofertas de tu carrito ya no está disponible." },
      { status: 409 },
    );
  }

  type OrderLine = {
    productId: string | null;
    comboId: string | null;
    name: string;
    brand: string;
    priceOriginal: number;
    currencyOriginal: string;
    priceConverted: number;
    orderCurrency: string;
    quantity: number;
    stock: number | null;
  };

  const lines: OrderLine[] = directItems.map((item) => {
    const product = products.find((p) => p.id === item.productId)!;
    const priceOriginal = Number(product.price);
    const priceConverted = convert(
      priceOriginal,
      product.currency,
      orderCurrency.code,
      currencies,
    );
    return {
      productId: product.id,
      comboId: null,
      name: product.name,
      brand: product.brand,
      priceOriginal,
      currencyOriginal: product.currency,
      priceConverted,
      orderCurrency: orderCurrency.code,
      quantity: item.quantity,
      stock: product.stock,
    };
  });

  // El combo se cobra como una sola línea al precio de la oferta.
  for (const item of comboRequests) {
    const combo = comboById.get(comboIdOf(item.productId))!;
    const priceOriginal = Number(combo.price);
    lines.push({
      productId: null,
      comboId: combo.id,
      name: combo.title,
      brand: "Oferta",
      priceOriginal,
      currencyOriginal: combo.currency,
      priceConverted: convert(
        priceOriginal,
        combo.currency,
        orderCurrency.code,
        currencies,
      ),
      orderCurrency: orderCurrency.code,
      quantity: item.quantity,
      stock: null,
    });
  }

  // Demanda total de stock por producto: líneas sueltas + componentes de combos.
  const demand = new Map<string, { quantity: number; name: string; stock: number | null }>();
  const addDemand = (product: { id: string; name: string; stock: number | null }, qty: number) => {
    const current = demand.get(product.id);
    demand.set(product.id, {
      quantity: (current?.quantity ?? 0) + qty,
      name: product.name,
      stock: product.stock,
    });
  };
  for (const item of directItems) {
    const product = products.find((p) => p.id === item.productId)!;
    addDemand(product, item.quantity);
  }
  for (const item of comboRequests) {
    const combo = comboById.get(comboIdOf(item.productId))!;
    for (const component of combo.items) {
      addDemand(component.product, component.quantity * item.quantity);
    }
  }

  const shortageEntry = [...demand.values()].find(
    (d) => d.stock !== null && d.quantity > d.stock,
  );
  if (shortageEntry) {
    const left = shortageEntry.stock ?? 0;
    return NextResponse.json(
      {
        error:
          left === 0
            ? `Lo sentimos, ${shortageEntry.name} se agotó. Quitalo del carrito para continuar.`
            : `Solo quedan ${left} unidad(es) de ${shortageEntry.name}. Ajustá la cantidad en el carrito.`,
      },
      { status: 409 },
    );
  }

  const subtotal = round2(
    lines.reduce((sum, l) => sum + l.priceConverted * l.quantity, 0),
  );

  // ---- Envío -------------------------------------------------------------
  // El envío a domicilio se cobra SIEMPRE en CUP (moneda base de la tienda).
  let distanceKm: number | null = null;
  let shippingCup = 0;

  if (body.deliveryType === "DELIVERY") {
    if (
      typeof body.latitude !== "number" ||
      typeof body.longitude !== "number" ||
      !body.address?.trim()
    ) {
      return NextResponse.json(
        { error: "Para envío a domicilio necesitamos dirección y ubicación en el mapa." },
        { status: 400 },
      );
    }
    distanceKm = haversineKm(
      settings.storeLat,
      settings.storeLng,
      body.latitude,
      body.longitude,
    );
    const quote = quoteShipping(distanceKm, {
      baseRate: settings.baseRate,
      perKm: settings.perKm,
      maxRadius: settings.maxRadius,
    });
    if (!quote.ok) {
      return NextResponse.json({ error: quote.error }, { status: 400 });
    }
    shippingCup = round2(quote.cost);
  }

  // El envío se guarda en CUP; el total se expresa en la moneda de la tienda.
  const shippingInOrderCurrency = convert(
    shippingCup,
    cupCurrency.code,
    orderCurrency.code,
    currencies,
  );
  const total = round2(subtotal + shippingInOrderCurrency);

  // ---- Transferencia: el comprobante es obligatorio -----------------------
  const proof =
    body.paymentMethod === "TRANSFER" ? (body.transferProofUrl ?? "").trim() : "";
  if (body.paymentMethod === "TRANSFER") {
    if (!proof) {
      return NextResponse.json(
        { error: "Adjuntá la imagen del comprobante de la transferencia para reservar." },
        { status: 400 },
      );
    }
    const looksLikeUrl = /^https?:\/\//i.test(proof);
    const looksLikeData = /^data:image\//i.test(proof);
    if (!looksLikeUrl && !looksLikeData) {
      return NextResponse.json(
        { error: "El comprobante debe ser una imagen." },
        { status: 400 },
      );
    }
  }

  // ---- Persistir ---------------------------------------------------------
  let reservation = null;
  for (let attempt = 0; attempt < 5 && !reservation; attempt++) {
    const code = makeCode();
    const taken = await prisma.reservation.findUnique({ where: { code } });
    if (taken) continue;
    reservation = await prisma.reservation.create({
      data: {
        code,
        userId: user.id,
        currency: orderCurrency.code,
        subtotal,
        deliveryType: body.deliveryType,
        address: body.deliveryType === "DELIVERY" ? body.address!.trim() : null,
        latitude: body.deliveryType === "DELIVERY" ? body.latitude! : null,
        longitude: body.deliveryType === "DELIVERY" ? body.longitude! : null,
        distanceKm,
        shippingCost: shippingCup,
        total,
        paymentMethod: body.paymentMethod,
        transferProofUrl: proof || null,
        status: "PENDING",
        customerNote: body.customerNote?.trim() || null,
        items: {
          create: lines.map((l) => ({
            productId: l.productId,
            comboId: l.comboId,
            name: l.name,
            brand: l.brand,
            priceOriginal: l.priceOriginal,
            currencyOriginal: l.currencyOriginal,
            priceConverted: l.priceConverted,
            orderCurrency: l.orderCurrency,
            quantity: l.quantity,
          })),
        },
      },
      include: { items: true },
    });
  }

  if (!reservation) {
    return NextResponse.json(
      { error: "No pudimos generar el código de reserva. Intentá de nuevo." },
      { status: 500 },
    );
  }

  // Descuento de stock atómico: si otra persona se llevó las últimas unidades
  // entre la comprobación y ahora, el updateMany afecta 0 filas y deshacemos.
  // Se recorre la DEMANDA calculada, así un combo descuenta el stock de cada
  // producto que lo compone.
  for (const [productId, need] of demand) {
    if (need.stock === null) continue;
    const moved = await prisma.product.updateMany({
      where: { id: productId, stock: { gte: need.quantity } },
      data: { stock: { decrement: need.quantity } },
    });
    if (moved.count === 0) {
      await prisma.reservation
        .delete({ where: { id: reservation.id } })
        .catch(() => null);
      return NextResponse.json(
        {
          error: `Lo sentimos, ${need.name} se agotó mientras completabas la reserva. Probá de nuevo.`,
        },
        { status: 409 },
      );
    }
  }

  // The cart has become the order — clear it, and close the abandoned-checkout
  // tracking row so it stops appearing in the "llegó al pago y no terminó" list.
  await prisma.cartItem.deleteMany({ where: { userId: user.id } });
  await prisma.checkoutIntent
    .updateMany({ where: { userId: user.id, status: "OPEN" }, data: { status: "RECOVERED" } })
    .catch(() => null);

  // Aviso por WhatsApp a los números de la administración.
  await notifyReservation({
    code: reservation.code,
    customerName: user.name ?? "",
    customerEmail: user.email,
    total,
    currency: orderCurrency.code,
    deliveryType: body.deliveryType,
    paymentMethod: body.paymentMethod,
    items: lines.map((l) => ({ name: l.name, quantity: l.quantity })),
  });

  // Aviso push al móvil/escritorio de los administradores (aunque tengan la
  // web cerrada). Es un extra: si falla, la reserva ya está guardada.
  await notifyAdmins({
    title: `Nueva reserva ${reservation.code}`,
    body: `${user.name || user.email} · ${formatMoney(total, orderCurrency)} · ${
      body.items.reduce((n, i) => n + i.quantity, 0)
    } artículo(s)`,
    url: "/admin",
    tag: "reserva",
  });

  return NextResponse.json({ reservation }, { status: 201 });
}
