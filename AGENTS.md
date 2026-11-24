# AGENTS.md

## Project

- Next.js 15 App Router storefront for a perfume shop, React 18.3.1.
- Database: Cloudflare D1 (SQLite) through Prisma 5.18 with `@prisma/adapter-d1` and the `DB` binding.
- Primary deploy target: Cloudflare Workers via `@opennextjs/cloudflare`.
- Vercel stays configured as a backup (`vercel.json`, `.vercel/project.json`).
- Do not commit or deploy unless explicitly asked. The owner performs the real deploy manually.

## Setup and commands

- Node: use `22.12.0` or newer (`.nvmrc`); Wrangler 4.166 requires at least Node `22.12.0`.
- Install: `npm install` (if dependency resolution stalls, use `npm install --legacy-peer-deps`).
- Local dev: `npm run dev` (`http://localhost:3000`).
- Vercel build: `npm run build` runs `prisma generate`, then `next build`. It never touches the database.
- Cloudflare build: `npm run build:worker`.
- Cloudflare local preview: `npm run preview`.
- Cloudflare deploy/upload: `npm run deploy` / `npm run upload` (manual, owner only).
- Types: `npx tsc --noEmit`.
- End-to-end check: `npm run test:regression` (set `BASE_URL` and admin credentials via environment; no admin credentials in source).

## Environment and deploy

- Cloudflare local secrets go in `.dev.vars` (gitignored). There is no database secret: D1 is a binding.
- Cloudflare bindings come from `wrangler.jsonc`: `ASSETS`, `DB` (D1) and `WORKER_SELF_REFERENCE`. There is no `HYPERDRIVE` binding.
- `DATABASE_URL="file:./dev.db"` in `.env` is only for Prisma CLI and `next dev`; runtime uses `getCloudflareContext().env.DB`.
- `SUPABASE_DATABASE_URL` / `SUPABASE_DIRECT_URL` in `.env` are only for the one-time export script; never used by the app.
- Set `JWT_SECRET` explicitly. `lib/auth.ts` currently falls back to `dev-secret-change-me`, which is not safe for production.
- Keep `NEXT_PUBLIC_SITE_URL` as a full `https://` URL, plus optional mail/WhatsApp/cron keys.
- The Vercel cron in `vercel.json` was not migrated to Cloudflare. It still only runs on Vercel.
-`.github/workflows/deploy.yml` is the only deploy path: it applies D1 schema, seeds the admin idempotently, builds and deploys on push to `main`. Disable Cloudflare Workers Builds auto-deploy to avoid duplicate deployments.
- GitHub Actions needs secrets `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, `JWT_SECRET` and `SEED_ADMIN_PASSWORD_HASH`, plus variable `NEXT_PUBLIC_SITE_URL`.

## Domain traps

- The production database is the only source of truth. Never seed demo data; `prisma/seed` is intentionally a no-op.
- `npm run db:reset` uses local SQLite only (`prisma/dev.db`); it is destructive, requires `CONFIRM_RESET=1`, and must never be used against D1 production data.
- D1 schema bootstrap is manual for local development and automated in the deploy workflow: `.github/workflows/deploy.yml` runs migrations and an idempotent admin seed on `main`. Never add migrations/seed to `postinstall` or `npm run build`.
- Prisma 5.18 SQLite has no `Json` type; JSON-ish fields are `String` containing JSON text. Parse them with `lib/json.ts` helpers.
- `@prisma/adapter-d1` ignores transactions; do not rely on `$transaction` for atomicity in D1.
- SQLite has no case-insensitive Prisma `mode`; searches are case-sensitive until normalized explicitly.
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
4. `npm run build:worker`.
5. `npm run preview`, then smoke-check the home page, `/api/health`, `/login`, `/admin`, and one manager link.
6. `npm run test:regression` against the preview URL with credentials supplied via environment.
