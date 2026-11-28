import { NextResponse } from "next/server";
import { z } from "zod";

export const dynamic = "force-dynamic";

const requestSchema = z.object({
  sql: z.string().min(1).max(100_000),
  params: z.array(z.unknown()).max(100).default([]),
  mode: z.enum(["raw", "run"]),
});

type BindableStatement = {
  bind(...args: unknown[]): {
    raw(options?: { columnNames?: boolean }): Promise<unknown[][]>;
    run(): Promise<{ meta?: Record<string, unknown>; results?: unknown[] }>;
  };
};

type D1Like = {
  prepare(sql: string): BindableStatement;
};

function secretsMatch(provided: string, expected: string): boolean {
  if (provided.length !== expected.length) return false;
  let difference = 0;
  for (let index = 0; index < provided.length; index += 1) {
    difference |= provided.charCodeAt(index) ^ expected.charCodeAt(index);
  }
  return difference === 0;
}

export async function POST(request: Request) {
  if (process.env.RENDER === "true") {
    return NextResponse.json({ error: "No disponible" }, { status: 404 });
  }

  const expectedToken = process.env.D1_PROXY_TOKEN?.trim();
  if (!expectedToken) {
    return NextResponse.json({ error: "Proxy D1 no configurado" }, { status: 503 });
  }

  const providedToken = request.headers.get("x-d1-proxy-token") ?? "";
  if (!secretsMatch(providedToken, expectedToken)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const json = await request.json().catch(() => null);
  const parsed = requestSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Solicitud inválida" }, { status: 400 });
  }

  try {
    const { getCloudflareContext } = await import("@opennextjs/cloudflare");
    const database = (getCloudflareContext().env as { DB?: unknown }).DB as
      | D1Like
      | undefined;
    if (!database) {
      return NextResponse.json({ error: "Falta el binding DB" }, { status: 503 });
    }

    const statement = database.prepare(parsed.data.sql).bind(...parsed.data.params);

    if (parsed.data.mode === "run") {
      const result = await statement.run();
      return NextResponse.json({ ok: true, meta: result.meta ?? {} });
    }

    const raw = await statement.raw({ columnNames: true });
    const [columns, ...rows] = raw;
    return NextResponse.json({
      ok: true,
      columns: Array.isArray(columns) ? columns : [],
      rows,
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: (error as Error).message },
      { status: 400 },
    );
  }
}
