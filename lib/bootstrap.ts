import { prisma } from "./db";

/**
 * Arranque de la base en frío.
 *
 * Un deploy nuevo puede llegar a una base sin tablas o sin la fila de ajustes.
 * En vez de un 500 en la portada, `ensureReady()` intenta lo mínimo para que la
 * app pueda renderizar, y si no puede, avisa y sigue: las páginas muestran su
 * estado vacío en lugar de una pantalla de error.
 */
export type ReadyState = { ok: boolean; reason?: string };

let cached: ReadyState | null = null;

export async function ensureReady(): Promise<ReadyState> {
  if (cached?.ok) return cached;
  try {
    const existing = await prisma.storeSettings.findUnique({ where: { id: "singleton" } });
    if (!existing) {
      await prisma.storeSettings.create({ data: { id: "singleton" } });
    }
    cached = { ok: true };
    return cached;
  } catch (error) {
    const reason = (error as Error).message;
    console.error("[bootstrap] la base no está lista:", reason);
    cached = { ok: false, reason };
    return cached;
  }
}

/** true cuando el error de Prisma significa "falta la tabla o no hay conexión". */
export function isNotReadyError(error: unknown): boolean {
  const code = (error as { code?: string })?.code;
  return code === "P2021" || code === "P2022" || code === "P1001" || code === "P1000";
}
