#!/usr/bin/env node
/**
 * Repara diferencias de esquema que `prisma db push` no puede aplicar solo.
 *
 * `prisma db push` se niega a añadir una columna obligatoria (NOT NULL sin
 * valor por defecto) a una tabla que ya tiene filas. En una base que viene de
 * una versión anterior del esquema eso bloquea todo el deploy, aunque el cambio
 * sea seguro: basta con añadir la columna con un valor por defecto razonable.
 *
 * Aquí se aplican, con `ADD COLUMN IF NOT EXISTS` (idempotente), las columnas
 * que el esquema actual necesita y que una base vieja puede no tener. Después
 * de esto, `prisma db push` encuentra la base alineada y termina sin quejas.
 *
 * Nunca borra datos ni tablas. Si algo falla, avisa y sigue.
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const STATEMENTS = [
  // Plantillas de campaña: las tres columnas llegaron después de existir filas.
  `ALTER TABLE "CampaignTemplate" ADD COLUMN IF NOT EXISTS "title" TEXT NOT NULL DEFAULT ''`,
  `ALTER TABLE "CampaignTemplate" ADD COLUMN IF NOT EXISTS "message" TEXT NOT NULL DEFAULT ''`,
  `ALTER TABLE "CampaignTemplate" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP`,
  // Producto: el género (Hombre/Mujer/Unisex) llegó después de existir filas.
  `ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "gender" TEXT NOT NULL DEFAULT 'UNISEX'`,
];

async function main() {
  if (!process.env.DATABASE_URL) {
    console.log("[db-repair] sin DATABASE_URL, no hay nada que reparar");
    return;
  }
  for (const sql of STATEMENTS) {
    try {
      await prisma.$executeRawUnsafe(sql);
      console.log(`[db-repair] ok: ${sql.slice(0, 72)}…`);
    } catch (err) {
      // Si la tabla aún no existe (base nueva), el push la crea: no es un error.
      console.log(`[db-repair] omitido (${err?.message?.slice(0, 90) || "error"})`);
    }
  }
}

main()
  .catch((err) => {
    console.warn("[db-repair] aviso:", err?.message || err);
  })
  .finally(async () => {
    await prisma.$disconnect().catch(() => {});
    process.exit(0);
  });
