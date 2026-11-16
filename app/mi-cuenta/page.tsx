import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { getSettings } from "@/lib/settings";
import { AccountDashboard } from "@/components/AccountDashboard";
import type { ReservationDTO } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function MyAccountPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=%2Fmi-cuenta");

  const [rows, settings, wishlistCount, profile] = await Promise.all([
    prisma.reservation.findMany({
      where: { userId: user.id },
      include: { items: true },
      orderBy: { createdAt: "desc" },
    }),
    getSettings(),
    prisma.wishlistItem.count({ where: { userId: user.id } }),
    prisma.user.findUnique({
      where: { id: user.id },
      select: { name: true, email: true, phone: true },
    }),
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
    <div className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6">
      <AccountDashboard
        name={profile?.name ?? user.name ?? null}
        email={profile?.email ?? user.email}
        phone={profile?.phone ?? null}
        reservations={reservations}
        settings={settings}
        wishlistCount={wishlistCount}
      />
      <p className="mt-10 text-center text-xs text-muted">
        ¿Necesitás cancelar una reserva?{" "}
        <Link href="/mis-reservas" className="underline hover:text-primary">
          Abrí Mis reservas
        </Link>{" "}
        y escribinos desde ahí.
      </p>
    </div>
  );
}
