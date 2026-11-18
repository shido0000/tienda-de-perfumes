import Link from "next/link";
import { getSettings } from "@/lib/settings";
import { resolveSiteTexts } from "@/lib/site-texts";

export const dynamic = "force-dynamic";

export const metadata = { title: "Sin conexión — Mist & Mood" };

/** Página que muestra el service worker cuando el móvil se queda sin datos. */
export default async function OfflinePage() {
  let t;
  try {
    const settings = await getSettings();
    t = resolveSiteTexts(settings.siteTexts);
  } catch {
    const { DEFAULT_SITE_TEXTS } = await import("@/lib/site-texts");
    t = DEFAULT_SITE_TEXTS;
  }

  return (
    <div className="mx-auto flex min-h-[60vh] w-full max-w-lg flex-col items-center justify-center px-6 text-center">
      <p className="text-xs uppercase tracking-[0.2em] text-muted">{t.offlineEyebrow}</p>
      <h1 className="mt-4 text-h2 text-ink">{t.offlineHeadline}</h1>
      <p className="mt-3 text-sm leading-relaxed text-muted">{t.offlineBody}</p>
      <Link
        href="/"
        className="mt-6 rounded-control bg-primary px-5 py-2.5 text-sm font-medium text-on-primary transition-opacity hover:opacity-90"
      >
        {t.offlineCta}
      </Link>
    </div>
  );
}
