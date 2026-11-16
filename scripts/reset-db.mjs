#!/usr/bin/env node
/**
 * Vacía la base y la vuelve a llenar con el catálogo de ejemplo.
 *
 * Uso:
 *   npm run db:reset          -> borra las TABLAS, las recrea y carga el seed
 *
 * IMPORTANTE — qué borra exactamente:
 *   Este script borra las TABLAS (y por tanto las filas) del esquema de la app.
 *   NO borra el esquema de Postgres ni la base de datos: eso lo administra la
 *   plataforma y, si se borra, ningún proceso de la app puede volver a crearlo.
 *   (Un intento anterior con `prisma db push --force-reset` sí lo borraba y dejó
 *   el entorno de preview inutilizable. Por eso ese comando ya no se usa aquí.)
 *
 * DÓNDE corre: en la base de PREVIEW del workspace. La base de producción que
 * se provisiona en cada deploy se pone al día sola con `scripts/db-prepare.mjs`
 * durante el build; ver GUIA-DEPLOY.md.
 */
import { spawnSync } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";

// `node` no lee .env por su cuenta; se carga igual que en scripts/db-prepare.mjs.
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
  console.error(
    "[db:reset] DATABASE_URL no está definida. Configurala en .env antes de reiniciar la base.",
  );
  process.exit(1);
}

const target = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
const schemaName = (() => {
  try {
    return new URL(target).searchParams.get("schema") || "public";
  } catch {
    return "public";
  }
})();
const host = (() => {
  try {
    return new URL(target).host;
  } catch {
    return "(host desconocido)";
  }
})();

console.log(`[db:reset] Base: ${host}  ·  esquema: ${schemaName}`);
console.log("[db:reset] Se van a borrar TODOS los datos actuales (reservas, usuarios, productos).");

const run = (args) => {
  const r = spawnSync("npx", args, { stdio: "inherit", env: process.env });
  return r.status === 0;
};

const sql = (statement, label) => {
  const r = spawnSync(
    "npx",
    ["prisma", "db", "execute", "--url", target, "--stdin"],
    { input: statement, stdio: ["pipe", "inherit", "inherit"], env: process.env },
  );
  if (r.status !== 0) {
    console.error(`[db:reset] Falló ${label}.`);
    return false;
  }
  return true;
};

console.log("[db:reset] 1/3 — borrando las tablas existentes…");
// Se enumeran las tablas del esquema y se eliminan una por una: el esquema en sí
// queda intacto, así que el paso siguiente puede volver a crear las tablas.
const dropTables = `
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = '${schemaName}')
  LOOP
    EXECUTE format('DROP TABLE IF EXISTS %I.%I CASCADE', '${schemaName}', r.tablename);
  END LOOP;
END $$;`;

if (!sql(dropTables, "el borrado de tablas")) {
  console.error(
    "[db:reset] No se pudo vaciar la base. Revisá DATABASE_URL/DIRECT_URL y que la " +
      "base siga accesible. No se borró nada más.",
  );
  process.exit(1);
}

console.log("[db:reset] 2/3 — creando las tablas del esquema…");
if (!run(["prisma", "db", "push", "--skip-generate"])) {
  console.error(
    "[db:reset] No se pudieron crear las tablas. Si el mensaje dice " +
      '"no schema has been selected to create in", el esquema de Postgres no ' +
      "existe y hay que pedir que se vuelva a provisionar la base (ver GUIA-DEPLOY.md).",
  );
  process.exit(1);
}

console.log("[db:reset] 3/3 — cargando los datos iniciales…");
if (!run(["prisma", "db", "seed"])) {
  console.error(
    "[db:reset] Las tablas quedaron vacías pero el seed falló. Corré `npm run db:seed` a mano.",
  );
  process.exit(1);
}

console.log("[db:reset] Listo: base limpia con el catálogo de ejemplo y la cuenta de administrador.");
process.exit(0);
