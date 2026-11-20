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
 *
 *    La cookie es de SESIÓN: no se guarda al cerrar el navegador y se borra en
 *    cuanto el visitante vuelve a entrar por la dirección normal de la tienda
 *    (una llegada desde fuera a la portada, sin `?ref=`). Antes duraba 90 días y
 *    el recargo del gestor se quedaba pegado incluso entrando por la web
 *    normal.
 * 2) Sesión: las rutas privadas exigen una sesión válida.
 *
 * `verifyTokenEdge` usa jose porque el middleware corre en el EDGE runtime,
 * donde jsonwebtoken no tiene crypto de Node.
 */
const PROTECTED = ["/mis-reservas", "/deseos", "/checkout", "/admin", "/mi-cuenta", "/gestor"];

/**
 * Corre en todas las páginas (no en /api, /_next ni estáticos) porque el enlace
 * del gestor puede llegar a cualquier ruta de la tienda con ?ref=.
 */
export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|icons|sw.js|manifest).*)"],
};

/** ¿La visita viene de fuera de la tienda (barra de direcciones, WhatsApp, Google)? */
function isExternalLanding(req: NextRequest): boolean {
  const referer = req.headers.get("referer");
  if (!referer) return true;
  try {
    return new URL(referer).host !== req.nextUrl.host;
  } catch {
    return true;
  }
}

export async function middleware(req: NextRequest) {
  const ref = req.nextUrl.searchParams.get("ref");
  const res = await gateSession(req);

  if (ref) {
    // Sesión del navegador: sin maxAge/expires la cookie muere al cerrarlo.
    res.cookies.set(REF_COOKIE, ref.trim().toUpperCase(), {
      httpOnly: false,
      sameSite: "lax",
      path: "/",
    });
    return res;
  }

  // Entró por la web normal (no por un enlace de gestor): se quita el recargo.
  // Cualquier llegada desde fuera de la tienda (barra de direcciones, Google,
  // WhatsApp) cuenta, no solo la portada.
  if (isExternalLanding(req) && req.cookies.get(REF_COOKIE)?.value) {
    res.cookies.set(REF_COOKIE, "", { path: "/", maxAge: 0 });
  }

  return res;
}

async function gateSession(req: NextRequest): Promise<NextResponse> {
  const { pathname } = req.nextUrl;
  const needsAuth = PROTECTED.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  if (!needsAuth) return NextResponse.next();

  const token = req.cookies.get("auth_token")?.value;
  const user = token ? await verifyTokenEdge(token).catch(() => null) : null;

  if (user) return NextResponse.next();

  const login = new URL("/login", req.url);
  login.searchParams.set("next", pathname);
  return NextResponse.redirect(login);
}
