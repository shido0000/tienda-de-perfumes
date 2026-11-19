import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { REF_COOKIE } from "@/lib/manager-constants";

export const dynamic = "force-dynamic";

/**
 * Salir del modo gestor.
 *
 * Borra la cookie del gestor y devuelve al visitante a la página desde la que
 * vino, ya con los precios normales de la tienda. Lo usa el aviso que aparece
 * arriba cuando los precios llevan el recargo de un revendedor.
 */
export async function POST(req: NextRequest) {
  const to = req.headers.get("referer");
  let target = new URL("/", req.url);
  if (to) {
    try {
      const u = new URL(to);
      if (u.host === req.nextUrl.host) target = u;
    } catch {
      /* referer inválido: volvemos a la portada */
    }
  }

  const res = NextResponse.redirect(target, { status: 303 });
  res.cookies.set(REF_COOKIE, "", { path: "/", maxAge: 0 });
  return res;
}
