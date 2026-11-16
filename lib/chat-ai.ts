/**
 * Capa de IA del asistente de la tienda.
 *
 * El bot responde SIEMPRE con datos reales de la base (catálogo, ofertas,
 * envío, pagos, reservas del cliente) y usa un modelo de lenguaje gratuito
 * solo para redactar la respuesta y entender la pregunta cuando las reglas no
 * alcanzan. Si no hay clave configurada, el asistente sigue funcionando con
 * las respuestas por reglas: nunca se queda mudo.
 *
 * Proveedores soportados (todos con plan gratuito y API compatible con OpenAI):
 *  - Groq        → https://console.groq.com/keys           (GROQ_API_KEY)
 *  - OpenRouter  → https://openrouter.ai/keys             (OPENROUTER_API_KEY)
 *  - Google AI   → https://aistudio.google.com/apikey     (GEMINI_API_KEY)
 */

export type AiProvider = "groq" | "openrouter" | "gemini";

export type AiConfig = {
  enabled: boolean;
  provider: AiProvider;
  model: string;
  apiKey: string;
};

export type AiTurn = { role: "user" | "assistant"; content: string };

type ProviderPreset = {
  url: string;
  defaultModel: string;
  envVars: string[];
  label: string;
};

export const AI_PROVIDER_LABEL: Record<AiProvider, string> = {
  groq: "Groq (gratis)",
  openrouter: "OpenRouter (gratis)",
  gemini: "Google AI Studio (gratis)",
};

export const AI_MODEL_PRESETS: Record<AiProvider, { id: string; label: string }[]> = {
  groq: [
    { id: "llama-3.3-70b-versatile", label: "Llama 3.3 70B (recomendado)" },
    { id: "llama-3.1-8b-instant", label: "Llama 3.1 8B (más rápido)" },
    { id: "openai/gpt-oss-20b", label: "GPT-OSS 20B" },
  ],
  openrouter: [
    { id: "openai/gpt-6-luna", label: "GPT-6 Luna (recomendado)" },
    { id: "upstage/solar-mini4", label: "Solar Mini 4 (rápido)" },
    { id: "particle-ai/particle-1", label: "Particle 1" },
  ],
  gemini: [
    { id: "gemini-2.0-flash", label: "Gemini 2.0 Flash (recomendado)" },
    { id: "gemini-2.0-flash-lite", label: "Gemini 2.0 Flash Lite (más rápido)" },
    { id: "gemini-1.5-flash", label: "Gemini 1.5 Flash" },
  ],
};

const PRESETS: Record<AiProvider, ProviderPreset> = {
  groq: {
    url: "https://api.groq.com/openai/v1/chat/completions",
    defaultModel: "llama-3.3-70b-versatile",
    envVars: ["GROQ_API_KEY"],
    label: AI_PROVIDER_LABEL.groq,
  },
  openrouter: {
    url: "https://openrouter.ai/api/v1/chat/completions",
    defaultModel: "openai/gpt-6-luna",
    envVars: ["OPENROUTER_API_KEY"],
    label: AI_PROVIDER_LABEL.openrouter,
  },
  gemini: {
    // Google expone un endpoint compatible con OpenAI (beta estable).
    url: "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
    defaultModel: "gemini-2.0-flash",
    envVars: ["GEMINI_API_KEY", "GOOGLE_API_KEY"],
    label: AI_PROVIDER_LABEL.gemini,
  },
};

/** ¿Qué proveedores tienen clave disponible (entorno o guardada por el panel)? */
export function providerKeyFromEnv(provider: AiProvider): string {
  for (const name of PRESETS[provider].envVars) {
    const value = process.env[name];
    if (value && value.trim().length > 10) return value.trim();
  }
  return "";
}

/** Primer proveedor con clave en el entorno. "" si no hay ninguno. */
export function envProvider(): { provider: AiProvider; apiKey: string } | null {
  for (const provider of ["groq", "gemini", "openrouter"] as AiProvider[]) {
    const apiKey = providerKeyFromEnv(provider);
    if (apiKey) return { provider, apiKey };
  }
  return null;
}

export function presetFor(provider: AiProvider): ProviderPreset {
  return PRESETS[provider];
}

export function defaultModelFor(provider: AiProvider): string {
  return PRESETS[provider].defaultModel;
}

export function isAiProvider(value: string): value is AiProvider {
  return value === "groq" || value === "openrouter" || value === "gemini";
}

/**
 * Pregunta al modelo. Devuelve el texto o null si el proveedor falló
 * (sin clave, cuota agotada, red caída, respuesta vacía). Quien llama decide
 * qué hacer con ese null: el asistente cae a sus respuestas por reglas.
 */
export async function askAi(opts: {
  config: AiConfig;
  system: string;
  history: AiTurn[];
  question: string;
  timeoutMs?: number;
}): Promise<string | null> {
  const { config } = opts;
  if (!config.apiKey) return null;

  // Se intenta el modelo elegido y, si el proveedor lo rechaza (un modelo
  // gratuito puede desaparecer o quedar bloqueado por la política de datos de
  // la cuenta), se prueban los otros de la lista antes de rendirse. Así el
  // dueño no tiene que perseguir nombres de modelos que cambian solos.
  const preset = PRESETS[config.provider];
  const chosen = config.model?.trim() || preset.defaultModel;
  const candidates = [chosen, ...AI_MODEL_PRESETS[config.provider].map((m) => m.id)]
    .filter((m, i, all) => m && all.indexOf(m) === i)
    .slice(0, 4);

  for (const model of candidates) {
    const text = await callProvider({ ...opts, model, preset });
    if (text) return text;
  }
  return null;
}

async function callProvider(opts: {
  config: AiConfig;
  system: string;
  history: AiTurn[];
  question: string;
  timeoutMs?: number;
  model: string;
  preset: ProviderPreset;
}): Promise<string | null> {
  const { config, system, history, question, model, preset } = opts;

  const messages = [
    { role: "system", content: system },
    // Solo los últimos turnos: suficiente para el hilo y barato en tokens.
    ...history.slice(-6).map((t) => ({ role: t.role, content: t.content.slice(0, 1200) })),
    { role: "user", content: question.slice(0, 800) },
  ];

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), opts.timeoutMs ?? 12_000);

  try {
    const res = await fetch(preset.url, {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.apiKey}`,
        ...(config.provider === "openrouter"
          ? {
              // OpenRouter pide identificar la app en el plan gratuito.
              "HTTP-Referer": process.env.NEXT_PUBLIC_SITE_URL || "https://mistmood.app",
              "X-Title": "Mist & Mood",
            }
          : {}),
      },
      body: JSON.stringify({
        model,
        temperature: 0.4,
        max_tokens: 400,
        messages,
      }),
    });

    if (!res.ok) return null;
    const data = (await res.json()) as {
      choices?: { message?: { content?: string | null } }[];
    };
    const text = data?.choices?.[0]?.message?.content?.trim();
    if (!text) return null;
    return text;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
