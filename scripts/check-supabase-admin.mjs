#!/usr/bin/env node
/**
 * Comprueba que la cuenta de administrador de la base de Supabase exista y que
 * su contraseña coincida con la que se documentó al dueño.
 *
 * Uso:
 *   DATABASE_URL="postgresql://…" node scripts/check-supabase-admin.mjs
 *
 * Nunca imprime la contraseña ni el hash: solo dice si coincide.
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("Falta DATABASE_URL");
  process.exit(1);
}

const prisma = new PrismaClient({ datasources: { db: { url } } });

try {
  const admins = await prisma.user.findMany({
    where: { role: "ADMIN" },
    select: { email: true, name: true, passwordHash: true },
  });

  if (!admins.length) {
    console.log("✗ No hay ninguna cuenta de administrador en esta base.");
    process.exit(2);
  }

  const candidate = process.env.ADMIN_PASSWORD;
  if (!candidate) throw new Error("Falta ADMIN_PASSWORD para comprobar la cuenta de administrador");
  const candidates = [candidate];

  for (const admin of admins) {
    let match = null;
    for (const candidate of candidates) {
      if (await bcrypt.compare(candidate, admin.passwordHash)) {
        match = candidate;
        break;
      }
    }
    console.log(
      `${match ? "✓" : "✗"} ${admin.email} (${admin.name}) — ` +
        (match
          ? `la contraseña documentada funciona`
          : `ninguna de las contraseñas conocidas coincide; hay que restablecerla`),
    );
  }

  const products = await prisma.product.count();
  const withFaqs = await prisma.product.count({
    where: { NOT: { faqs: { equals: [] } } },
  });
  const templates = await prisma.campaignTemplate.count();
  console.log(
    `\nDatos: ${products} perfumes (${withFaqs} con preguntas frecuentes), ` +
      `${templates} plantillas de campaña.`,
  );
} finally {
  await prisma.$disconnect();
}
