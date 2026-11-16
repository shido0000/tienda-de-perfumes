/** Great-circle distance in km between two lat/lng points. */
export function haversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(a)) * 100) / 100;
}

export type ShippingRule = {
  baseRate: number;
  perKm: number;
  maxRadius: number;
};

export type ShippingQuote =
  | { ok: true; distanceKm: number; cost: number }
  | { ok: false; distanceKm: number; error: string };

/**
 * Delivery cost = base rate + per-km rate × distance, quoted in the store's
 * base currency. Beyond maxRadius the store does not deliver at all, so this
 * returns an error rather than a bigger number.
 */
export function quoteShipping(distanceKm: number, rule: ShippingRule): ShippingQuote {
  if (!Number.isFinite(distanceKm) || distanceKm < 0) {
    return { ok: false, distanceKm: 0, error: "No pudimos calcular la distancia." };
  }
  if (distanceKm > rule.maxRadius) {
    return {
      ok: false,
      distanceKm,
      error: `Estás a ${distanceKm.toFixed(1)} km y el radio máximo de entrega es ${rule.maxRadius} km. Elegí retiro en tienda o coordiná por WhatsApp.`,
    };
  }
  const cost = Math.round((rule.baseRate + rule.perKm * distanceKm) * 100) / 100;
  return { ok: true, distanceKm, cost };
}
