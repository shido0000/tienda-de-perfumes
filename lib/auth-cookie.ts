import { NextResponse } from "next/server";
import { AUTH_COOKIE, signToken } from "./auth";

/**
 * Sets the session cookie.
 *
 * `secure` is derived from the actual protocol rather than NODE_ENV: the
 * production build runs behind a reverse proxy that may speak plain HTTP on the
 * pod, and a Secure cookie is silently dropped there — which looks exactly like
 * "login does nothing". When the request came in over HTTPS (the usual case,
 * via x-forwarded-proto) the flag is set.
 */
export function setAuthCookie(res: NextResponse, userId: string, req: Request) {
  const proto =
    req.headers.get("x-forwarded-proto")?.split(",")[0].trim() ??
    (new URL(req.url).protocol === "https:" ? "https" : "http");

  res.cookies.set(AUTH_COOKIE, signToken(userId), {
    httpOnly: true,
    sameSite: "lax",
    secure: proto === "https",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
  return res;
}
