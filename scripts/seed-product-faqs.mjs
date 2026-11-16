/**
 * Carga las preguntas frecuentes que todo perfume debería tener ("¿es
 * original?", "¿cuánto dura?") en los productos que hoy no tienen ninguna.
 *
 * Por qué existe: el editor de preguntas ya está en el panel, pero al abrirlo
 * por primera vez todos los perfumes estaban vacíos y el dueño tenía que
 * escribir cuatro preguntas repetidas en cada ficha. Esto deja las respuestas
 * base escritas y él solo las retoca.
 *
 * Uso:
 *   node scripts/seed-product-faqs.mjs          → carga donde falten
 *   node scripts/seed-product-faqs.mjs --force  → reemplaza las existentes
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const force = process.argv.includes("--force");

const DEFAULTS = [
  {
    q: "¿Es original?",
    a: "Sí. Cada frasco llega sellado de fábrica, con su caja y su código de lote. Si al recibirlo tenés cualquier duda, escribinos por WhatsApp y lo revisamos con vos.",
  },
  {
    q: "¿Cuánto dura el perfume?",
    a: "En la piel rinde entre 6 y 8 horas, y en la ropa puede quedar varias horas más. Para que dure más, aplicá sobre la piel hidratada y en los puntos de pulso.",
  },
  {
    q: "¿Puedo probarlo antes de comprar?",
    a: "Sí. Tenemos decants de prueba y el set de descubrimiento, así conocés el aroma en tu piel antes de llevarte el frasco completo.",
  },
  {
    q: "¿Cómo hago la reserva y el pago?",
    a: "Reservás desde la ficha del perfume, eligiendo entrega a domicilio o retiro en tienda. Te confirmamos por WhatsApp con los datos de pago (transferencia o contraentrega).",
  },
];

async function main() {
  const products = await prisma.product.findMany({
    select: { id: true, name: true, faqs: true },
  });

  let touched = 0;
  for (const p of products) {
    const current = Array.isArray(p.faqs) ? p.faqs : [];
    if (current.length > 0 && !force) continue;
    await prisma.product.update({
      where: { id: p.id },
      data: { faqs: DEFAULTS },
    });
    touched++;
    console.log(`✓ ${p.name}`);
  }

  console.log(`\n${touched} de ${products.length} perfumes con preguntas frecuentes.`);
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
