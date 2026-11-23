# Auth in this app

Working log-in, log-out and session reading are already wired. Use them rather than writing your own.

## Protecting an API route

    import { requireUser } from "@/lib/session";

    export async function POST(req: Request) {
      const user = await requireUser();
      if (!user) return Response.json({ error: "unauthorized" }, { status: 401 });
      const body = await req.json();
      return Response.json(
        await prisma.note.create({ data: { ...body, userId: user.id } }),
      );
    }

`requireUser()` returns `null` when there is no session. There is no `withAuth` helper and it does not throw. For admin-only routes, use `requireAdmin()` and return 401/403 yourself.

Scope every query to `user.id`. Never take a user id from the request body or a query parameter — an id the caller supplies is an id the caller can change.

## What is where

| File | Purpose |
|---|---|
| `lib/auth.ts` | hashing + token signing (**Node runtime only**) |
| `lib/edge-auth.ts` | token verification for middleware (**Edge**) |
| `lib/session.ts` | `getCurrentUser()`, `requireUser()`, `isAdmin()`, `requireAdmin()` |
| `lib/db.ts` | shared PrismaClient adapter |
| `app/api/auth/*` | login, logout, me |
| `middleware.ts` | page protection — add paths to `PROTECTED` |

## The sign-in page

Middleware sends anonymous visitors to **`/login`**. `app/login/page.tsx` already exists; do not change `SIGN_IN_PATH` to `/signin`.

`PROTECTED` lists only the routes that need a session. Do not set it to `["/"]` meaning "everything": the sign-in page is a route too, and protecting it is a redirect loop. `ALWAYS_PUBLIC` exists to stop that, but the honest fix is to list what actually needs guarding.

## The one trap

Middleware runs on the Edge runtime, which has no Node crypto, so `jsonwebtoken` throws there on every request. The symptom is not an error page: login returns 200 and sets the cookie, then middleware rejects the token and redirects to /login forever. That is why verification is split in two — keep it that way.

Set `JWT_SECRET` in the deploy environment before publishing.
