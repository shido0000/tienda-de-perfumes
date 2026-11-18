import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyTokenEdge } from "@/lib/edge-auth";
import { REF_COOKIE } from "@/lib/manager-constants";

/**
 * Dos trabajos, en este orden:
 *
 * 1) Enlaces de gestor: cualquier visita con `?ref=CODIGO` (o /r/CODIGO, que
 *    redirige a la portada con la cookie ya puesta) fija la cookie del gestor.
 *    Así el enlace corto `?ref=` también funciona cuando lo pegan en WhatsApp.
 * 2) Sesión: las rutas privadas exigen una sesión válida.
 *
 * `verifyTokenEdge` usa jose porque el middleware corre en el EDGE runtime,
 * donde jsonwebtoken no tiene crypto de Node.
 */
const REF_MAX_AGE = 60 * 60 * 24 * 90;
const PROTECTED = ["/mis-reservas", "/deseos", "/checkout", "/admin", "/mi-cuenta"];

/**
 * Corre en todas las páginas (no en /api, /_next ni estáticos) porque el enlace
 * del gestor puede llegar a cualquier ruta de la tienda con ?ref=.
 */
export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|icons|sw.js|manifest).*)"],
};

export async function middleware(req: NextRequest) {
  const ref = req.nextUrl.searchParams.get("ref");
  const res = await gateSession(req);
  if (ref) {
    res.cookies.set(REF_COOKIE, ref.trim().toUpperCase(), {
      httpOnly: false,
      sameSite: "lax",
      path: "/",
      maxAge: REF_MAX_AGE,
    });
  }
  return res;
}

async function gateSession(req: NextRequest): Promise<NextResponse> {
  const { pathname } = req.nextUrl;
  const needsAuth = PROTECTED.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  if (!needsAuth) return NextResponse.next();

  const token = req.cookies.get("auth_token")?.value;
  const userId = await verifyTokenEdge(token);
  if (userId) return NextResponse.next();

  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.search = `?next=${encodeURIComponent(pathname)}`;
  return NextResponse.redirect(url);
}
