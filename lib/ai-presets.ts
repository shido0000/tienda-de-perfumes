/**
 * Catálogo de proveedores de IA gratuitos que puede usar el asistente.
 *
 * Este archivo es seguro para el navegador (no toca la base ni el entorno):
 * lo usan los ajustes del panel para mostrar opciones y modelos.
 */

export type AiProvider = "groq" | "openrouter" | "gemini";

export const AI_PROVIDER_LABEL: Record<AiProvider, string> = {
  groq: "Groq",
  openrouter: "OpenRouter",
  gemini: "Google AI Studio",
};

export const AI_PROVIDER_HELP: Record<AiProvider, { free: string; keysUrl: string }> = {
  groq: { free: "Plan gratuito, muy rápido (Llama 3.3)", keysUrl: "https://console.groq.com/keys" },
  openrouter: {
    free: "Los modelos :free se retiraron; con tu clave funciona con modelos de centavos (GPT-6 Luna)",
    keysUrl: "https://openrouter.ai/keys",
  },
  gemini: { free: "Capa gratuita de Google (Gemini Flash)", keysUrl: "https://aistudio.google.com/apikey" },
};

export const AI_MODEL_PRESETS: Record<AiProvider, { id: string; label: string }[]> = {
  groq: [
    { id: "llama-3.3-70b-versatile", label: "Llama 3.3 70B — recomendado" },
    { id: "llama-3.1-8b-instant", label: "Llama 3.1 8B — más rápido" },
    { id: "openai/gpt-oss-20b", label: "GPT-OSS 20B" },
  ],
  // Los modelos ":free" de OpenRouter cambian de nombre y muchos dejan de tener
  // proveedor; los que quedan se verificaron contra la API real. El default es
  // el más barato que respondió bien en español y sigue disponible.
  openrouter: [
    { id: "openai/gpt-6-luna", label: "GPT-6 Luna (recomendado, centavos)" },
    { id: "upstage/solar-mini4", label: "Solar Mini 4 (muy barato)" },
    { id: "particle-ai/particle-1", label: "Particle 1 (barato)" },
  ],
  gemini: [
    { id: "gemini-2.0-flash", label: "Gemini 2.0 Flash — recomendado" },
    { id: "gemini-2.0-flash-lite", label: "Gemini 2.0 Flash Lite — más rápido" },
    { id: "gemini-1.5-flash", label: "Gemini 1.5 Flash" },
  ],
};

export const AI_PROVIDERS: AiProvider[] = ["groq", "gemini", "openrouter"];

export function isAiProvider(value: string): value is AiProvider {
  return value === "groq" || value === "openrouter" || value === "gemini";
}

export function defaultModelFor(provider: AiProvider): string {
  return AI_MODEL_PRESETS[provider][0].id;
}
