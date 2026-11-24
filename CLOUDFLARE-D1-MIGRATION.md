# Cloudflare D1 Migration

## Estado actual
- DB: Cloudflare D1 / SQLite (`prisma/schema.prisma` usa `provider = "sqlite"`).
- Runtime: `lib/db.ts` usa `@prisma/adapter-d1` con binding `DB`.
- Build: no ejecuta DB. `npm run build` = `prisma generate && next build`.
- `migrations/0001_init.sql` creado y aplicado localmente en este workspace.
- `wrangler.jsonc` usa `database_id = "c5cf1178-9e09-4a12-b567-a9aff41ad8b3"`.
- Decisión actual: **no migrar datos de Supabase**; solo esquema inicial + usuario admin `jonyperez1099@gmail.com` con rol `ADMIN`.
- Usuario admin ya sembrado y verificado en D1 local con hash bcrypt; contraseña no almacenada en texto plano.

## Despliegue automático
- `.github/workflows/deploy.yml` corre en push a `main` y por `workflow_dispatch`.
- El workflow aplica `0001_init.sql` con `wrangler d1 migrations apply --remote -y`, siembra el admin con `INSERT ... ON CONFLICT(email) DO UPDATE`, ejecuta `npm run build:worker` y despliega con `cloudflare/wrangler-action@v4`.
- El seed admin es idempotente: no agrega datos de ejemplo y no cambia el `id` del usuario existente.
- La contraseña del admin nunca se guarda en texto plano; se usa `SEED_ADMIN_PASSWORD_HASH` como GitHub Secret.
- Desactivar Cloudflare Workers Builds auto-deploy para evitar dos despliegues por push.

## Secrets y variables en GitHub
- Secrets: `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, `JWT_SECRET`, `SEED_ADMIN_PASSWORD_HASH`.
- Variable: `NEXT_PUBLIC_SITE_URL=https://<tu-worker>.workers.dev`.
- Opcional: variable `SEED_ADMIN_EMAIL` (por defecto `jonyperez1099@gmail.com`).
- Opcionales en Cloudflare Dashboard: mail/WhatsApp/cron keys.

## Uso local (sin tocar remoto)
```bash
npx wrangler d1 migrations apply tienda-perfumes-db --local
```
`0001_init.sql` crea tablas. Para sembrar el admin local se usó un hash bcrypt con `INSERT ... ON CONFLICT(email) DO UPDATE`.

## Cloudflare Worker env
- `JWT_SECRET` (secreto)
- `NEXT_PUBLIC_SITE_URL=https://<tu-worker>.workers.dev`
- Opcionales: mail/WhatsApp/cron keys

## Verificación
Ejecutado en este workspace con éxito:
```bash
npx prisma validate
npx tsc --noEmit
npm run build
npm run build:worker
```
Smoke local con D1 migrado: `/api/health`, `/`, `/login`, `/admin`, `/r/test`, `/api/products` → `200`.
Pendiente: configurar secrets/vars en GitHub, desactivar Workers Builds auto-deploy, pushear a `main`, verificar el workflow y correr smoke remoto + `npm run test:regression`.

## Limitaciones conocidas
- Prisma 5.18 SQLite no soporta `Json`; los campos JSON se guardan como `TEXT` y se parsean en helpers.
- `@prisma/adapter-d1` ignora transacciones; el flujo de payouts quedó best-effort.
- SQLite no soporta búsquedas `insensitive`; las búsquedas son case-sensitive.
- `app/api/diagnostics/route.ts` fue eliminado; no volver a agregarlo sin autenticación.
