/**
 * Crea dos reservas de prueba (marcadas "zz-test") para comprobar la franja
 * de alertas del panel: una vencida sin comprobante y otra esperando retiro
 * hace más de 3 días. Uso:
 *   node scripts/probe-alerts.mjs seed
 *   node scripts/probe-alerts.mjs clean
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const action = process.argv[2] || "seed";

const daysAgo = (n) => new Date(Date.now() - n * 24 * 60 * 60 * 1000);

async function seed() {
  const user = await prisma.user.findFirst({ where: { role: "ADMIN" } });
  if (!user) throw new Error("No hay usuario admin; corré el seed primero.");

  const old = daysAgo(5);
  const r1 = await prisma.reservation.create({
    data: {
      code: "zz-test-exp",
      userId: user.id,
      currency: "CUP",
      subtotal: 1000,
      deliveryType: "PICKUP",
      total: 1000,
      paymentMethod: "TRANSFER",
      status: "PENDING",
      createdAt: old,
      updatedAt: old,
      items: {
        create: [
          {
            name: "zz-test perfume sin comprobante",
            brand: "zz-test",
            quantity: 1,
            priceOriginal: 1000,
            currencyOriginal: "CUP",
            priceConverted: 1000,
            orderCurrency: "CUP",
          },
        ],
      },
    },
  });
  const r2 = await prisma.reservation.create({
    data: {
      code: "zz-test-pickup",
      userId: user.id,
      currency: "CUP",
      subtotal: 1000,
      deliveryType: "PICKUP",
      total: 1000,
      paymentMethod: "TRANSFER",
      status: "CONFIRMED",
      createdAt: old,
      updatedAt: old,
      items: {
        create: [
          {
            name: "zz-test perfume esperando retiro",
            brand: "zz-test",
            quantity: 1,
            priceOriginal: 1000,
            currencyOriginal: "CUP",
            priceConverted: 1000,
            orderCurrency: "CUP",
          },
        ],
      },
    },
  });
  console.log("creadas:", r1.code, r2.code);
}

async function clean() {
  const res = await prisma.reservation.deleteMany({ where: { code: { startsWith: "zz-test" } } });
  console.log("borradas:", res.count);
}

(action === "clean" ? clean() : seed())
  .catch((e) => {
    console.error("ERR", e.message);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
