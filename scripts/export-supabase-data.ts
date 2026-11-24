import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { Prisma } from "@prisma/client";

const loadEnvFile = (file: string) => {
  if (!existsSync(file)) return;
  for (const line of readFileSync(file, "utf8").split("\n")) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!match || line.trim().startsWith("#")) continue;
    const key = match[1];
    if (process.env[key] !== undefined) continue;
    let value = match[2].trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
};

const serialize = (value: any): any => {
  if (value === null || value === undefined) return null;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "bigint") return value.toString();
  if (value && typeof value === "object") {
    if (
      typeof value.toJSON === "function" &&
      "s" in value &&
      "e" in value &&
      "d" in value
    ) {
      return value.toJSON();
    }
    if (Array.isArray(value)) return value.map(serialize);
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, serialize(item)]),
    );
  }
  return value;
};

const main = async () => {
  loadEnvFile(".env");
  loadEnvFile(".env.local");

  if (process.env.SUPABASE_DIRECT_URL) {
    process.env.DATABASE_URL = process.env.SUPABASE_DIRECT_URL;
  } else if (process.env.SUPABASE_DATABASE_URL) {
    process.env.DATABASE_URL = process.env.SUPABASE_DATABASE_URL;
  }

  if (!process.env.DATABASE_URL) {
    throw new Error("Falta SUPABASE_DATABASE_URL para exportar los datos de Supabase.");
  }

  const { prisma } = await import("../lib/db");
  const models = Prisma.dmmf.datamodel.models.map((model) => model.name);
  const dump: Record<string, unknown[]> = {};

  for (const model of models) {
    const delegate = (prisma as any)[model];
    if (!delegate?.findMany) continue;
    const rows = await delegate.findMany();
    dump[model] = rows;
    console.log(`[export] ${model}: ${rows.length}`);
  }

  writeFileSync("prisma/import-data.json", JSON.stringify(serialize(dump), null, 2));
  await prisma.$disconnect();
  console.log("[export] prisma/import-data.json listo");
};

main().catch(async (error) => {
  console.error(error);
  process.exit(1);
});
