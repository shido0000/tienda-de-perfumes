import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyTokenEdge } from "@/lib/edge-auth";

/**
 * Primera barrera en el EDGE runtime (jose, no jsonwebtoken).
 *
 * Solo prueba que hay una sesión válida: el rol de administrador y la
 * propiedad de cada fila se vuelven a comprobar en el servidor. Si falta la
 * sesión, redirige al login conservando el destino en ?next=.
 */
export const config = {
  matcher: [
    "/mis-reservas/:path*",
    "/deseos/:path*",
    "/checkout/:path*",
    "/admin/:path*",
    "/mi-cuenta/:path*",
  ],
};

export async function middleware(req: NextRequest) {
  const token = req.cookies.get("auth_token")?.value;
  const userId = await verifyTokenEdge(token);
  if (userId) return NextResponse.next();

  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.search = `?next=${encodeURIComponent(req.nextUrl.pathname)}`;
  return NextResponse.redirect(url);
}
