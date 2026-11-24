import { PrismaClient } from "@prisma/client";
import { PrismaD1 } from "@prisma/adapter-d1";
import { getCloudflareContext } from "@opennextjs/cloudflare";

type PrismaState = {
  client?: PrismaClient;
};

type D1Client = ConstructorParameters<typeof PrismaD1>[0];

const state = globalThis as unknown as PrismaState;

function getClient(): PrismaClient {
  if (state.client) return state.client;

  let env: { DB?: unknown } | undefined;
  try {
    env = getCloudflareContext().env as { DB?: unknown };
  } catch {
    env = undefined;
  }

  if (env) {
    if (!env.DB) {
      throw new Error("Falta el binding DB de Cloudflare D1");
    }
    state.client = new PrismaClient({ adapter: new PrismaD1(env.DB as D1Client) });
    return state.client;
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
