import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { getSettings } from "@/lib/settings";
import { ReservationList } from "@/components/ReservationList";
import type { ReservationDTO } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function MyReservationsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=%2Fmis-reservas");

  const [rows, settings] = await Promise.all([
    prisma.reservation.findMany({
      where: { userId: user.id },
      include: { items: true },
      orderBy: { createdAt: "desc" },
    }),
    getSettings(),
  ]);

  const reservations: ReservationDTO[] = rows.map((r) => ({
    id: r.id,
    code: r.code,
    currency: r.currency,
    subtotal: Number(r.subtotal),
    deliveryType: r.deliveryType,
    address: r.address,
    distanceKm: r.distanceKm,
    shippingCost: Number(r.shippingCost),
    total: Number(r.total),
    paymentMethod: r.paymentMethod,
    transferProofUrl: r.transferProofUrl,
    status: r.status,
    customerNote: r.customerNote,
    createdAt: r.createdAt.toISOString(),
    items: r.items.map((i) => ({
      id: i.id,
      name: i.name,
      brand: i.brand,
      priceOriginal: Number(i.priceOriginal),
      currencyOriginal: i.currencyOriginal,
      priceConverted: Number(i.priceConverted),
      orderCurrency: i.orderCurrency,
      quantity: i.quantity,
    })),
  }));

  return (
    <ReservationList
      reservations={reservations}
      settings={settings}
      customerEmail={user.email}
    />
  );
}
