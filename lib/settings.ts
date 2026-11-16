import { prisma } from "./db";
import { BASE_CURRENCY, DEFAULT_CURRENCIES, parseCurrencies, type Currency } from "./currency";
import { LEGAL_DEFAULTS } from "./legal-defaults";
import { DEFAULT_SITE_TEXTS, resolveSiteTexts, type SiteTexts } from "./site-texts";

export type SettingsDTO = {
  brand: string;
  tagline: string;
  bankDetails: string;
  whatsapp: string;
  whatsappDisplay: string;
  storeAddress: string;
  storeLat: number;
  storeLng: number;
  baseRate: number;
  perKm: number;
  maxRadius: number;
  baseCurrency: string;
  /** Moneda en la que el cliente ve TODOS los precios. La fija el administrador. */
  displayCurrency: string;
  currencies: Currency[];
  /** Números de WhatsApp que reciben el aviso de cada reserva nueva. */
  notificationPhones: string[];
  /** Logo de la tienda (data URI o URL). null = se usa el ícono por defecto. */
  logoUrl: string | null;
  /** Textos legales editables (Markdown simple). */
  termsText: string;
  privacyText: string;
  cookiesText: string;
  reservationsText: string;
  /** Copy editable del catálogo y la portada. */
  catalogTitle: string;
  catalogIntro: string;
  heroTitle: string;
  heroSubtitle: string;
  /** Textos editables de toda la web (barra superior, secciones, pie). */
  siteTexts: SiteTexts;
  /** SEO */
  seoTitle: string;
  seoDescription: string;
  seoKeywords: string;
  siteUrl: string;
  /** Código de Search Console: aparece como "google-site-verification". */
  googleSiteVerification: string;
  /** Avisos automáticos (sin secretos: la clave de correo nunca sale de aquí). */
  autoRestockEnabled: boolean;
  autoRepurchaseEnabled: boolean;
  repurchaseDays: number;
  /** Si hay una clave de correo configurada (nunca se expone la clave). */
  emailConfigured: boolean;
  emailFrom: string;
};

/**
 * Valores de arranque: se usan cuando la fila de ajustes todavía no existe o
 * la base está fría (deploy recién hecho). La tienda los cambia desde
 * Administración → Ajustes / Contenido.
 */
export const FALLBACK_SETTINGS: SettingsDTO = {
  brand: "Mist & Mood",
  tagline: "",
  bankDetails:
    "Banco Ejemplo\nTitular: Mist & Mood\nCUENTA: 0000000000\nAlias: MIST-AND-MOOD",
  whatsapp: "5350000000",
  whatsappDisplay: "+53 5000 0000",
  storeAddress: "Calle Ejemplo 145, La Habana",
  storeLat: 23.1136,
  storeLng: -82.3666,
  baseRate: 250,
  perKm: 120,
  maxRadius: 20,
  baseCurrency: BASE_CURRENCY,
  displayCurrency: BASE_CURRENCY,
  currencies: DEFAULT_CURRENCIES,
  notificationPhones: [],
  logoUrl: null,
  termsText: LEGAL_DEFAULTS.termsText,
  privacyText: LEGAL_DEFAULTS.privacyText,
  cookiesText: LEGAL_DEFAULTS.cookiesText,
  reservationsText: LEGAL_DEFAULTS.reservationsText,
  catalogTitle: "Catálogo",
  catalogIntro:
    "Filtrá por familia olfativa, marca o precio para encontrar tu fragancia.",
  heroTitle: "",
  heroSubtitle: "",
  siteTexts: DEFAULT_SITE_TEXTS,
  seoTitle: "Mist & Mood — Perfumería cubana",
  seoDescription:
    "Perfumes con reserva online y entrega en La Habana. Retiro en tienda o envío por kilómetro.",
  seoKeywords:
    "perfumes, perfumería, fragancias, perfumes originales, La Habana, Cuba, reservar perfume",
  siteUrl: "",
  googleSiteVerification: "",
  autoRestockEnabled: true,
  autoRepurchaseEnabled: true,
  repurchaseDays: 60,
  emailConfigured: false,
  emailFrom: "",
};

/**
 * Versión de los ajustes segura para enviar al navegador.
 *
 * El logo se guarda en la base como data URL base64 (~11 KB). Si lo mandamos
 * dentro del objeto de ajustes que viaja al navegador, esas decenas de KB se
 * repiten en cada página. Aquí lo reemplazamos por la ruta cacheable
 * `/api/logo`, que sirve exactamente la misma imagen. Los componentes que sólo
 * MUESTRAN el logo pueden usar esta versión; el panel de administración sigue
 * leyendo el valor original para poder editarlo.
 */
