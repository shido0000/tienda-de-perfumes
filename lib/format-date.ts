/**
 * Fechas con formato fijo (dd/mm/aaaa, hh:mm), sin `Intl`.
 *
 * Igual que con el dinero: el servidor de Node y el navegador no siempre
 * formatean igual con `toLocaleDateString("es-CU")`, y cualquier diferencia
 * rompe la hidratación de React (la página cae con "client-side exception").
 */
const MONTHS = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
];

function pad(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

function toDate(value: string | Date): Date | null {
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** `21/03/2026` */
export function formatDate(value: string | Date): string {
  const d = toDate(value);
  if (!d) return "—";
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
}

/** `21/03/2026, 14:05` */
export function formatDateTime(value: string | Date): string {
  const d = toDate(value);
  if (!d) return "—";
  return `${formatDate(d)}, ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** `21 de marzo de 2026` */
export function formatLongDate(value: string | Date): string {
  const d = toDate(value);
  if (!d) return "—";
  return `${d.getDate()} de ${MONTHS[d.getMonth()]} de ${d.getFullYear()}`;
}
