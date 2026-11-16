/**
 * Avisos que se disparan SOLOS cuando vuelve el stock.
 *
 * En cuanto un perfume pasa de 0 unidades a tener stock, cada persona de la
 * lista de espera recibe —sin que nadie toque nada— su aviso por los canales que
 * haya dejado (correo, WhatsApp y/o notificación en el teléfono). El envío real
 * pasa por la cola `OutboxMessage`, así que si un canal no está configurado el
 * mensaje no se pierde: queda en el panel listo para reintentar.
 *
 * Además se devuelve la lista de contactos para que el panel siga ofreciendo el
 * botón de WhatsApp a mano como plan B.
 */

import { prisma } from "./db";
import { notifyAdmins } from "./push";
import { enqueue, processOutbox } from "./outbox";

export type RestockNotice = {
  alertId: string;
  productId: string;
  productName: string;
  name: string | null;
  email: string | null;
  phone: string | null;
};

/**
 * Se llama después de guardar un producto. Si pasó de 0 unidades a tener stock,
 * marca todos los avisos NEW de ese producto como NOTIFIED, encola el mensaje
 * automático de cada persona y devuelve a quién hay que escribirle.
 */
export async function handleRestock(opts: {
  productId: string;
  productName: string;
  previousStock: number | null | undefined;
  nextStock: number | null | undefined;
}): Promise<RestockNotice[]> {
  const prev = opts.previousStock ?? 0;
  const next = opts.nextStock ?? 0;
  if (prev > 0 || next <= 0) return [];

  try {
    // Interruptor maestro del panel: si el dueño apagó los avisos automáticos
    // de reposición, no se manda nada (los contactos quedan en la lista).
    const master = await prisma.storeSettings
      .findUnique({ where: { id: "singleton" }, select: { autoRestockEnabled: true } })
      .catch(() => null);
    if (master && master.autoRestockEnabled === false) return [];

    const alerts = await prisma.stockAlert.findMany({
      where: { productId: opts.productId, status: "NEW" },
      orderBy: { createdAt: "asc" },
      select: { id: true, name: true, email: true, phone: true, userId: true },
    });
    if (!alerts.length) return [];

    await prisma.stockAlert.updateMany({
      where: { id: { in: alerts.map((a) => a.id) } },
      data: { status: "NOTIFIED", notifiedAt: new Date() },
    });

    // La tienda y los ajustes, para que el mensaje salga con los datos reales
    // (nombre de la tienda, dirección de retiro, WhatsApp) y no con textos fijos.
    const settings = await prisma.storeSettings
      .findUnique({ where: { id: "singleton" } })
      .catch(() => null);
    const brand = settings?.brand?.trim() || "Mist & Mood";
    const whatsapp = (settings?.whatsapp || "").replace(/[^\d]/g, "");
    const address = settings?.storeAddress || "";

    for (const alert of alerts) {
      const who = alert.name?.trim() || "Hola";
      const subject = `Volvió ${opts.productName} · ${brand}`;
      const body = [
        `${who},`,
        `te avisamos porque estabas esperando "${opts.productName}" y ya volvió a estar disponible.`,
        `Quedan ${next} ${next === 1 ? "unidad" : "unidades"} en stock, así que conviene reservar pronto.`,
        address ? `Podés retirarlo en ${address} o pedir envío a domicilio.` : "",
        whatsapp ? `Cualquier duda, escribinos por WhatsApp: +${whatsapp}` : "",
        `— ${brand}`,
      ]
        .filter(Boolean)
        .join("\n\n");

      // Cada canal es independiente: si la persona dejó correo, se le manda
      // correo; si dejó teléfono, WhatsApp; si tiene cuenta con la app
      // instalada, además una notificación en el teléfono.
      if (alert.email?.trim()) {
        await enqueue({
          kind: "RESTOCK",
          channel: "EMAIL",
          recipient: alert.email.trim(),
          subject,
          body,
          dedupeKey: `restock:${alert.id}:email`,
        });
      }
      if (alert.phone?.trim()) {
        await enqueue({
          kind: "RESTOCK",
          channel: "WHATSAPP",
          recipient: alert.phone,
          subject,
          body,
          dedupeKey: `restock:${alert.id}:wa`,
        });
      }
      if (alert.userId) {
        await enqueue({
          kind: "RESTOCK",
          channel: "PUSH",
          recipient: alert.userId,
          subject: `Volvió ${opts.productName}`,
          body: `Ya está disponible otra vez. Quedan ${next} ${next === 1 ? "unidad" : "unidades"}.`,
          dedupeKey: `restock:${alert.id}:push`,
        });
      }
    }

    // Envío inmediato: no se espera al cron diario. Se intenta ahora y lo que
    // no se pueda entregar (canal sin configurar) queda en la cola con el
    // motivo escrito, visible en Administración → Avisos automáticos.
    try {
      await processOutbox(20);
    } catch (error) {
      console.error("[restock] envío inmediato falló:", (error as Error).message);
    }

    // Aviso push a los administradores: "volvió X, hay N personas esperando".
    void notifyAdmins({
      title: `Volvió ${opts.productName}`,
      body: `${alerts.length} ${alerts.length === 1 ? "persona está" : "personas están"} esperando este perfume. Ya se les avisó solo.`,
      url: "/admin?tab=alerts",
      tag: `restock-${opts.productId}`,
    });

    return alerts.map((a) => ({
      alertId: a.id,
      productId: opts.productId,
      productName: opts.productName,
      name: a.name,
      email: a.email,
      phone: a.phone,
    }));
  } catch (error) {
    console.error("[restock] no se pudieron marcar los avisos:", (error as Error).message);
    return [];
  }
}

