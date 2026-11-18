/**
 * Íconos de la app instalable (PWA).
 *
 * El dueño elige el logo de la web en Administración → Contenido → Identidad.
 * Ese mismo logo es el que debe aparecer en la pantalla de inicio del móvil,
 * no el ícono genérico de la plantilla. Como el logo se guarda en la base como
 * data URL (base64) o como URL externa, acá lo traducimos a una ruta que el
 * navegador pueda descargar: `/api/logo` sirve el logo con su tipo real y
 * cachea un año, así el manifest y el apple-touch-icon pueden apuntarle.
 */

export type PwaIcon = {
  src: string;
  sizes: string;
  type: string;
  purpose?: string;
};

const DEFAULT_ICONS: PwaIcon[] = [
  { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
  { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
  {
    src: "/icons/icon-maskable-512.png",
    sizes: "512x512",
    type: "image/png",
    purpose: "maskable",
  },
];

const DATA_URL = /^data:(image\/[a-zA-Z0-9.+-]+);base64,/;

/** Tipo MIME del logo, para declararlo en el manifest. */
function logoMime(logoUrl: string): string {
  const data = DATA_URL.exec(logoUrl);
  if (data) return data[1];
  if (/\.png(\?|$)/i.test(logoUrl)) return "image/png";
  if (/\.webp(\?|$)/i.test(logoUrl)) return "image/webp";
  if (/\.jpe?g(\?|$)/i.test(logoUrl)) return "image/jpeg";
  if (/\.svg(\?|$)/i.test(logoUrl)) return "image/svg+xml";
  return "image/png";
}

/** Ruta pública desde la que el navegador descarga el logo. */
export function logoSrc(logoUrl: string): string {
  return logoUrl.startsWith("data:") ? "/api/logo" : logoUrl;
}

/**
 * Lista de íconos del manifest. Si hay logo, va PRIMERO (Chrome usa el primero
 * que sirva para el tamaño) y los de respaldo quedan detrás por si el logo no
 * es cuadrado. Con el logo como `/api/logo` funciona igual con base64 o URL.
 */
export function manifestIcons(logoUrl: string | null | undefined): PwaIcon[] {
  const raw = (logoUrl ?? "").trim();
  if (!raw) return DEFAULT_ICONS;
  const src = logoSrc(raw);
  const type = logoMime(raw);
  // Declaramos el logo en los dos tamaños que Android/Chrome piden para
  // instalar la app, para que use el logo y no el ícono por defecto.
  const logo: PwaIcon[] = [
    { src, sizes: "192x192", type, purpose: "any" },
    { src, sizes: "512x512", type, purpose: "any" },
    { src, sizes: "any", type, purpose: "any" },
    // Android recorta el ícono en su forma; declaramos el logo también como
    // "maskable" para que el sistema use el logo elegido y no otro. El
    // propósito combinado "any maskable" lo acepta Chrome e iOS.
    { src, sizes: "512x512", type, purpose: "maskable" },
  ];
  return [...logo, ...DEFAULT_ICONS];
}

/** El logo como apple-touch-icon (iOS ignora el manifest para ese ícono). */
export function appleTouchIcon(logoUrl: string | null | undefined): string {
  const raw = (logoUrl ?? "").trim();
  return raw ? logoSrc(raw) : "/icons/apple-touch-icon.png";
}
