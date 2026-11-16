import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * Comprobación posterior al deploy.
 *
 * Devuelve `ok: true` sólo si:
 *  - la base responde,
 *  - hay catálogo visible cargado,
 *  - existe la cuenta de administrador.
 *
 * Se puede abrir en el navegador después de publicar: si `adminExists` es
 * false, el seed no corrió contra esta base y hay que revisar el deploy. Nunca
 * expone claves ni datos de usuarios.
 */
export async function GET() {
  try {
    const [productCount, categoryCount, adminExists] = await Promise.all([
      prisma.product.count({ where: { visible: true } }),
      prisma.category.count(),
      prisma.user
        .findFirst({ where: { role: "ADMIN" }, select: { id: true } })
        .then(Boolean),
    ]);

    const checks = {
      database: true,
      catalogLoaded: productCount > 0,
      categoriesLoaded: categoryCount > 0,
      adminExists,
    };

    return NextResponse.json({
      ok: checks.catalogLoaded && checks.adminExists,
      productCount,
      categoryCount,
      adminExists,
      checks,
      checkedAt: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        productCount: 0,
        adminExists: false,
        checks: { database: false, catalogLoaded: false, categoriesLoaded: false, adminExists: false },
        error: (error as Error).message,
      },
      { status: 503 },
    );
  }
}
