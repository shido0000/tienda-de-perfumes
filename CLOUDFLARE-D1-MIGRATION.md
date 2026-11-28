# Cloudflare D1 Migration

## Estado actual
- DB: Cloudflare D1 / SQLite (`prisma/schema.prisma` usa `provider = "sqlite"`).
- Runtime: `lib/db.ts` usa `@prisma/adapter-d1` con binding `DB` en el Worker; desde Render usa `lib/d1-http.ts` contra `app/api/internal/d1/route.ts` en el Worker.
- Build: no ejecuta DB. `npm run build` = `prisma generate && next build`.
- `migrations/0001_init.sql` creado y aplicado localmente en este workspace.
- `wrangler.jsonc` usa `database_id = "c5cf1178-9e09-4a12-b567-a9aff41ad8b3"`.
- Decisión actual: **no migrar datos de Supabase**; solo esquema inicial + usuario admin `jonyperez1099@gmail.com` con rol `ADMIN`.
- Usuario admin ya sembrado y verificado en D1 local con hash bcrypt; contraseña no almacenada en texto plano.

## Despliegue automático
- `.github/workflows/deploy.yml` corre en push a `main` y por `workflow_dispatch`.
- El workflow aplica migraciones pendientes con `wrangler d1 migrations apply --remote -y`, dispara el deploy de Render con `POST /services/{serviceId}/deploys` de la Render API, ejecuta `npm run build:worker` y despliega el Worker de respaldo con `cloudflare/wrangler-action@v4`.
- Producción nunca se siembra ni se sobrescribe: las migraciones ya aplicadas se registran en `d1_migrations` y la fila existente del admin queda intacta.
- Desactivar Cloudflare Workers Builds auto-deploy para evitar dos despliegues por push. Render tiene `autoDeployTrigger: "off"` y solo se despliega desde el workflow.

## Secrets y variables en GitHub
- Secrets: `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, `JWT_SECRET`, `D1_PROXY_TOKEN`, `CRON_SECRET`, `RENDER_API_KEY`, `RENDER_SERVICE_ID`.
- Variables: `NEXT_PUBLIC_SITE_URL=https://<tu-servicio>.onrender.com`, `RENDER_SITE_URL=https://<tu-servicio>.onrender.com`.
- `D1_PROXY_TOKEN` debe coincidir entre Render, el Worker y GitHub Actions. `JWT_SECRET` debe coincidir entre Render y el Worker.
- Opcionales en Render/Worker: mail/WhatsApp/cron keys.

## Uso local (sin tocar remoto)
```bash
npx wrangler d1 migrations apply tienda-perfumes-db --local
```
`0001_init.sql` crea tablas. Para sembrar el admin local se usó un hash bcrypt con `INSERT ... ON CONFLICT(email) DO UPDATE`.

## Cloudflare Worker env
- `JWT_SECRET` (secreto)
- `D1_PROXY_TOKEN` (secreto, compartido con Render)
- `NEXT_PUBLIC_SITE_URL` (valor heredado del deploy; Render usa el suyo propio)
- Opcionales: mail/WhatsApp/cron keys

## Render env
- `D1_PROXY_URL=https://<tu-worker>.workers.dev/api/internal/d1`
- `D1_PROXY_TOKEN`, `JWT_SECRET`, `CRON_SECRET` (secretos)
- `NEXT_PUBLIC_SITE_URL=https://<tu-servicio>.onrender.com` (se incrusta en el build; cambiar y redeploy si cambia el hostname)
- `DATABASE_URL=file:./dev.db` solo para Prisma CLI; no se usa en runtime
- La URL guardada en Administración → Ajustes tiene prioridad sobre `NEXT_PUBLIC_SITE_URL`.

## Verificación
Ejecutado en este workspace con éxito:
```bash
npx prisma validate
npx tsc --noEmit
npm run build
npm run build:worker
```
Smoke local con D1 migrado: `/api/health`, `/`, `/login`, `/admin`, `/r/test`, `/api/products` → `200`.
Pendiente: configurar secrets/vars en GitHub, crear el servicio de Render con la Render API, desactivar Workers Builds auto-deploy, pushear a `main`, verificar el workflow y correr smoke remoto + `npm run test:regression`.

## Limitaciones conocidas
- Prisma 5.18 SQLite no soporta `Json`; los campos JSON se guardan como `TEXT` y se parsean en helpers.
- `@prisma/adapter-d1` ignora transacciones; el flujo de payouts quedó best-effort.
- SQLite no soporta búsquedas `insensitive`; las búsquedas son case-sensitive.
- `app/api/diagnostics/route.ts` fue eliminado; no volver a agregarlo sin autenticación.
