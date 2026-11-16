# Auth in this app

Working sign-up, log-in, log-out and session reading are already wired. Use
them rather than writing your own.

## Protecting an API route

    import { requireUser, withAuth } from "@/lib/session";

    export const POST = withAuth(async (req: Request) => {
      const user = await requireUser();
      const body = await req.json();
      return Response.json(
        await prisma.note.create({ data: { ...body, userId: user.id } }),
      );
    });

`requireUser()` signals "not signed in" by **throwing** a 401 Response, and
`withAuth` is what turns that throw back into a response. Export a bare
handler without it and the throw escapes: Next has no idea it was meant to be
a 401, so the caller gets **500** on every unauthenticated request. Wrap every
protected route.

Scope every query to `user.id`. Never take a user id from the request body or
a query parameter — an id the caller supplies is an id the caller can change.

## What is where

| File | Purpose |
|---|---|
| `lib/auth.ts` | hashing + token signing (**Node runtime only**) |
| `lib/edge-auth.ts` | token verification for middleware (**Edge**) |
| `lib/session.ts` | `getCurrentUser()`, `requireUser()` |
| `lib/db.ts` | the shared PrismaClient |
| `app/api/auth/*` | register, login, logout, me |
| `middleware.ts` | page protection — add paths to `PROTECTED` |

## The sign-in page

Middleware sends anonymous visitors to **`/signin`**, so build
`app/signin/page.tsx` (and `app/signup/page.tsx`). If you name them
something else, change `SIGN_IN_PATH` to match — a redirect to a page that
does not exist is a 404 on every protected route.

`PROTECTED` lists only the routes that need a session. Do **not** set it to
`["/"]` meaning "everything": the sign-in page is a route too, and protecting
it is a redirect loop. `ALWAYS_PUBLIC` exists to stop that, but the honest
fix is to list what actually needs guarding.

## The one trap

Middleware runs on the Edge runtime, which has no Node crypto, so
`jsonwebtoken` throws there on every request. The symptom is not an error
page: login returns 200 and sets the cookie, then middleware rejects the token
and redirects to /login forever. That is why verification is split in two —
keep it that way.

Set `JWT_SECRET` in `.env` before deploying.
