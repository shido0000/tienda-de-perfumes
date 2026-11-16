/**
 * Base de rutas para los recursos propios de la app (`/api/img/...`, `/api/logo`,
 * etc.). En producción (Vercel, dominio raíz) es una cadena vacía y las rutas
 * quedan como `/api/...`. Cuando la app corre detrás de un proxy de vista previa
 * que la publica bajo un prefijo de ruta (p. ej. `/api/v1/workspaces/<ws>/preview/3000/`),
 * el navegador sí resuelve las rutas raíz contra ese prefijo, por eso aquí
 * devolvemos el prefijo detectado en el cliente.
 *
 * En el servidor devuelve "" (el HTML plano lo reescribe el proxy). Así el HTML
 * generado por el cliente coincide con el HTML ya reescrito del servidor, lo que
 * evita el desajuste de hidratación de React y hace que las imágenes carguen.
 */
export function previewBase(): string {
  if (typeof window === "undefined") return "";
  const m = window.location.pathname.match(/^(.*?\/preview\/\d+)(?:\/|$)/);
  return m ? m[1] : "";
}

/** Prefija una ruta absoluta propia con la base de vista previa si corresponde. */
export function asset(path: string): string {
  if (!path) return path;
  if (/^[a-z]+:\/\//i.test(path) || path.startsWith("data:")) return path;
  const base = previewBase();
  if (!base || !path.startsWith("/")) return path;
  return base + path;
}
