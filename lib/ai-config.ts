/**
 * Resolución de la configuración del asistente con IA.
 *
 * La clave puede vivir en dos lugares, en este orden de prioridad:
 *  1. La base de datos (`StoreSettings.aiApiKey`), cargada desde
 *     Administración → Asistente. Permite cambiarla sin redeploy.
 *  2. Las variables de entorno del servidor (GROQ_API_KEY / GEMINI_API_KEY /
 *     OPENROUTER_API_KEY), útiles para un deploy reproducible.
 *
 * Este archivo es SOLO de servidor: nunca debe importarse desde un componente
 * de cliente, porque lee la clave.
 */
import { prisma } from "./db";
import {
  defaultModelFor,
  envProvider,
  isAiProvider,
  providerKeyFromEnv,
  type AiConfig,
  type AiProvider,
} from "./chat-ai";

export type AiStatus = {
  config: AiConfig;
  /** De dónde salió la clave: base, entorno o ninguna. */
  source: "db" | "env" | "none";
};

/**
 * Devuelve la configuración efectiva. Nunca lanza: si la tabla no existe o la
 * base está fría, cae al entorno (o a "sin IA", que hace que el asistente use
 * sus respuestas por reglas).
 */
export async function resolveAiConfig(): Promise<AiStatus> {
  let row: { aiApiKey: string | null; aiProvider: string | null; aiModel: string | null } | null =
    null;
  try {
    row = await prisma.storeSettings.findUnique({
      where: { id: "singleton" },
      select: { aiApiKey: true, aiProvider: true, aiModel: true },
    });
  } catch {
    row = null;
  }

  const savedKey = (row?.aiApiKey ?? "").trim();
  const savedProvider = (row?.aiProvider ?? "").trim();
  const savedModel = (row?.aiModel ?? "").trim();

  if (savedKey.length > 10) {
    const provider: AiProvider = isAiProvider(savedProvider) ? savedProvider : "groq";
    return {
      config: {
        enabled: true,
        provider,
        model: savedModel || defaultModelFor(provider),
        apiKey: savedKey,
      },
      source: "db",
    };
  }

  // Sin clave en la base: se intenta el entorno. Si el panel eligió un
  // proveedor, se respeta siempre que ese proveedor tenga clave en el entorno.
  if (isAiProvider(savedProvider)) {
    const envKey = providerKeyFromEnv(savedProvider);
    if (envKey) {
      return {
        config: {
          enabled: true,
          provider: savedProvider,
          model: savedModel || defaultModelFor(savedProvider),
          apiKey: envKey,
        },
        source: "env",
      };
    }
  }

  const fromEnv = envProvider();
  if (fromEnv) {
    return {
      config: {
        enabled: true,
        provider: fromEnv.provider,
        model: defaultModelFor(fromEnv.provider),
        apiKey: fromEnv.apiKey,
      },
      source: "env",
    };
  }

  return {
    config: {
      enabled: false,
      provider: isAiProvider(savedProvider) ? savedProvider : "groq",
      model: savedModel || defaultModelFor(isAiProvider(savedProvider) ? savedProvider : "groq"),
      apiKey: "",
    },
    source: "none",
  };
}

/** Vista segura de la configuración para el panel: nunca devuelve la clave. */
export type SafeAiConfig = {
  provider: AiProvider;
  model: string;
  hasKey: boolean;
  source: "db" | "env" | "none";
  /** Últimos 4 caracteres, para que el dueño reconozca la clave guardada. */
  keyHint: string;
};

export function toSafeAiConfig(status: AiStatus): SafeAiConfig {
  const key = status.config.apiKey;
  return {
    provider: status.config.provider,
    model: status.config.model,
    hasKey: key.length > 10,
    source: status.source,
    keyHint: key.length > 10 ? `…${key.slice(-4)}` : "",
  };
}
