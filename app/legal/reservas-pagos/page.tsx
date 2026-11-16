import type { Metadata } from "next";
import { LegalLayout } from "@/components/LegalLayout";
import { getSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const s = await getSettings();
  return { title: `Reservas, pagos y devoluciones — ${s.brand}` };
}

export default async function ReservationsPolicyPage() {
  const s = await getSettings();
  return (
    <LegalLayout
      title="Reservas, pagos y devoluciones"
      intro="Cómo funciona el proceso de reserva, pago y qué pasa si necesitás cancelar."
      text={s.reservationsText}
    />
  );
}