export function clientSafeSettings(settings: SettingsDTO): SettingsDTO {
  const isDataUrl = (v: string | null | undefined) =>
    typeof v === "string" && v.startsWith("data:");
  return {
    ...settings,
    logoUrl: isDataUrl(settings.logoUrl) ? "/api/logo" : settings.logoUrl,
  };
}

function parsePhones(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((p) => String(p ?? "").replace(/[^\d]/g, ""))
    .filter((p) => p.length >= 6);
}

/** Un texto vacío en la base cae al texto por defecto de esa página. */
function textOr(value: string | null | undefined, fallback: string): string {
  const trimmed = typeof value === "string" ? value.trim() : "";
  return trimmed.length ? (value as string) : fallback;
}

/**
 * Una sola fuente de verdad para la configuración de la tienda. Ninguna
 * pantalla debe escribir un número o un texto que el administrador pueda
 * cambiar.
 *
 * Nunca lanza: si la tabla no existe todavía (base fría en el primer deploy),
 * devuelve FALLBACK_SETTINGS para que la página se vea, no que explote.
 */
export async function getSettings(): Promise<SettingsDTO> {
  try {
    let row = await prisma.storeSettings.findUnique({ where: { id: "singleton" } });
    if (!row) {
      row = await prisma.storeSettings.create({ data: { id: "singleton" } });
    }
    const currencies = parseCurrencies(row.currencies);
    const displayCurrency = currencies.some((c) => c.code === row.displayCurrency)
      ? row.displayCurrency
      : BASE_CURRENCY;
    return {
      brand: row.brand || FALLBACK_SETTINGS.brand,
      tagline: row.tagline ?? "",
      bankDetails: row.bankDetails || FALLBACK_SETTINGS.bankDetails,
      whatsapp: row.whatsapp,
      whatsappDisplay: row.whatsappDisplay,
      storeAddress: row.storeAddress,
      storeLat: row.storeLat,
      storeLng: row.storeLng,
      baseRate: Number(row.baseRate),
      perKm: Number(row.perKm),
      maxRadius: row.maxRadius,
      baseCurrency: row.baseCurrency || BASE_CURRENCY,
      displayCurrency,
      currencies,
      notificationPhones: parsePhones(row.notificationPhones),
      logoUrl: row.logoUrl?.trim() ? row.logoUrl : null,
      termsText: textOr(row.termsText, LEGAL_DEFAULTS.termsText),
      privacyText: textOr(row.privacyText, LEGAL_DEFAULTS.privacyText),
      cookiesText: textOr(row.cookiesText, LEGAL_DEFAULTS.cookiesText),
      reservationsText: textOr(row.reservationsText, LEGAL_DEFAULTS.reservationsText),
      catalogTitle: row.catalogTitle || FALLBACK_SETTINGS.catalogTitle,
      catalogIntro: row.catalogIntro ?? FALLBACK_SETTINGS.catalogIntro,
      heroTitle: row.heroTitle ?? "",
      heroSubtitle: row.heroSubtitle ?? "",
      siteTexts: resolveSiteTexts(row.siteTexts),
      seoTitle: row.seoTitle || FALLBACK_SETTINGS.seoTitle,
      seoDescription: row.seoDescription || FALLBACK_SETTINGS.seoDescription,
      seoKeywords: row.seoKeywords || FALLBACK_SETTINGS.seoKeywords,
      siteUrl: row.siteUrl ?? "",
      googleSiteVerification: row.googleSiteVerification ?? "",
      autoRestockEnabled: row.autoRestockEnabled ?? true,
      autoRepurchaseEnabled: row.autoRepurchaseEnabled ?? true,
      repurchaseDays: row.repurchaseDays ?? 60,
      emailConfigured: Boolean(
        (row.emailApiKey && row.emailApiKey.trim()) ||
          process.env.RESEND_API_KEY ||
          process.env.BREVO_API_KEY,
      ),
      emailFrom: row.emailFrom ?? "",
    };
  } catch (error) {
    console.error("[settings] usando valores por defecto:", (error as Error).message);
    return FALLBACK_SETTINGS;
  }
}

/** Textos legales sueltos, para el renderizador de páginas legales. */
export type LegalTexts = {
  termsText: string;
  privacyText: string;
  cookiesText: string;
  reservationsText: string;
};

export function legalTextsOf(settings: SettingsDTO): LegalTexts {
  return {
    termsText: settings.termsText,
    privacyText: settings.privacyText,
    cookiesText: settings.cookiesText,
    reservationsText: settings.reservationsText,
  };
}
