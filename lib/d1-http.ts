import type { PrismaD1 } from "@prisma/adapter-d1";

type D1Client = ConstructorParameters<typeof PrismaD1>[0];

type ProxyRequest = {
  sql: string;
  params: unknown[];
  mode: "raw" | "run";
};

type ProxyResponse =
  | { ok: true; columns?: string[]; rows?: unknown[][]; meta?: Record<string, unknown> }
  | { ok: false; error?: string };

export function createD1HttpClient(): D1Client {
  const configuredUrl = process.env.D1_PROXY_URL?.trim();
  const token = process.env.D1_PROXY_TOKEN?.trim();

  if (!configuredUrl || !token) {
    throw new Error("Faltan D1_PROXY_URL o D1_PROXY_TOKEN para acceder a D1 desde Render");
  }

  const authToken: string = token;

  let endpoint: URL;
  try {
    endpoint = new URL(configuredUrl);
  } catch {
    throw new Error("D1_PROXY_URL no es una URL válida");
  }

  if (
    endpoint.protocol !== "https:" &&
    endpoint.hostname !== "localhost" &&
    endpoint.hostname !== "127.0.0.1"
  ) {
    throw new Error("D1_PROXY_URL debe usar https");
  }

  async function call(payload: ProxyRequest): Promise<Extract<ProxyResponse, { ok: true }>> {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-d1-proxy-token": authToken,
      },
      body: JSON.stringify(payload),
      cache: "no-store",
      signal: AbortSignal.timeout(30_000),
    });

    const body = await response.text();
    let data: ProxyResponse;
    try {
      data = JSON.parse(body) as ProxyResponse;
    } catch {
      throw new Error(`D1 proxy respondió ${response.status} con un cuerpo no JSON`);
    }

    if (data.ok === false) {
      throw new Error(data.error || "Error al ejecutar la consulta en D1");
    }
    if (!response.ok) {
      throw new Error(`D1 proxy respondió ${response.status}`);
    }

    return data;
  }

  function statement(sql: string) {
    const params: unknown[] = [];

    const stmt = {
      bind(...args: unknown[]) {
        params.push(...args);
        return stmt;
      },
      async raw() {
        const result = await call({ sql, params, mode: "raw" });
        return [result.columns ?? [], ...(result.rows ?? [])];
      },
      async run() {
        const result = await call({ sql, params, mode: "run" });
        return { success: true, meta: result.meta ?? {}, results: [] };
      },
    };

    return stmt;
  }

  return {
    prepare(sql: string) {
      return statement(sql);
    },
  } as unknown as D1Client;
}
