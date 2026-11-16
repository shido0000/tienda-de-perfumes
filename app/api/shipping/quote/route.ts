import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { getSettings } from "@/lib/settings";
import { quoteShipping } from "@/lib/shipping";
import { haversineKm } from "@/lib/shipping";
import { formatMoney, findCurrency, BASE_CURRENCY } from "@/lib/currency";
import { z } from "zod";

export const dynamic = "force-dynamic";

const schema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});

/**
 * Distancia y costo de envío del punto que eligió el cliente.
 * El envío a domicilio se cobra en CUP (peso cubano), sin importar en qué
 * moneda se muestren los productos.
 */
export async function POST(req: Request) {
  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Ubicación inválida" }, { status: 400 });
  }

  const settings = await getSettings();
  const { latitude, longitude } = parsed.data;
  const distanceKm = haversineKm(
    settings.storeLat,
    settings.storeLng,
    latitude,
    longitude,
  );

  const quote = quoteShipping(distanceKm, {
    baseRate: settings.baseRate,
    perKm: settings.perKm,
    maxRadius: settings.maxRadius,
  });

  const cup = findCurrency(settings.currencies, BASE_CURRENCY);
  return NextResponse.json({
    ...quote,
    currency: BASE_CURRENCY,
    currencySymbol: cup.symbol,
    formatted: quote.ok ? formatMoney(quote.cost, cup) : null,
    maxRadius: settings.maxRadius,
    storeAddress: settings.storeAddress,
  });
}
