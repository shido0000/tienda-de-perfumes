#!/usr/bin/env node
/**
 * Preparación de la base durante el build.
 *
 * SOLO sincroniza el esquema (tablas/columnas nuevas). NO carga datos de
 * ejemplo: la base de producción ya tiene el catálogo real del dueño y correr
 * el seed en cada build duplicaría o pisaría sus perfumes. Es idempotente y
 * NUNCA rompe el build: si la base no está disponible en el builder, avisa y
 * sigue con el esquema actual.
 */
import { spawnSync } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";

// El builder de producción inyecta las variables en el entorno. En local, un
// `node` suelto NO lee .env (Next.js y la CLI de Prisma sí lo hacen), así que
// las cargamos aquí para que el build local recorra exactamente el mismo
// camino que el de producción y la migración se pueda probar antes de publicar.
const loadEnvFile = (file) => {
  if (!existsSync(file)) return;
  for (const line of readFileSync(file, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!m || line.trim().startsWith("#")) continue;
    const key = m[1];
    if (process.env[key] !== undefined) continue;
    let value = m[2].trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
};
loadEnvFile(".env.local");
loadEnvFile(".env");

const run = (args) => {
  const r = spawnSync("npx", args, { stdio: "inherit", env: process.env });
  return r.status === 0;
};

const hasDb = Boolean(process.env.DATABASE_URL);
if (!hasDb) {
  console.warn("[db-prepare] DATABASE_URL no está definida; se omite la preparación.");
  process.exit(0);
}

console.log("[db-prepare] sincronizando esquema…");
// SIN --accept-data-loss a propósito: en producción un cambio destructivo
// (borrar una columna o una tabla con datos) debe FALLAR aquí en lugar de
// borrar información en silencio. Los cambios aditivos (tablas o columnas
// nuevas) no necesitan ese permiso y se aplican igual. Si el push falla, el
// build sigue y la app arranca con el esquema anterior: nadie pierde datos.
const pushed = run(["prisma", "db", "push", "--skip-generate"]);
if (!pushed) {
  console.warn(
    "[db-prepare] el esquema no se pudo sincronizar de forma segura. " +
      "Puede haber un cambio destructivo pendiente: revisalo con " +
      "`npx prisma migrate diff` y aplicalo a mano. El build continúa con el " +
      "esquema actual y no se pierde ningún dato.",
  );
  process.exit(0);
}

// El seed NO corre en el build ni nunca: la base de producción es la fuente de
// verdad y ya tiene los perfumes y cuentas reales. Cargar datos de ejemplo los
// duplicaría o sobrescribiría, así que `prisma/seed.ts` termina sin escribir
// nada y el catálogo se administra desde el panel (/admin).
process.exit(0);
