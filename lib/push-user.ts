/**
 * Web Push a un cliente concreto.
 *
 * `lib/push.ts` avisa a los ADMINISTRADORES (reserva nueva). Este módulo hace lo
 * mismo pero hacia un usuario cualquiera: se usa cuando vuelve un perfume que
 * ese cliente estaba esperando, o para el recordatorio de reposición.
 *
 * Si el cliente no activó las notificaciones en su dispositivo, no hay
 * suscripciones y se devuelve `configured: false` — el mensaje queda en la cola
 * como SKIPPED con el motivo, no se finge un envío.
 */
import * as webpush from "web-push";
import { prisma } from "./db";
import { getVapidKeys } from "./push";

const FALLBACK_SUBJECT = "mailto:avisos@example.com";

export type PushToUserResult = {
  ok: boolean;
  /** false = el cliente no tiene ningún dispositivo suscrito. */
  configured: boolean;
  reason?: string;
};

export async function sendPushToUser(
  userId: string,
  body: string,
  opts: { title?: string; url?: string; tag?: string } = {},
): Promise<PushToUserResult> {
  try {
    const subs = await prisma.pushSubscription.findMany({
      where: { userId },
      select: { id: true, endpoint: true, p256dh: true, auth: true },
    });
    if (!subs.length) {
      return {
        ok: false,
        configured: false,
        reason: "El cliente no tiene notificaciones activadas en ningún dispositivo.",
      };
    }

    const keys = await getVapidKeys();
    if (!keys) {
      return { ok: false, configured: false, reason: "No se pudieron generar las claves VAPID." };
    }
    webpush.setVapidDetails(
      process.env.VAPID_SUBJECT?.trim() || FALLBACK_SUBJECT,
      keys.publicKey,
      keys.privateKey,
    );

    const payload = JSON.stringify({
      title: opts.title || "Mist & Mood",
      body,
      url: opts.url || "/mi-cuenta",
      tag: opts.tag,
    });

    let delivered = 0;
    let lastError: string | undefined;

    for (const sub of subs) {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payload,
          { TTL: 60 * 60 * 24 * 3 },
        );
        delivered++;
      } catch (error) {
        const status = (error as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) {
          // Suscripción muerta (app desinstalada): se borra y se sigue.
          await prisma.pushSubscription.delete({ where: { id: sub.id } }).catch(() => {});
        } else {
          lastError = (error as Error).message;
        }
      }
    }

    if (delivered > 0) return { ok: true, configured: true };
    return {
      ok: false,
      configured: true,
      reason: lastError ? `Push falló: ${lastError.slice(0, 200)}` : "Ningún dispositivo aceptó el aviso.",
    };
  } catch (error) {
    return { ok: false, configured: true, reason: (error as Error).message };
  }
}
