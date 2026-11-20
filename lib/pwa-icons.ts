/**
 * Íconos de la app instalable (PWA).
 *
 * El dueño elige el logo de la web en Administración → Contenido → Identidad.
 * Ese mismo logo es el que debe aparecer en la pantalla de inicio del móvil,
 * no el ícono genérico de la plantilla.
 *
 * El logo se guarda en la base como data URL (base64) o como URL externa, así
 * que acá lo traducimos a una ruta que el navegador pueda descargar:
 * `/api/logo`.
 *
 * ACTUALIZACIÓN AUTOMÁTICA DEL ÍCONO
 * ----------------------------------
 * Los navegadores cachean los íconos de una app instalada con mucha fuerza: si
 * la URL es siempre `"/api/logo"`, al cambiar el logo el móvil sigue mostrando
 * el viejo durante días (o hasta reinstalar). Por eso cada URL lleva un
 * `?v=<hash del logo>`: cuando el dueño sube otro logo, cambia el hash, cambia
 * la URL, y el sistema operativo descarga el ícono nuevo por su cuenta la
 * próxima vez que revisa el manifiesto.
 */

export type PwaIcon = {
  src: string;
  sizes: string;
  type: string;
  purpose?: "any" | "maskable";
};

/** Íconos de la plantilla, usados mientras el dueño no subió un logo. */
const FALLBACK_ICONS: PwaIcon[] = [
  { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
  { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
  { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
];

const FALLBACK_APPLE = "/icons/apple-touch-icon.png";

/**
 * Huella corta del logo. Cambia apenas cambia la imagen, así las URLs de los
 * íconos cambian con ella (y con ellas la caché del navegador).
 */
export function logoVersion(logoUrl?: string | null): string {
  if (!logoUrl) return "0";
  // FNV-1a de 32 bits: suficiente para distinguir dos logos y estable entre
  // servidor y cliente (no depende de crypto ni de la longitud del texto).
  let hash = 2166136261;
  for (let i = 0; i < logoUrl.length; i++) {
    hash ^= logoUrl.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

/** URL descargable del logo, versionada para que el ícono se refresque solo. */
export function logoSrc(logoUrl?: string | null): string {
  const raw = (logoUrl ?? "").trim();
  if (!raw) return "";
  const base = raw.startsWith("data:") ? "/api/logo" : raw;
  const sep = base.includes("?") ? "&" : "?";
  return `${base}${sep}v=${logoVersion(raw)}`;
}

/**
 * Íconos del manifiesto. Con logo propio se usa ESE logo en todos los tamaños;
 * sin logo, los de la plantilla. Cada URL pide al servidor el tamaño exacto, así
 * el ícono instalado nunca sale deformado.
 */
export function manifestIcons(logoUrl?: string | null): PwaIcon[] {
  const raw = (logoUrl ?? "").trim();
  if (!raw) return FALLBACK_ICONS;

  // Logo externo (una URL): no podemos redimensionarlo, se usa tal cual.
  if (!raw.startsWith("data:")) {
    const type = /\.svg(\?|#|$)/i.test(raw)
      ? "image/svg+xml"
      : /\.webp(\?|#|$)/i.test(raw)
        ? "image/webp"
        : /\.jpe?g(\?|#|$)/i.test(raw)
          ? "image/jpeg"
          : "image/png";
    return [{ src: raw, sizes: "512x512", type, purpose: "any" }];
  }

  const base = logoSrc(raw);

  return [
    { src: `${base}&size=192`, sizes: "192x192", type: "image/png", purpose: "any" },
    { src: `${base}&size=512`, sizes: "512x512", type: "image/png", purpose: "any" },
    // "maskable": Android recorta el ícono con una forma. El margen evita que
    // se coma los bordes del logo.
    { src: `${base}&size=512&pad=12`, sizes: "512x512", type: "image/png", purpose: "maskable" },
  ];
}

/** Ícono que usa iOS al "Agregar a pantalla de inicio" (180×180, sin margen). */
export function appleTouchIcon(logoUrl?: string | null): string {
  const raw = (logoUrl ?? "").trim();
  return raw ? `${logoSrc(raw)}&size=180` : FALLBACK_APPLE;
}
