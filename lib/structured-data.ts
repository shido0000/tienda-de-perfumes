import type { SettingsDTO } from "./settings";

/**
 * Crea el JSON-LD de la tienda para Google.
 *
 * `Store` + `WebSite` con el buscador del catálogo: es lo que permite que
 * Google muestre la ficha de la perfumería (nombre, dirección, teléfono,
 * horario de atención por WhatsApp) en los resultados de búsqueda.
 *
 * Se generan los datos desde los ajustes, así que el dueño los cambia desde el
 * panel y el SEO se actualiza solo.
 */
export function storeJsonLd(settings: SettingsDTO, baseUrl?: string) {
  const url =
    (baseUrl ?? settings.siteUrl?.trim().replace(/\/+$/, "")) || undefined;

  // El logo suele ser una data URL base64; si la incrustamos en el JSON-LD
  // cada página pesaba ~22 KB de más. Apuntamos a /api/logo (cacheable) cuando
  // el logo es base64, y usamos la URL tal cual si es externa.
  const logoRef =
    settings.logoUrl && settings.logoUrl.startsWith("data:")
      ? url
        ? `${url}/api/logo`
        : "/api/logo"
      : settings.logoUrl ?? undefined;

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Store",
        "@id": url ? `${url}#store` : undefined,
        name: settings.brand,
        description: settings.seoDescription,
        slogan: settings.tagline || undefined,
        url,
        // Si el logo es base64, apuntamos a la ruta cacheable en vez de incrustar
        // el base64 dentro del JSON-LD (inflaba cada página ~22 KB).
        image: logoRef,
        logo: logoRef,
        telephone: settings.whatsappDisplay || `+${settings.whatsapp}`,
        address: {
          "@type": "PostalAddress",
          streetAddress: settings.storeAddress,
          addressCountry: "CU",
        },
        geo:
          settings.storeLat && settings.storeLng
            ? {
                "@type": "GeoCoordinates",
                latitude: settings.storeLat,
                longitude: settings.storeLng,
              }
            : undefined,
        currenciesAccepted: settings.currencies.map((c) => c.code).join(", "),
        paymentAccepted: "Efectivo, Transferencia bancaria",
        areaServed: "La Habana, Cuba",
        sameAs: settings.whatsapp ? [`https://wa.me/${settings.whatsapp}`] : undefined,
      },
      {
        "@type": "WebSite",
        url,
        name: settings.brand,
        inLanguage: "es",
        potentialAction: url
          ? {
              "@type": "SearchAction",
              target: `${url}/catalogo?q={search_term_string}`,
              "query-input": "required name=search_term_string",
            }
          : undefined,
      },
    ],
  };
}

/** Ficha de un producto, para que Google la muestre con precio y stock. */
export function productJsonLd(
  product: {
    id: string;
    name: string;
    brand: string;
    description: string;
    images: string[];
    price: number;
    currency: string;
    stock: number | null;
  },
  settings: SettingsDTO,
) {
  const base = settings.siteUrl?.trim().replace(/\/+$/, "") ?? "";
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    brand: { "@type": "Brand", name: product.brand },
    description: product.description,
    image: (() => {
      // Nunca meter base64 dentro del JSON-LD: inflaba el HTML de la portada
      // con ~90 KB de imágenes que los buscadores no necesitan. Si la galería
      // viene en data: URL, la omitimos del datos estructurados; las fotos se
      // sirven aparte (cacheables) en /api/img/...
      const usable = (product.images ?? []).filter((u) => !String(u).startsWith("data:"));
      return usable.length ? usable : undefined;
    })(),
    url: base ? `${base}/producto/${product.id}` : undefined,
    offers: {
      "@type": "Offer",
      price: product.price,
      priceCurrency: product.currency,
      availability:
        product.stock === null || product.stock > 0
          ? "https://schema.org/InStock"
          : "https://schema.org/OutOfStock",
      seller: { "@type": "Organization", name: settings.brand },
      url: base ? `${base}/producto/${product.id}` : undefined,
    },
  };
}
