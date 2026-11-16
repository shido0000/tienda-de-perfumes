import { NextResponse } from "next/server";
import { AUTH_COOKIE } from "@/lib/auth";

/**
 * Cierra la sesión. Acepta tanto `fetch` (devuelve JSON) como el envío de un
 * formulario HTML normal, en cuyo caso redirige a /login para no mostrar JSON
 * crudo en la pantalla.
 */
export async function POST(req: Request) {
  const wantsHtml = !(req.headers.get("accept") ?? "").includes("application/json");
  const res = wantsHtml
    ? NextResponse.redirect(new URL("/login", req.url), { status: 303 })
    : NextResponse.json({ ok: true });
  res.cookies.set(AUTH_COOKIE, "", { path: "/", maxAge: 0 });
  return res;
}
