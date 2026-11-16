import type { Metadata } from "next";
import { LegalLayout } from "@/components/LegalLayout";
import { getSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const s = await getSettings();
  return { title: `Términos y condiciones — ${s.brand}` };
}

export default async function TermsPage() {
  const s = await getSettings();
  return (
    <LegalLayout
      title="Términos y condiciones"
      intro="Condiciones generales para el uso del sitio y la realización de reservas de productos."
      text={s.termsText}
    />
  );
}
