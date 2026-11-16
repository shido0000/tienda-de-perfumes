/**
 * Plantillas de WhatsApp para la tienda.
 *
 * El panel abre WhatsApp (`https://wa.me/<numero>?text=…`) con el mensaje ya
 * escrito, así el dueño no reescribe lo mismo veinte veces por semana. Al ser
 * un enlace no hace falta ninguna API de pago: se abre el WhatsApp del propio
 * teléfono o el WhatsApp Web y el mensaje aparece listo para enviar.
 */

import { formatMoney } from "@/lib/currency";

export type TemplateKind =
  | "ready"
  | "pickupReminder"
  | "proofReminder"
  | "shipped"
  | "thanks"
  | "backInStock";

export const TEMPLATE_LABEL: Record<TemplateKind, string> = {
  ready: "Lista para retirar",
  pickupReminder: "Recordar retiro",
  proofReminder: "Recordar comprobante",
  shipped: "Salió el envío",
  thanks: "Gracias por la compra",
  backInStock: "Volvió el stock",
};

export type TemplateContext = {
  customerName?: string | null;
  productNames?: string | null;
  code?: string | null;
  storeName?: string | null;
  storeAddress?: string | null;
  total?: number | null;
  currency?: string | null;
};

const first = (name?: string | null) => (name ?? "").trim().split(/\s+/)[0] || "hola";

/** Solo dígitos, con código de país, para wa.me. */
export function waNumber(phone: string | null | undefined): string {
  return (phone ?? "").replace(/[^\d]/g, "");
}

export function waLink(phone: string | null | undefined, text: string): string {
  const n = waNumber(phone);
  return `https://wa.me/${n}?text=${encodeURIComponent(text)}`;
}

export function buildTemplate(kind: TemplateKind, ctx: TemplateContext): string {
  const who = first(ctx.customerName);
  const store = ctx.storeName?.trim() || "la tienda";
  const product = ctx.productNames?.trim() || "tu pedido";
  const code = ctx.code ? ` (${ctx.code})` : "";
  const money =
    ctx.total != null && ctx.currency
      ? formatMoney(ctx.total, ctx.currency)
      : null;

  switch (kind) {
    case "ready":
      return `Hola ${who}, tu reserva de ${product}${code} está lista para retirar en ${
        ctx.storeAddress || store
      }. Te esperamos. — ${store}`;
    case "pickupReminder":
      return `Hola ${who}, tu reserva de ${product}${code} sigue esperándote en ${
        ctx.storeAddress || store
      }. Si ya no la querés, avisanos y liberamos el stock; si la querés, te la guardamos unos días más. — ${store}`;
    case "proofReminder":
      return `Hola ${who}, quedó pendiente el comprobante de tu reserva de ${product}${code}. Cuando lo tengas, envianoslo por aquí para confirmarla. — ${store}`;
    case "shipped":
      return `Hola ${who}, tu pedido de ${product}${code} ya salió. Coordinamos la entrega por este mismo chat. — ${store}`;
    case "thanks":
      return `Gracias ${who} por tu compra${money ? ` de ${money}` : ""}. Que disfrutes ${product}. Cualquier cosa, escribinos. — ${store}`;
    case "backInStock":
      return `Hola ${who}, volvió el stock de ${product}. Si todavía lo querés, reservalo en la web y te lo apartamos. — ${store}`;
    default:
      return `Hola ${who}.`;
  }
}
