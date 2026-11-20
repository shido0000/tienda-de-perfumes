#!/usr/bin/env node
/**
 * Vacía la base y la vuelve a llenar con el catálogo de ejemplo.
 *
 * Uso:
 *   CONFIRM_RESET=1 npm run db:reset   -> borra las TABLAS, las recrea y carga el seed
 *
 * IMPORTANTE — por qué pide confirmación:
 *   La tienda usa la base de PRODUCCIÓN, que ya tiene los perfumes, las cuentas
 *   y los textos reales del dueño. Este script borra TODAS las tablas (y por
 *   tanto todas las filas). Para que nadie la vacíe por accidente escribiendo
 *   `npm run db:reset`, sólo se ejecuta si se pasa CONFIRM_RESET=1 a mano.
 *
 *   NO borra el esquema de Postgres ni la base de datos: eso lo administra la
 *   plataforma. Sólo borra las tablas de la app y las vuelve a crear.
 */
import { spawnSync } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";

if (process.env.CONFIRM_RESET !== "1") {
  console.error(
    "Reset cancelado: este comando BORRA todas las tablas y sus datos.\n" +
      "La app usa la base de producción, que ya tiene la información real del negocio.\n" +
      "Si de verdad querés vaciarla (sólo en una base de pruebas), ejecutá:\n" +
      "  CONFIRM_RESET=1 npm run db:reset",
  );
  process.exit(1);
}

// Cargar .env / .env.local a mano: un `node` suelto no lo hace solo.
const loadEnvFile = (file) => {
  if (!existsSync(file)) return;
  for (const line of readFileSync(file, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!m || line.trim().startsWith("#")) continue;
    const key = m[1];
    if (process.env[key] !== undefined) continue;
    let value = m[2].trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
};
loadEnvFile(".env.local");
loadEnvFile(".env");

if (!process.env.DATABASE_URL) {
  console.error("Falta DATABASE_URL: no hay base a la que conectarse.");
  process.exit(1);
}

const run = (args) => {
  console.log(`\n▶ npx ${args.join(" ")}`);
  const r = spawnSync("npx", args, { stdio: "inherit", env: process.env });
  if (r.status !== 0) {
    console.error(`Falló: npx ${args.join(" ")}`);
    process.exit(1);
  }
};

// Recrea todas las tablas desde cero (esto sí borra datos: de ahí la guarda).
run(["prisma", "db", "push", "--force-reset", "--skip-generate"]);
run(["prisma", "generate"]);

// NO se cargan datos de ejemplo: la base de producción es la fuente de verdad y
// el dueño carga su catálogo desde el panel. Reiniciar la base sólo deja las
// tablas vacías, listas para trabajar.
console.log("\n✔ Base vaciada. Las tablas quedaron vacías (sin datos de ejemplo).");
