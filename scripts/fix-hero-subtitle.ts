import { prisma } from "@/lib/db";

/**
 * Limpia textos del hero guardados por error desde Administración → Contenido.
 *
 * Pasó esto: el subtítulo del hero quedó guardado con el valor literal "s" y
 * la portada mostraba una "s" suelta debajo del titular. Cualquier valor de
 * menos de 3 caracteres (o sólo signos) se considera un error de tipeo y se
 * devuelve a vacío, que hace que el componente use el texto por defecto.
 */

function isGarbage(value: string | null | undefined): boolean {
  const v = (value ?? "").trim();
  if (v.length === 0) return false; // vacío es válido: usa el texto por defecto
  if (v.length < 3) return true; // "s", "aa", "..."
  if (!/[a-záéíóúñ]{3,}/i.test(v)) return true; // sólo signos o números
  return false;
}

async function main() {
  const rows = await prisma.storeSettings.findMany();
  let fixed = 0;

  for (const row of rows) {
    const patch: Record<string, string | null> = {};
    const candidates: [keyof typeof row, string][] = [
      ["heroTitle", "heroTitle"],
      ["heroSubtitle", "heroSubtitle"],
      ["catalogTitle", "catalogTitle"],
      ["catalogIntro", "catalogIntro"],
      ["tagline", "tagline"],
    ];

    for (const [key, label] of candidates) {
      const current = row[key] as string | null;
      if (isGarbage(current)) {
        patch[key as string] = "";
        console.log(`limpiando ${label}: ${JSON.stringify(current)} → ""`);
      }
    }

    if (Object.keys(patch).length > 0) {
      await prisma.storeSettings.update({ where: { id: row.id }, data: patch });
      fixed += 1;
    }
  }

  console.log(`listo. filas ajustadas: ${fixed}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
