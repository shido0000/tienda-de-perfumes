/**
 * Textos del sitio editables desde Administración → Textos.
 *
 * Antes, los rótulos de la barra superior ("Catálogo", "Ofertas", …), los
 * títulos de las secciones de la portada y algunos textos del pie estaban
 * escritos dentro de los componentes: cambiarlos requería tocar el código y
 * volver a publicar. Ahora viven en la base (columna `siteTexts` de
 * StoreSettings, un JSON) y el panel los edita sin redeploy.
 *
 * Si el dueño deja un campo vacío, se usa el texto por defecto de abajo, así
 * nunca queda un hueco en la web.
 */

export type SiteTexts = {
  // ---- Barra superior (nav) -------------------------------------------
  navCatalog: string;
  navQuiz: string;
  navOffers: string;
  navSale: string;
  navWishlist: string;
  navReservations: string;
  navAccount: string;
  navProfile: string;
  navLogin: string;
  navLogout: string;
  navPanel: string;
  // ---- Portada: secciones ---------------------------------------------
  heroCta: string;
  catalogTitle: string;
  catalogIntro: string;
  offerTitle: string;
  offerSubtitle: string;
  offerLink: string;
  saleTitle: string;
  saleIntro: string;
  reviewsTitle: string;
  paymentsTitle: string;
  paymentsIntro: string;
  // ---- Pie -------------------------------------------------------------
  footerAbout: string;
  footerStoreHeading: string;
  footerWhatsappLabel: string;
};

export const DEFAULT_SITE_TEXTS: SiteTexts = {
  navCatalog: "Catálogo",
  navQuiz: "Encontrá tu aroma",
  navOffers: "Ofertas",
  navSale: "Rebajas",
  navWishlist: "Lista de deseos",
  navReservations: "Mis reservas",
  navAccount: "Mi cuenta",
  navProfile: "Mi perfil",
  navLogin: "Ingresar",
  navLogout: "Cerrar sesión",
  navPanel: "Panel",

  heroCta: "Ver el catálogo",
  catalogTitle: "Nuestros perfumes",
  catalogIntro:
    "Filtrá por familia olfativa, marca, precio o para quién es para encontrar tu fragancia.",
  offerTitle: "Ofertas",
  offerSubtitle:
    "Combinaciones de productos a un precio especial. Se descuentan del inventario al reservarlas.",
  offerLink: "Ver todas las ofertas",
  saleTitle: "Rebajas",
  saleIntro: "Fragancias con un precio anterior mejor: el descuento ya está aplicado.",
  reviewsTitle: "Lo que dicen quienes ya lo tienen",
  paymentsTitle: "Formas de pago",
  paymentsIntro:
    "No cobramos online. Al confirmar la reserva, la tienda recibe tu pedido y te escribe para arreglar el pago y la entrega.",

  footerAbout: "Reservas online con retiro en tienda o envío coordinado.",
  footerStoreHeading: "Tienda",
  footerWhatsappLabel: "WhatsApp",
};

/** Lista de campos con su etiqueta, para dibujar el formulario del panel. */
export const SITE_TEXT_FIELDS: { key: keyof SiteTexts; label: string; group: string; long?: boolean }[] = [
  { key: "navCatalog", label: "Barra superior · Catálogo", group: "Barra superior" },
  { key: "navQuiz", label: "Barra superior · Encontrá tu aroma", group: "Barra superior" },
  { key: "navOffers", label: "Barra superior · Ofertas", group: "Barra superior" },
  { key: "navSale", label: "Barra superior · Rebajas", group: "Barra superior" },
  { key: "navWishlist", label: "Barra superior · Lista de deseos", group: "Barra superior" },
  { key: "navReservations", label: "Barra superior · Mis reservas", group: "Barra superior" },
  { key: "navAccount", label: "Barra superior · Mi cuenta", group: "Barra superior" },
  { key: "navProfile", label: "Barra superior · Mi perfil", group: "Barra superior" },
  { key: "navLogin", label: "Barra superior · botón Ingresar", group: "Barra superior" },
  { key: "navLogout", label: "Barra superior · botón Cerrar sesión", group: "Barra superior" },
  { key: "navPanel", label: "Barra superior · botón Panel (admin)", group: "Barra superior" },

  { key: "heroCta", label: "Portada · botón principal", group: "Portada" },
  { key: "catalogTitle", label: "Catálogo · título", group: "Portada" },
  { key: "catalogIntro", label: "Catálogo · texto de ayuda", group: "Portada", long: true },
  { key: "offerTitle", label: "Ofertas · título", group: "Portada" },
  { key: "offerSubtitle", label: "Ofertas · subtítulo", group: "Portada", long: true },
  { key: "offerLink", label: "Ofertas · enlace 'ver todas'", group: "Portada" },
  { key: "saleTitle", label: "Rebajas · título", group: "Portada" },
  { key: "saleIntro", label: "Rebajas · subtítulo", group: "Portada", long: true },
  { key: "reviewsTitle", label: "Opiniones · título", group: "Portada" },
  { key: "paymentsTitle", label: "Formas de pago · título", group: "Portada" },
  { key: "paymentsIntro", label: "Formas de pago · texto", group: "Portada", long: true },

  { key: "footerAbout", label: "Pie · frase de la tienda", group: "Pie de página", long: true },
  { key: "footerStoreHeading", label: "Pie · título de la columna de enlaces", group: "Pie de página" },
  { key: "footerWhatsappLabel", label: "Pie · rótulo de WhatsApp", group: "Pie de página" },
];

/**
 * Mezcla lo guardado con los valores por defecto: sólo acepta cadenas con
 * contenido real, así un campo vacío nunca rompe la web.
 */
export function resolveSiteTexts(raw: unknown): SiteTexts {
  const base: SiteTexts = { ...DEFAULT_SITE_TEXTS };
  if (!raw || typeof raw !== "object") return base;
  const obj = raw as Record<string, unknown>;
  for (const key of Object.keys(DEFAULT_SITE_TEXTS) as (keyof SiteTexts)[]) {
    const value = obj[key];
    if (typeof value === "string" && value.trim().length > 0) {
      base[key] = value.trim();
    }
  }
  return base;
}

/** Devuelve sólo las claves conocidas y no vacías, listas para guardar. */
export function sanitizeSiteTexts(raw: unknown): Partial<SiteTexts> {
  const out: Partial<SiteTexts> = {};
  if (!raw || typeof raw !== "object") return out;
  const obj = raw as Record<string, unknown>;
  for (const key of Object.keys(DEFAULT_SITE_TEXTS) as (keyof SiteTexts)[]) {
    const value = obj[key];
    if (typeof value === "string") out[key] = value.trim().slice(0, 400);
  }
  return out;
}
