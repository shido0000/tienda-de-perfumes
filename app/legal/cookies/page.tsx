import type { Metadata } from "next";
import { LegalLayout } from "@/components/LegalLayout";
import { getSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const s = await getSettings();
  return { title: `Política de cookies — ${s.brand}` };
}

export default async function CookiesPage() {
  const s = await getSettings();
  return (
    <LegalLayout
      title="Política de cookies"
      intro="Este sitio usa almacenamiento local y una cookie de sesión. Nada más."
      text={s.cookiesText}
    />
  );
}
