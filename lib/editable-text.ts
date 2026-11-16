/**
 * Textos editables desde Administración → Contenido.
 *
 * El panel guarda lo que el dueño escribe. Si por error queda un valor con una
 * sola letra ("s"), dos caracteres o sólo signos, la portada mostraba esa letra
 * suelta debajo del titular. Esta función sólo acepta texto legible y, si no lo
 * es, devuelve el texto por defecto de la página.
 */
export function cleanEditableText(
  value: string | null | undefined,
  fallback: string,
): string {
  const v = (value ?? "").trim();
  if (v.length < 3) return fallback;
  // Debe contener al menos una palabra de tres letras o más.
  if (!/[a-záéíóúñü]{3,}/i.test(v)) return fallback;
  return v;
}
