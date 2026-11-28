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
export async function GET(req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const manager = await findManagerByCode(code).catch(() => null);
  const forwardedHost = req.headers.get("x-forwarded-host")?.split(",")[0].trim();
  const host = forwardedHost ?? req.headers.get("host")?.trim();
  const protocol = req.headers.get("x-forwarded-proto")?.split(",")[0].trim() ?? "https";
  const base = host ? `${protocol}://${host}` : process.env.NEXT_PUBLIC_SITE_URL ?? req.url;
  const target = new URL("/", base);

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
