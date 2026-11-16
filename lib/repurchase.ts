/**
 * Recordatorio de reposición.
 *
 * Busca reservas ENTREGADAS hace `days` días (se mide desde `updatedAt`, que es
 * cuando la reserva pasó a ENTREGADA) y encola un mensaje suave —"¿ya se te está
 * terminando?"— por cada canal que el cliente dejó: correo, WhatsApp y
 * notificación en el teléfono.
 *
 * Se usa desde dos lados: el cron de Vercel (`/api/cron/outbox`) y el botón
 * "Mandar la cola ahora" del panel de avisos automáticos.
 */
import { prisma } from "./db";
import { enqueue } from "./outbox";

const DAY_MS = 24 * 60 * 60 * 1000;

/** Ventana: entre `days` y `days + 25` días, para no repetir para siempre. */
export async function generateRepurchaseReminders(days: number): Promise<number> {
  const settings = await prisma.storeSettings
    .findUnique({ where: { id: "singleton" } })
    .catch(() => null);
  if (settings && settings.autoRepurchaseEnabled === false) return 0;

  const brand = settings?.brand?.trim() || "Mist & Mood";
  const cutoff = new Date(Date.now() - days * DAY_MS);

  const rows = await prisma.reservation.findMany({
    where: {
      status: "DELIVERED",
      updatedAt: { lte: cutoff },
    },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      code: true,
      updatedAt: true,
      userId: true,
      user: { select: { id: true, email: true, name: true, phone: true } },
      items: { select: { productId: true, name: true } },
    },
    take: 500,
  });

  const seen = new Set<string>();
  let created = 0;

  for (const row of rows) {
    const elapsed = Date.now() - row.updatedAt.getTime();
    if (elapsed > (days + 25) * DAY_MS) continue;

    for (const item of row.items) {
      if (!item.productId) continue;
      const productName = item.name;
      const key = `${row.userId}:${item.productId}`;
      if (seen.has(key)) continue;
      seen.add(key);

      const body = [
        `${row.user?.name?.trim() || "Hola"},`,
        `hace unas semanas te llevaste "${productName}" de ${brand}. Si ya está por terminar, podemos prepararte otro frasco.`,
        `Respondé este mensaje o escribinos por WhatsApp y lo reservamos para vos.`,
        `— ${brand}`,
      ].join("\n\n");
      const subject = `¿Ya se te está terminando ${productName}? · ${brand}`;

      if (row.user?.email?.trim()) {
        const r = await enqueue({
          kind: "REPURCHASE",
          channel: "EMAIL",
          recipient: row.user.email.trim(),
          subject,
          body,
          dedupeKey: `repurchase:${row.userId}:${item.productId}:${days}`,
        });
        if (r) created++;
      }
      if (row.user?.phone?.trim()) {
        const r = await enqueue({
          kind: "REPURCHASE",
          channel: "WHATSAPP",
          recipient: row.user.phone,
          subject,
          body,
          dedupeKey: `repurchase-wa:${row.userId}:${item.productId}:${days}`,
        });
        if (r) created++;
      }
      if (row.userId) {
        const r = await enqueue({
          kind: "REPURCHASE",
          channel: "PUSH",
          recipient: row.userId,
          subject: `¿Ya se te está terminando ${productName}?`,
          body: `Podemos prepararte otro frasco de ${productName}.`,
          dedupeKey: `repurchase-push:${row.userId}:${item.productId}:${days}`,
        });
        if (r) created++;
      }
    }
  }

  return created;
}
