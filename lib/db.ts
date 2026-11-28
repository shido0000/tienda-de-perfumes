import { PrismaClient } from "@prisma/client";
import { PrismaD1 } from "@prisma/adapter-d1";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { createD1HttpClient } from "./d1-http";

type PrismaState = {
  client?: PrismaClient;
};

type D1Client = ConstructorParameters<typeof PrismaD1>[0];

const state = globalThis as unknown as PrismaState;

function getD1Client(): D1Client | null {
  let env: { DB?: unknown } | undefined;
  try {
    env = getCloudflareContext().env as { DB?: unknown } | undefined;
  } catch {
    env = undefined;
  }

  if (env?.DB) return env.DB as D1Client;

  if (process.env.D1_PROXY_URL || process.env.D1_PROXY_TOKEN) {
    return createD1HttpClient();
  }

  return null;
}

function getClient(): PrismaClient {
  if (state.client) return state.client;

  const d1 = getD1Client();
  if (d1) {
    state.client = new PrismaClient({ adapter: new PrismaD1(d1) });
    return state.client;
  }

  if (process.env.RENDER === "true") {
    throw new Error("Render necesita D1_PROXY_URL y D1_PROXY_TOKEN para acceder a D1");
  }

  state.client = new PrismaClient();
  return state.client;
}

export const prisma = new Proxy({} as PrismaClient, {
  get(_target, property) {
    const client = getClient();
    const value = Reflect.get(client, property);
    return typeof value === "function" ? value.bind(client) : value;
  },
});
