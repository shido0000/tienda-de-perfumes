import { randomUUID } from "node:crypto";
import { writeFileSync } from "node:fs";

const output = process.argv[2];

if (!output) {
  throw new Error("Falta la ruta de salida del SQL.");
}

const email = process.env.SEED_ADMIN_EMAIL || "jonyperez1099@gmail.com";
const passwordHash = process.env.SEED_ADMIN_PASSWORD_HASH;

if (!passwordHash || !/^\$2[aby]\$\d{2}\$/.test(passwordHash)) {
  throw new Error("SEED_ADMIN_PASSWORD_HASH debe ser un hash bcrypt válido.");
}

const id = process.env.SEED_ADMIN_ID || randomUUID();
const quote = (value) => `'${String(value).replaceAll("'", "''")}'`;

const sql = [
  `INSERT INTO "User" ("id", "email", "passwordHash", "name", "phone", "role", "createdAt", "managerActive")`,
  `VALUES (${quote(id)}, ${quote(email.toLowerCase())}, ${quote(passwordHash)}, 'Administrador', NULL, 'ADMIN', CURRENT_TIMESTAMP, 0)`,
  `ON CONFLICT("email") DO UPDATE SET "passwordHash" = excluded."passwordHash", "role" = 'ADMIN', "name" = excluded."name";`,
  "",
].join("\n");

writeFileSync(output, sql, "utf8");
console.log(`[seed] SQL generado para ${email.toLowerCase()}`);
