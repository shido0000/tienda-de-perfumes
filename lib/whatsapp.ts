import { prisma } from "./db";
import { parseJson } from "./json";

/**
 * Aviso de reserva por WhatsApp.
 *
 * Un servidor no puede "escribir" a un número por su cuenta: WhatsApp exige la
 * API Cloud (token + id de teléfono emisor). Si esas credenciales existen en el
 * entorno, se envía el mensaje real. Si no existen, se deja registrado en el
 * log y el panel de administración muestra la reserva con un enlace listo para
 * enviar el mismo texto a mano por wa.me — nunca se inventa un envío.
 */
export type ReservationNotice = {
  code: string;
  customerName: string;
  customerEmail: string;
  total: number;
  currency: string;
  deliveryType: string;
  paymentMethod: string;
  items: { name: string; quantity: number }[];
};

export function buildNoticeText(n: ReservationNotice): string {
  const entrega = n.deliveryType === "DELIVERY" ? "Envío a domicilio" : "Retiro en tienda";
  const pago = n.paymentMethod === "TRANSFER" ? "Transferencia" : "Efectivo";
  const lines = n.items.map((i) => `• ${i.quantity}× ${i.name}`).join("\n");
  return [
    `Nueva reserva ${n.code}`,
    `Cliente: ${n.customerName || n.customerEmail}`,
    `Total: ${n.currency} ${n.total.toFixed(2)}`,
    `Entrega: ${entrega}`,
    `Pago: ${pago}`,
    "",
    lines,
  ].join("\n");
}

export function waLink(phone: string, text: string): string {
  return `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
}

/**
 * Intenta avisar a todos los números configurados.
 * Devuelve las vías que realmente se usaron, para que la UI pueda ser honesta.
 */
export async function notifyReservation(notice: ReservationNotice): Promise<{
  sent: number;
  channels: "cloud-api" | "link-only";
  text: string;
}> {
  const text = buildNoticeText(notice);
  let phones: string[] = [];
  try {
    const row = await prisma.storeSettings.findUnique({ where: { id: "singleton" } });
    const raw = parseJson<unknown>(row?.notificationPhones, []);
    if (Array.isArray(raw)) phones = raw.map((p) => String(p).replace(/[^\d]/g, "")).filter(Boolean);
    if (!phones.length && row?.whatsapp) phones = [row.whatsapp.replace(/[^\d]/g, "")];
  } catch {
    /* sin base: no hay a quién avisar */
  }

  const token = process.env.WHATSAPP_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_ID;
  if (!token || !phoneId || phones.length === 0) {
    console.info(`[whatsapp] aviso pendiente para ${notice.code} (sin credenciales de la API Cloud)`);
    return { sent: 0, channels: "link-only", text };
  }

  let sent = 0;
  for (const to of phones) {
    try {
      const res = await fetch(`https://graph.facebook.com/v20.0/${phoneId}/messages`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to,
          type: "text",
          text: { body: text },
        }),
      });
      if (res.ok) sent++;
      else console.error("[whatsapp] respuesta", res.status, await res.text());
    } catch (e) {
      console.error("[whatsapp] error de red", (e as Error).message);
    }
  }
  return { sent, channels: sent > 0 ? "cloud-api" : "link-only", text };
}
