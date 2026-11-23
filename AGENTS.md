# AGENTS.md

## Project

- Next.js 15 App Router storefront for a perfume shop, React 18.3.1.
- Database: Supabase Postgres through Prisma 5.18 with `@prisma/adapter-pg`.
- Primary deploy target: Cloudflare Workers via `@opennextjs/cloudflare`.
- Vercel stays configured as a backup (`vercel.json`, `.vercel/project.json`).
- Do not commit or deploy unless explicitly asked. The owner performs the real deploy manually.

## Setup and commands

- Install: `npm install` (if dependency resolution stalls, use `npm install --legacy-peer-deps`).
- Local dev: `npm run dev` (`http://localhost:3000`).
- Vercel build: `npm run build` runs `prisma generate`, `db-repair`, `db-prepare`, then `next build`.
- Cloudflare build: `npm run build:worker`.
- Cloudflare local preview: `npm run preview`.
- Cloudflare deploy/upload: `npm run deploy` / `npm run upload` (manual, owner only).
- Types: `npx tsc --noEmit`.
- End-to-end check: `npm run test:regression` (set `BASE_URL` and admin credentials via environment; no admin credentials in source).

## Environment and deploy

- Cloudflare local secrets go in `.dev.vars` (gitignored). Loaded by `scripts/db-prepare.mjs`, `scripts/db-repair.mjs`, and `scripts/reset-db.mjs`.
- Cloudflare bindings come from `wrangler.jsonc`: `ASSETS` and `WORKER_SELF_REFERENCE`. There is no `HYPERDRIVE` binding.
- Database access uses the `DATABASE_URL` runtime secret (transaction pooler, port 6543, `?pgbouncer=true`). Do not add a `HYPERDRIVE` binding without a real ID.
- `DIRECT_URL` (session pooler, port 5432) is for Prisma schema operations only.
- Set `JWT_SECRET` explicitly. `lib/auth.ts` currently falls back to `dev-secret-change-me`, which is not safe for production.
- Keep `Vercel` env vars intact: `DATABASE_URL`, `DIRECT_URL`, `JWT_SECRET`, `NEXT_PUBLIC_SITE_URL`, plus optional mail/WhatsApp/cron keys.
- The Vercel cron in `vercel.json` was not migrated to Cloudflare. It still only runs on Vercel.

## Domain traps

- The production database is the only source of truth. Never seed demo data; `prisma/seed` is intentionally a no-op.
- `npm run db:reset` is destructive. It requires `CONFIRM_RESET=1` and should only be used on a test database.
- `db-repair` and `db-prepare` add columns/tables only. They never delete data and never run seeds.
- Store currency is chosen in Administración → Ajustes. There is no visitor currency selector; shipping is always shown and charged in CUP.
- Manager links are `/r/<managerCode>` and set the `mm_ref` cookie. While present, all displayed prices include that manager's markup.
- Do not derive the current user from request bodies or query params. Use `getCurrentUser()` / `requireAdmin()` from `lib/session.ts`.
- Login path is `/login` (not `/signin`); `lib/edge-auth.ts` verifies tokens in middleware, `lib/auth.ts` signs them in the Node runtime.
- Next 15 async APIs: `cookies()` and `headers()` must be awaited; route/page `params` are Promises.

## Docs caveats

- `AUTH.md` is stale: `withAuth` does not exist, and the sign-in path is `/login`, not `/signin`.
- `README.md` still mentions a visitor currency selector; the store-wide setting is authoritative.
- `GUIA-DEPLOY.md` is Vercel-focused and contains old operational notes. Prefer this file for Cloudflare work.

## Verification before finishing

1. `npm install` must produce `package-lock.json` and a usable `node_modules`.
2. `npx tsc --noEmit`.
3. `npm run build`.
4. `npm run preview`, then smoke-check the home page, `/api/health`, `/login`, `/admin`, and one manager link.
5. `npm run test:regression` against the preview URL with credentials supplied via environment.
