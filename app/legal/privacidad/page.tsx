import type { Metadata } from "next";
import { LegalLayout } from "@/components/LegalLayout";
import { getSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const s = await getSettings();
  return { title: `Política de privacidad — ${s.brand}` };
}

export default async function PrivacyPage() {
  const s = await getSettings();
  return (
    <LegalLayout
      title="Política de privacidad"
      intro="Qué datos guarda la tienda, para qué los usa y cómo podés pedir su corrección o baja."
      text={s.privacyText}
    />
  );
}
