import "./globals.css";
import type { Metadata, Viewport } from "next";
import { getSettings } from "@/lib/settings";
import { clientSafeSettings } from "@/lib/settings";
import { getCurrentUser } from "@/lib/session";
import { SettingsProvider } from "@/lib/settings-context";
import { CartProvider } from "@/lib/cart-context";
import { ToastProvider } from "@/components/ui/ToastProvider";
import { ConfirmProvider } from "@/components/ui/ConfirmProvider";
import { PwaRegister } from "@/components/PwaRegister";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { WhatsAppFloat } from "@/components/WhatsAppFloat";
import { NavigationProgress } from "@/components/NavigationProgress";
import { ManagerVisitTracker } from "@/components/ManagerVisitTracker";
import { VisitTracker } from "@/components/VisitTracker";
import { getRefManager } from "@/lib/manager";
import { ChatWidget } from "@/components/ChatWidget";
import { storeJsonLd } from "@/lib/structured-data";
import { getSiteUrl } from "@/lib/site-url";
import { appleTouchIcon, logoSrc, logoVersion } from "@/lib/pwa-icons";

/**
 * Metadatos tomados de los ajustes de la tienda: el título, la descripción y
 * las palabras clave se editan desde Administración → Contenido → SEO.
 */
export async function generateMetadata(): Promise<Metadata> {
  const s = await getSettings();
  const base = (await getSiteUrl(s)) || undefined;
  const version = logoVersion(s.logoUrl);
  // El logo vive en la base como data URL (base64). Referenciarlo así dentro
  // del <head> obligaba a repetir el base64 en cada página; /api/logo lo sirve
  // aparte y cacheable. Si no hay logo, cae al icono por defecto.
  const icon = s.logoUrl ? logoSrc(s.logoUrl, version) : "/icons/icon.svg";

  return {
    metadataBase: base ? new URL(base) : undefined,
    title: {
      default: s.seoTitle,
      template: `%s — ${s.brand}`,
    },
    description: s.seoDescription,
    keywords: s.seoKeywords.split(",").map((k) => k.trim()).filter(Boolean),
    applicationName: s.brand,
    // El manifiesto se referencia versionado por el logo: cuando el dueño sube
    // un ícono distinto cambia esta URL, el navegador vuelve a leer el
    // manifiesto y actualiza el ícono de la app instalada SIN duplicarla
    // (el `id` del manifiesto es fijo: "/").
    manifest: `/manifest.webmanifest?v=${version}`,
    appleWebApp: {
      capable: true,
      title: s.brand,
      statusBarStyle: "default",
    },
    other: {
      // Safari en iOS lee apple-mobile-web-app-capable; Chrome/Android lee esta.
      "mobile-web-app-capable": "yes",
    },
    icons: {
      icon: [{ url: icon }],
      apple: [{ url: appleTouchIcon(s.logoUrl, version), sizes: "180x180" }],
    },
    openGraph: {
      type: "website",
      siteName: s.brand,
      title: s.seoTitle,
      description: s.seoDescription,
      locale: "es_CU",
    },
    twitter: {
      card: "summary_large_image",
      title: s.seoTitle,
      description: s.seoDescription,
    },
    robots: { index: true, follow: true },
    ...(process.env.GOOGLE_SITE_VERIFICATION || s.googleSiteVerification.trim()
      ? {
          verification: {
            google: (
              s.googleSiteVerification.trim() || process.env.GOOGLE_SITE_VERIFICATION || ""
            ).trim(),
          },
        }
      : {}),
    alternates: base ? { canonical: base } : undefined,
  };
}

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f7f4ee" },
    { media: "(prefers-color-scheme: dark)", color: "#11100e" },
  ],
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

/**
 * Aplica el tema guardado antes del primer paint para que no haya destello
 * blanco al cargar en modo oscuro. Si no hay preferencia guardada se respeta
 * la del sistema operativo.
 */
const THEME_SCRIPT = `
(function () {
  try {
    var saved = localStorage.getItem("mistmood_theme");
    var dark = saved ? saved === "dark" : window.matchMedia("(prefers-color-scheme: dark)").matches;
    if (dark) document.documentElement.classList.add("dark");
  } catch (e) {}
})();
`;

export const dynamic = "force-dynamic";

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const settings = await getSettings();
  const [user, siteUrl, manager] = await Promise.all([
    getCurrentUser().catch(() => null),
    getSiteUrl(settings),
    getRefManager().catch(() => null),
  ]);

  // Versión sin el base64 del logo: así el objeto de ajustes que viaja al
  // navegador (contexto + pie) no repite ~11 KB en cada página.
  const clientSettings = clientSafeSettings(settings);

  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;1,500&family=Karla:wght@300;400;500;600&display=swap"
        />
        {/* Datos estructurados: así Google entiende que esto es una tienda de
            perfumes con catálogo, no una página cualquiera. */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(storeJsonLd(settings, siteUrl)) }}
        />
      </head>
      <body className="bg-bg text-ink font-body antialiased">
        <SettingsProvider initial={clientSettings}>
          <ToastProvider>
            <ConfirmProvider>
              <CartProvider initialUser={user}>
                <NavigationProgress />
                {manager ? <ManagerVisitTracker /> : null}
                <VisitTracker />
                <div className="flex min-h-screen flex-col">
                  <Header user={user} />
                  <main className="flex-1">{children}</main>
                  <Footer settings={clientSettings} />
                </div>
                <WhatsAppFloat whatsapp={settings.whatsapp} brand={settings.brand} />
                <ChatWidget />
                <PwaRegister />
              </CartProvider>
            </ConfirmProvider>
          </ToastProvider>
        </SettingsProvider>
      </body>
    </html>
  );
}
