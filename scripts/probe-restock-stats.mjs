#!/usr/bin/env node
/**
 * Comprueba que el porcentaje de conversión de "volvió este perfume" se calcule
 * bien, con datos de prueba que se borran al final (prefijo zz-test).
 *
 * Escenario: 2 personas pidieron aviso de un perfume. Se marca UNO como
 * avisado y esa persona compra después del aviso. El panel debe mostrar 1 de 1
 * = 100%, y no debe contar la compra anterior al aviso.
 *
 * Uso: node scripts/probe-restock-stats.mjs
 */
import { PrismaClient } from "@prisma/client";
import { restockConversion } from "../lib/restock-stats.ts";

const prisma = new PrismaClient();
const TAG = "zz-test-restock";

async function cleanup() {
  const users = await prisma.user.findMany({
    where: { email: { startsWith: TAG } },
    select: { id: true },
  });
  const ids = users.map((u) => u.id);
  if (ids.length) {
    await prisma.reservationItem.deleteMany({
      where: { reservation: { userId: { in: ids } } },
    });
    await prisma.reservation.deleteMany({ where: { userId: { in: ids } } });
  }
  await prisma.stockAlert.deleteMany({
    where: { OR: [{ email: { startsWith: TAG } }, { userId: { in: ids } }] },
  });
  await prisma.user.deleteMany({ where: { id: { in: ids } } });
}

try {
  await cleanup();

  const product = await prisma.product.findFirst({ select: { id: true, name: true, brand: true } });
  if (!product) throw new Error("No hay perfumes en la base");

  const buyer = await prisma.user.create({
    data: { email: `${TAG}-compra@example.com`, name: "zz compra", passwordHash: "x" },
  });
  const quiet = await prisma.user.create({
    data: { email: `${TAG}-no@example.com`, name: "zz no compra", passwordHash: "x" },
  });

  const itemData = {
    productId: product.id,
    name: product.name,
    brand: product.brand,
    priceOriginal: 0,
    currencyOriginal: "CUP",
    priceConverted: 0,
    orderCurrency: "CUP",
    quantity: 1,
  };

  const baseReservation = {
    userId: buyer.id,
    currency: "CUP",
    subtotal: 0,
    deliveryType: "PICKUP",
    total: 0,
    paymentMethod: "CASH",
  };

  // Compra ANTERIOR al aviso: no debe contar.
  await prisma.reservation.create({
    data: {
      ...baseReservation,
      code: `${TAG}-vieja`,
      createdAt: new Date(Date.now() - 10 * 24 * 3600e3),
      items: { create: [itemData] },
    },
  });

  // Aviso 1: marcado como avisado hace 1 día (compra posterior cuenta).
  await prisma.stockAlert.create({
    data: {
      productId: product.id,
      userId: buyer.id,
      email: buyer.email,
      notifiedAt: new Date(Date.now() - 24 * 3600e3),
    },
  });
  // Aviso 2: nunca se avisó (no debe entrar en el cálculo).
  await prisma.stockAlert.create({
    data: { productId: product.id, userId: quiet.id, email: quiet.email },
  });

  // Compra DESPUÉS del aviso: debe contar.
  await prisma.reservation.create({
    data: {
      ...baseReservation,
      code: `${TAG}-nueva`,
      createdAt: new Date(),
      items: { create: [itemData] },
    },
  });

  const stats = await restockConversion();
  const line = stats.products.find((p) => p.productId === product.id);

  const ok = stats.notified === 1 && stats.bought === 1 && stats.rate === 100 && !!line;

  console.log(`avisados=${stats.notified} compraron=${stats.bought} tasa=${stats.rate}%`);
  console.log(`producto "${product.name}": ${line?.bought}/${line?.notified} => ${line?.rate}%`);
  console.log(ok ? "✓ el cálculo cuenta la compra posterior y descarta la anterior" : "✗ cálculo incorrecto");
  process.exitCode = ok ? 0 : 1;
} finally {
  await cleanup();
  await prisma.$disconnect();
}
