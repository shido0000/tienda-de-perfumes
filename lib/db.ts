import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { Pool } from "pg";

type PrismaState = {
  client?: PrismaClient;
  connectionString?: string;
};

const state = globalThis as unknown as PrismaState;

function connectionString(): string {
  try {
    const env = getCloudflareContext().env as unknown as {
      HYPERDRIVE?: { connectionString?: string };
    };
    if (env.HYPERDRIVE?.connectionString) return env.HYPERDRIVE.connectionString;
  } catch {}

  const value = process.env.DATABASE_URL;
  if (!value) throw new Error("Falta DATABASE_URL o el binding HYPERDRIVE de Cloudflare");
  return value;
}

function schemaFromConnectionString(url: string): string | undefined {
  try {
    return new URL(url).searchParams.get("schema") || undefined;
  } catch {
    return undefined;
  }
}

function getClient(): PrismaClient {
  const url = connectionString();
  if (state.client && state.connectionString === url) return state.client;

  const pool = new Pool({ connectionString: url });
  const adapter = new PrismaPg(pool, {
    schema: schemaFromConnectionString(url),
  });
  const client = new PrismaClient({ adapter });

  state.client = client;
  state.connectionString = url;
  return client;
}

export const prisma = new Proxy({} as PrismaClient, {
  get(_target, property) {
    const client = getClient();
    const value = Reflect.get(client, property);
    return typeof value === "function" ? value.bind(client) : value;
  },
});
