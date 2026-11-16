/**
 * Deja el asistente IA configurado en la base (proveedor + modelo), usando la
 * clave que ya está en `.env` o en las variables del servidor.
 *
 * Uso: npx tsx scripts/set-ai-config.ts
 *
 * Se guarda en `StoreSettings` en vez de solo en el entorno para que el dueño
 * pueda ver y cambiar el modelo desde Administración → Asistente IA sin tocar
 * el deploy.
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const provider = (process.env.AI_PROVIDER || "openrouter").trim();
  const model = (process.env.AI_MODEL || "openai/gpt-6-luna").trim();
  const apiKey =
    process.env.OPENROUTER_API_KEY ||
    process.env.GROQ_API_KEY ||
    process.env.GEMINI_API_KEY ||
    "";

  const row = await prisma.storeSettings.findFirst();
  if (!row) {
    console.log("No hay ajustes de la tienda todavía: corré primero el seed.");
    return;
  }

  await prisma.storeSettings.update({
    where: { id: row.id },
    data: {
      aiProvider: provider,
      aiModel: model,
      ...(apiKey.trim() ? { aiApiKey: apiKey.trim() } : {}),
    },
  });

  console.log(
    `Asistente configurado: proveedor=${provider} modelo=${model} clave=${apiKey ? "sí" : "no (responde por reglas)"}`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
