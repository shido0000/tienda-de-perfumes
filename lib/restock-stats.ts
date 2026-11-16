import { prisma } from "./db";

/**
 * ¿Funcionó el aviso de "volvió este perfume"?
 *
 * La pregunta del dueño es concreta: de las personas a las que les avisé que un
 * perfume volvió, ¿cuántas compraron ESE perfume después del aviso? No es una
 * estimación: se compara la fecha en que se marcó el aviso (`notifiedAt`) con
 * las reservas reales de ese cliente que incluyen ese producto.
 *
 * Solo cuenta:
 *  - avisos que YA se avisaron (notifiedAt no nulo),
 *  - reservas posteriores al aviso (no las que ya existían antes),
 *  - el MISMO producto que se avisó (otra compra no demuestra que el aviso sirvió).
 *
 * Un aviso se identifica por el usuario si dejó cuenta; si no, por email o
 * teléfono, igual que se manda el aviso.
 */
export type RestockProductStat = {
  productId: string;
  productName: string;
  notified: number;
  bought: number;
  rate: number;
};

export type RestockStats = {
  notified: number;
  bought: number;
  rate: number;
  products: RestockProductStat[];
};

export async function restockConversion(): Promise<RestockStats> {
  const alerts = await prisma.stockAlert.findMany({
    where: { notifiedAt: { not: null } },
    select: {
      id: true,
      productId: true,
      userId: true,
      email: true,
      phone: true,
      notifiedAt: true,
      product: { select: { name: true } },
    },
    orderBy: { notifiedAt: "desc" },
    take: 2000,
  });

  if (alerts.length === 0) {
    return { notified: 0, bought: 0, rate: 0, products: [] };
  }

  const productIds = Array.from(new Set(alerts.map((a) => a.productId)));
  const userIds = Array.from(
    new Set(alerts.map((a) => a.userId).filter((v): v is string => Boolean(v))),
  );

  // Reservas reales de esos clientes que incluyen esos productos. Se traen una
  // sola vez y se comparan en memoria: evita una consulta por aviso.
  const items = await prisma.reservationItem.findMany({
    where: {
      productId: { in: productIds },
      reservation: {
        OR: [
          ...(userIds.length ? [{ userId: { in: userIds } }] : []),
          { user: { email: { in: alerts.map((a) => a.email ?? "__none__") } } },
        ],
      },
    },
    select: {
      productId: true,
      reservation: {
        select: {
          createdAt: true,
          userId: true,
          user: { select: { email: true, phone: true } },
        },
      },
    },
    take: 20000,
  });

  const byProduct = new Map<string, { name: string; notified: number; bought: number }>();

  for (const alert of alerts) {
    const key = alert.productId;
    const entry =
      byProduct.get(key) ?? { name: alert.product.name, notified: 0, bought: 0 };
    entry.notified += 1;

    const notifiedAt = alert.notifiedAt as Date;
    const phone = (alert.phone ?? "").replace(/\D/g, "");

    const matched = items.some((item) => {
      if (item.productId !== alert.productId) return false;
      const res = item.reservation;
      if (res.createdAt.getTime() < notifiedAt.getTime()) return false;
      if (alert.userId && res.userId === alert.userId) return true;
      if (alert.email && res.user?.email && res.user.email === alert.email) return true;
      if (phone.length >= 6) {
        const resPhone = (res.user?.phone ?? "").replace(/\D/g, "");
        if (resPhone && resPhone === phone) return true;
      }
      return false;
    });

    if (matched) entry.bought += 1;
    byProduct.set(key, entry);
  }

  const products: RestockProductStat[] = Array.from(byProduct.entries())
    .map(([productId, e]) => ({
      productId,
      productName: e.name,
      notified: e.notified,
      bought: e.bought,
      rate: e.notified ? Math.round((e.bought / e.notified) * 100) : 0,
    }))
    .sort((a, b) => b.notified - a.notified);

  const notified = products.reduce((sum, p) => sum + p.notified, 0);
  const bought = products.reduce((sum, p) => sum + p.bought, 0);

  return {
    notified,
    bought,
    rate: notified ? Math.round((bought / notified) * 100) : 0,
    products,
  };
}
