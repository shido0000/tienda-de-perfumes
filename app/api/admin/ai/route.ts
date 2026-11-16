import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { isAiProvider } from "@/lib/chat-ai";
import { resolveAiConfig, toSafeAiConfig } from "@/lib/ai-config";
import { askAi } from "@/lib/chat-ai";
import { z } from "zod";

export const dynamic = "force-dynamic";

const saveSchema = z.object({
  provider: z.string().min(1).max(20),
  model: z.string().max(120).optional().default(""),
  /** Cadena vacía = borrar la clave guardada (se usará la del entorno). */
  apiKey: z.string().max(400).optional(),
});

/** Estado actual del asistente, sin exponer la clave. */
export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const status = await resolveAiConfig();
  return NextResponse.json({ ai: toSafeAiConfig(status) });
}

export async function PUT(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const parsed = saveSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  }
  const { provider, model, apiKey } = parsed.data;
  if (!isAiProvider(provider)) {
    return NextResponse.json({ error: "Proveedor de IA desconocido." }, { status: 400 });
  }

  const data: Record<string, unknown> = { aiProvider: provider, aiModel: model ?? "" };
  if (apiKey !== undefined) data.aiApiKey = apiKey.trim();

  await prisma.storeSettings.upsert({
    where: { id: "singleton" },
    update: data,
    create: { id: "singleton", ...data },
  });

  const status = await resolveAiConfig();
  return NextResponse.json({ ai: toSafeAiConfig(status) });
}

/** Prueba en vivo: manda una pregunta de muestra al modelo elegido. */
export async function POST(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const status = await resolveAiConfig();
  if (!status.config.enabled) {
    return NextResponse.json(
      { ok: false, error: "Todavía no hay una clave guardada. Pegá una y guardá antes de probar." },
      { status: 400 },
    );
  }

  const body = await req.json().catch(() => ({}));
  const question = String(body?.question ?? "¿Qué perfumes frescos tienen?").slice(0, 300);

  const reply = await askAi({
    config: status.config,
    system:
      "Sos el asistente de una perfumería. Respondé en español, en una sola frase corta y amable.",
    history: [],
    question,
    timeoutMs: 15_000,
  });

  if (!reply) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "El proveedor no respondió. Revisá que la clave sea correcta y que el modelo exista en tu plan gratuito.",
      },
      { status: 502 },
    );
  }

  return NextResponse.json({ ok: true, reply, provider: status.config.provider });
}
