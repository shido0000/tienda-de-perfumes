#!/usr/bin/env node
/**
 * Limpia la "Dirección del sitio" guardada en la base de Supabase cuando es la
 * dirección de UN deploy de Vercel (…-abc123-nocoder1.vercel.app).
 *
 * Por qué: esa dirección deja de existir en la próxima publicación, así que el
 * sitemap que se le entrega a Google apunta a una página muerta y la tienda no
 * se indexa. Al vaciarla, la app usa el dominio de producción real (o el
 * dominio propio cuando el dueño lo cargue desde Administración).
 *
 * Uso:
 *   DATABASE_URL="postgresql://…" node scripts/clear-deploy-site-url.mjs
 */
import { PrismaClient } from "@prisma/client";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("Falta DATABASE_URL");
  process.exit(1);
}

const prisma = new PrismaClient({ datasources: { db: { url } } });

try {
  const row = await prisma.storeSettings.findUnique({
    where: { id: "singleton" },
    select: { siteUrl: true },
  });

  const current = row?.siteUrl?.trim() ?? "";
  const isDeployUrl = /\.vercel\.app$/i.test(current.replace(/^https?:\/\//i, ""));

  if (!current) {
    console.log("Ya estaba vacía; la app deduce la dirección sola.");
  } else if (isDeployUrl) {
    await prisma.storeSettings.update({
      where: { id: "singleton" },
      data: { siteUrl: "" },
    });
    console.log(`Vaciada: ${current} era la dirección de un deploy puntual.`);
    console.log("Ahora se usa el dominio de producción o el dominio propio.");
  } else {
    console.log(`Se deja como está: ${current} (parece un dominio propio).`);
  }
} finally {
  await prisma.$disconnect();
}
