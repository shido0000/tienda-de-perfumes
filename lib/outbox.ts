/**
 * Cola de mensajes automáticos.
 *
 * Regla de oro: **primero se guarda, después se envía**. Todo aviso nace como
 * una fila PENDING de `OutboxMessage`; recién después se intenta la entrega. Así
 * un fallo del proveedor (o un deploy sin claves) no borra el aviso: queda en la
 * cola con el motivo escrito y se puede reintentar desde el panel.
 *
 * Nada se "finge": si el canal no está configurado, el mensaje queda SKIPPED con
 * el motivo, y si el proveedor lo rechaza queda FAILED con el mensaje del
 * proveedor.
 */
import { prisma } from "./db";
import { sendEmail } from "./email";

export type OutboxChannel = "EMAIL" | "WHATSAPP" | "PUSH";
export type OutboxKind = "RESTOCK" | "REPURCHASE" | "CAMPAIGN" | "MANUAL" | "LAUNCH";

export type EnqueueInput = {
  kind: OutboxKind;
  channel: OutboxChannel;
  recipient: string;
  subject?: string;
  body: string;
  /** Evita duplicados: si ya existe, no se crea otra fila. */
  dedupeKey?: string;
};

/** Normaliza un teléfono a solo dígitos. */
export function normalizePhone(raw: string): string {
  return String(raw ?? "").replace(/[^\d]/g, "");
}

/**
 * Encola un mensaje. Si la clave de deduplicación ya existe, devuelve la fila
 * existente sin crear otra (idempotente: reponer stock dos veces no manda dos
 * avisos).
 */
export async function enqueue(input: EnqueueInput) {
  const recipient = input.channel === "EMAIL" ? input.recipient.trim() : normalizePhone(input.recipient);
  if (!recipient) return null;

  try {
    if (input.dedupeKey) {
      const existing = await prisma.outboxMessage.findUnique({
        where: { dedupeKey: input.dedupeKey },
        select: { id: true },
      });
      if (existing) return existing;
    }
    return await prisma.outboxMessage.create({
      data: {
        kind: input.kind,
        channel: input.channel,
        recipient,
        subject: input.subject ?? "",
        body: input.body,
        dedupeKey: input.dedupeKey ?? null,
      },
      select: { id: true },
    });
  } catch (error) {
    // P2002 = alguien encoló lo mismo en paralelo: no es un error real.
    if ((error as { code?: string }).code === "P2002") return null;
    console.error("[outbox] no se pudo encolar:", (error as Error).message);
    return null;
  }
}

/** Envía un texto por WhatsApp Cloud API. Devuelve el error real si lo hay. */
async function sendWhatsApp(
  to: string,
  body: string,
): Promise<{ ok: boolean; configured: boolean; reason?: string }> {
  const token = process.env.WHATSAPP_TOKEN?.trim();
  const phoneId = process.env.WHATSAPP_PHONE_ID?.trim();
  if (!token || !phoneId) {
    return {
      ok: false,
      configured: false,
      reason:
        "No hay credenciales de WhatsApp Cloud API (WHATSAPP_TOKEN / WHATSAPP_PHONE_ID).",
    };
  }
  try {
    const res = await fetch(`https://graph.facebook.com/v20.0/${phoneId}/messages`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to,
        type: "text",
        text: { body },
      }),
    });
    if (res.ok) return { ok: true, configured: true };
    const detail = await res.text().catch(() => "");
    return { ok: false, configured: true, reason: `WhatsApp ${res.status}: ${detail.slice(0, 200)}` };
  } catch (error) {
    return { ok: false, configured: true, reason: (error as Error).message };
  }
}

/**
 * Push a un cliente concreto. El `recipient` es el id del User; sus dispositivos
 * son las filas de PushSubscription de ese usuario.
 */
async function sendPushToUser(
  userId: string,
  subject: string,
  body: string,
): Promise<{ ok: boolean; configured: boolean; reason?: string }> {
  // Import diferido: `web-push` solo se carga cuando de verdad hace falta.
  const { sendPushToUser: pushToUser } = await import("./push-user");
  return pushToUser(userId, body, { title: subject || "Mist & Mood", url: "/mi-cuenta" });
}

/**
 * Procesa la cola. Devuelve un resumen de lo que pasó.
 *
 * `limit` acota cuántos mensajes se intentan por corrida (el cron de Vercel
 * tiene 10 s en el plan gratuito, así que conviene ir en tandas).
 */
export async function processOutbox(limit = 40): Promise<{
  sent: number;
  failed: number;
  skipped: number;
}> {
  const pending = await prisma.outboxMessage.findMany({
    where: { status: "PENDING" },
    orderBy: { createdAt: "asc" },
    take: limit,
  });

  let sent = 0;
  let failed = 0;
  let skipped = 0;

  for (const msg of pending) {
    let result: { ok: boolean; configured: boolean; reason?: string };

    if (msg.channel === "EMAIL") {
      const r = await sendEmail({ to: msg.recipient, subject: msg.subject, text: msg.body });
      result = { ok: r.ok, configured: r.ok ? true : r.configured, reason: r.ok ? undefined : r.reason };
    } else if (msg.channel === "WHATSAPP") {
      result = await sendWhatsApp(msg.recipient, msg.body);
    } else {
      result = await sendPushToUser(msg.recipient, msg.subject, msg.body);
    }

    if (result.ok) {
      sent++;
      await prisma.outboxMessage.update({
        where: { id: msg.id },
        data: { status: "SENT", sentAt: new Date(), attempts: { increment: 1 }, error: null },
      });
    } else if (result.configured) {
      // El canal existe pero el proveedor rechazó: se reintenta más adelante.
      failed++;
      await prisma.outboxMessage.update({
        where: { id: msg.id },
        data: {
          status: "FAILED",
          attempts: { increment: 1 },
          error: (result.reason ?? "Error desconocido").slice(0, 500),
        },
      });
    } else {
      // Sin canal configurado: no tiene sentido reintentar solo.
      skipped++;
      await prisma.outboxMessage.update({
        where: { id: msg.id },
        data: {
          status: "SKIPPED",
          attempts: { increment: 1 },
          error: (result.reason ?? "Canal no configurado").slice(0, 500),
        },
      });
    }
  }

  return { sent, failed, skipped };
}

/** Devuelve un mensaje FAILED o SKIPPED a la cola para reintentarlo. */
export async function retryMessage(id: string) {
  return prisma.outboxMessage.update({
    where: { id },
    data: { status: "PENDING", error: null },
  });
}
