// `web-push` es CommonJS y sus tipos solo declaran exports con nombre; importarlo
// como default provoca "does not contain a default export" en el build.
import * as webpush from "web-push";
import { prisma } from "./db";

/**
 * Web Push para avisar a los administradores de una reserva nueva.
 *
 * Las claves VAPID se generan solas la primera vez y se guardan en la fila de
 * ajustes, así que activar los avisos desde el panel no requiere tocar variables
 * de entorno. Si el deploy prefiere inyectarlas por entorno, esas tienen
 * prioridad (VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY / VAPID_SUBJECT).
 */

type Vapid = { publicKey: string; privateKey: string };

const FALLBACK_SUBJECT = "mailto:avisos@example.com";

/**
 * Devuelve las claves VAPID, creándolas y guardándolas si todavía no existen.
 * Devuelve null solo si la base falla, para no romper la petición del panel.
 */
export async function getVapidKeys(): Promise<Vapid | null> {
  const envPublic = process.env.VAPID_PUBLIC_KEY?.trim();
  const envPrivate = process.env.VAPID_PRIVATE_KEY?.trim();
  if (envPublic && envPrivate) return { publicKey: envPublic, privateKey: envPrivate };

  try {
    const row = await prisma.storeSettings.findUnique({
      where: { id: "singleton" },
      select: { vapidPublicKey: true, vapidPrivateKey: true },
    });
    if (row?.vapidPublicKey && row?.vapidPrivateKey) {
      return { publicKey: row.vapidPublicKey, privateKey: row.vapidPrivateKey };
    }

    const generated = webpush.generateVAPIDKeys();
    await prisma.storeSettings.upsert({
      where: { id: "singleton" },
      update: {
        vapidPublicKey: generated.publicKey,
        vapidPrivateKey: generated.privateKey,
      },
      create: {
        id: "singleton",
        vapidPublicKey: generated.publicKey,
        vapidPrivateKey: generated.privateKey,
      },
    });
    return generated;
  } catch (error) {
    console.error("[push] no se pudieron obtener las claves:", (error as Error).message);
    return null;
  }
}

function configure(keys: Vapid) {
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT?.trim() || FALLBACK_SUBJECT,
    keys.publicKey,
    keys.privateKey,
  );
}

export type PushPayload = {
  title: string;
  body: string;
  url?: string;
  tag?: string;
};

/**
 * Envía la notificación a todos los dispositivos suscritos de los
 * administradores. Las suscripciones muertas (404/410) se borran para que la
 * lista no crezca con basura.
 */
export async function notifyAdmins(payload: PushPayload): Promise<void> {
  try {
    const keys = await getVapidKeys();
    if (!keys) return;
    configure(keys);

    const subs = await prisma.pushSubscription.findMany({
      where: { user: { role: "ADMIN" } },
      select: { id: true, endpoint: true, p256dh: true, auth: true },
    });
    if (!subs.length) return;

    const body = JSON.stringify(payload);
    await Promise.all(
      subs.map(async (sub) => {
        try {
          await webpush.sendNotification(
            { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
            body,
            { TTL: 60 * 60 * 24 },
          );
        } catch (error) {
          const status = (error as { statusCode?: number }).statusCode;
          if (status === 404 || status === 410) {
            await prisma.pushSubscription.delete({ where: { id: sub.id } }).catch(() => {});
          } else {
            console.error("[push] envío fallido:", (error as Error).message);
          }
        }
      }),
    );
  } catch (error) {
    // El aviso es un extra: una reserva nunca puede fallar porque el push falle.
    console.error("[push] error general:", (error as Error).message);
  }
}