/**
 * Aviso a TODA la lista de espera de lanzamientos (novedades del catálogo).
 * Se llama desde el panel con un botón: "avisar la novedad".
 */
export async function notifyLaunchWaitlist(opts: {
  productName: string;
  message?: string;
}): Promise<number> {
  try {
    const rows = await prisma.launchWaitlist.findMany({
      where: { status: "NEW" },
      select: { id: true, name: true, email: true, phone: true, userId: true },
    });
    if (!rows.length) return 0;

    const settings = await prisma.storeSettings
      .findUnique({ where: { id: "singleton" } })
      .catch(() => null);
    const brand = settings?.brand?.trim() || "Mist & Mood";
    const extra = opts.message?.trim();

    for (const row of rows) {
      const body = [
        `${row.name?.trim() || "Hola"},`,
        `llegó "${opts.productName}" a ${brand} y te escribimos primero porque te habías anotado para enterarte antes.`,
        extra ?? "",
        `— ${brand}`,
      ]
        .filter(Boolean)
        .join("\n\n");

      if (row.email?.trim()) {
        await enqueue({
          kind: "LAUNCH",
          channel: "EMAIL",
          recipient: row.email.trim(),
          subject: `Novedad: ${opts.productName} · ${brand}`,
          body,
          dedupeKey: `launch:${row.id}:${opts.productName}`,
        });
      }
      if (row.phone?.trim()) {
        await enqueue({
          kind: "LAUNCH",
          channel: "WHATSAPP",
          recipient: row.phone,
          subject: `Novedad: ${opts.productName}`,
          body,
          dedupeKey: `launch-wa:${row.id}:${opts.productName}`,
        });
      }
      if (row.userId) {
        await enqueue({
          kind: "LAUNCH",
          channel: "PUSH",
          recipient: row.userId,
          subject: `Novedad: ${opts.productName}`,
          body: `Llegó "${opts.productName}". Enterate antes que nadie.`,
          dedupeKey: `launch-push:${row.id}:${opts.productName}`,
        });
      }
    }

    await prisma.launchWaitlist.updateMany({
      where: { id: { in: rows.map((r) => r.id) } },
      data: { status: "NOTIFIED", notifiedAt: new Date() },
    });

    return rows.length;
  } catch (error) {
    console.error("[launch] no se pudo avisar:", (error as Error).message);
    return 0;
  }
}
