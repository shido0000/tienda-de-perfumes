#!/usr/bin/env node
/**
 * Prepara la base de datos de Supabase (proyecto "TiendaPerfumes") para el
 * despliegue en Vercel:
 *
 *   1. crea/actualiza las tablas del schema de Prisma
 *   2. carga los datos de ejemplo (solo si la base está vacía)
 *   3. crea el usuario administrador de la tienda
 *
 * Uso (la cadena de conexión NUNCA se guarda en el repositorio):
 *
 *   DATABASE_URL="postgresql://postgres.<project-ref>:<password>@aws-0-<region>.pooler.supabase.com:6543/postgres?pgbouncer=true" \
 *   DIRECT_URL="postgresql://postgres.<project-ref>:<password>@aws-0-<region>.pooler.supabase.com:5432/postgres" \
 *   node scripts/deploy-supabase.mjs
 *
 * La contraseña lleva caracteres especiales (**): hay que codificarla para URL
 * (en Node: encodeURIComponent("...") y pegar el resultado).
 */
import { execSync } from "node:child_process";

const required = ["DATABASE_URL", "DIRECT_URL"];

for (const key of required) {
  if (!process.env[key]) {
    console.error(`\n✗ Falta la variable ${key}.`);
    console.error(
      "  Copiá la cadena de conexión desde Supabase → Project Settings → Database\n" +
        "  y exportala antes de correr este script (ver la cabecera del archivo).\n",
    );
    process.exit(1);
  }
}

function run(command) {
  console.log(`\n▶ ${command}`);
  execSync(command, { stdio: "inherit", env: process.env });
}

try {
  run("npx prisma generate");
  run("npx prisma db push --skip-generate");
  console.log("\n✔ Tablas creadas/actualizadas en Supabase.");

  if (process.env.SKIP_SEED === "1") {
    console.log("• Semilla omitida (SKIP_SEED=1).");
  } else {
    run("npx tsx prisma/seed.ts");
    console.log("\n✔ Datos de ejemplo cargados.");
  }

  console.log(`
Listo. Ahora en Vercel (proyecto shido0000s-projects):
  1. Settings → Environment Variables → agregá DATABASE_URL y DIRECT_URL
     (las mismas cadenas que usaste acá, con "?pgbouncer=true" en DATABASE_URL).
  2. Agregá también JWT_SECRET (una cadena larga y aleatoria) y NEXT_PUBLIC_SITE_URL
     con el dominio final, por ejemplo https://tienda-perfumes.vercel.app
  3. Deploy. La app crea el catálogo y podés entrar al panel en /admin.
`);
} catch (error) {
  console.error("\n✗ Falló la preparación de la base de datos.");
  console.error(String(error?.message ?? error));
  process.exit(1);
}
