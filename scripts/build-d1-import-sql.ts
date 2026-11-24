import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { Prisma } from "@prisma/client";

const MODEL_ORDER = [
  "Health",
  "User",
  "Category",
  "Product",
  "StoreSettings",
  "ManagerPayout",
  "Reservation",
  "Combo",
  "Campaign",
  "CampaignTemplate",
  "Banner",
  "ChatMessage",
  "SiteVisit",
  "ManagerVisit",
  "CartAdd",
  "CheckoutIntent",
  "LaunchWaitlist",
  "OutboxMessage",
  "CurrencyRateLog",
  "PushSubscription",
  "StockAlert",
  "Review",
  "WishlistItem",
  "CartItem",
  "ComboItem",
  "WithdrawalRequest",
  "ReservationItem",
];

const escape = (value: unknown): string => {
  if (value === null || value === undefined) return "NULL";
  if (typeof value === "boolean") return value ? "1" : "0";
  if (typeof value === "number") return String(value);
  const text = typeof value === "string" ? value : JSON.stringify(value);
  return `'${text.replace(/'/g, "''")}'`;
};

const main = () => {
  if (!existsSync("prisma/import-data.json")) {
    throw new Error("Falta prisma/import-data.json. Corré primero db:export:supabase.");
  }

  const dump = JSON.parse(readFileSync("prisma/import-data.json", "utf8")) as Record<
    string,
    Record<string, unknown>[]
  >;
  const models = Prisma.dmmf.datamodel.models;
  const known = new Set(models.map((model) => model.name));
  const order = [
    ...MODEL_ORDER.filter((name) => known.has(name)),
    ...models.map((model) => model.name).filter((name) => !MODEL_ORDER.includes(name)),
  ];

  const lines: string[] = [];
  let total = 0;

  for (const name of order) {
    const rows = dump[name] ?? [];
    if (!rows.length) continue;
    const model = models.find((item) => item.name === name);
    if (!model) continue;
    const fields = model.fields.filter((field) => field.kind === "scalar");
    const columns = fields.map((field) => field.dbName ?? field.name);

    for (let start = 0; start < rows.length; start += 50) {
      const chunk = rows.slice(start, start + 50);
      const values = chunk.map((row) => {
        const cells = fields.map((field) => escape(row[field.name]));
        return `  (${cells.join(", ")})`;
      });
      lines.push(
        `INSERT INTO "${name}" (${columns.map((column) => `"${column}"`).join(", ")}) VALUES\n${values.join(",\n")};`,
      );
    }
    total += rows.length;
    console.log(`[import-sql] ${name}: ${rows.length}`);
  }

  mkdirSync("migrations", { recursive: true });
  writeFileSync("migrations/0002_import.sql", `${lines.join("\n\n")}\n`);
  console.log(`[import-sql] migrations/0002_import.sql: ${total} filas`);
};

main();
