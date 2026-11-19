import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { REF_COOKIE, findManagerByCode } from "@/lib/manager";

export const dynamic = "force-dynamic";

/**
 * Enlace personal de un gestor: /r/CODIGO
 *
 * Guarda el código en la cookie del visitante y lo manda a la tienda. Desde
 * ese momento el catálogo le muestra los precios con el recargo del gestor.
 */
export async function GET(req: NextRequest, { params }: { params: { code: string } }) {
  const manager = await findManagerByCode(params.code).catch(() => null);
  const target = new URL("/", req.url);

  if (!manager) {
    target.searchParams.set("ref", "invalido");
    return NextResponse.redirect(target);
  }

  // Se redirige con ?ref= para que el middleware fije la cookie en esa misma
  // petición y no la borre como "entrada normal" en el paso siguiente.
  target.searchParams.set("ref", manager.code);
  const res = NextResponse.redirect(target);
  res.cookies.set(REF_COOKIE, manager.code, {
    httpOnly: false,
    sameSite: "lax",
    path: "/",
  });
  return res;
}
