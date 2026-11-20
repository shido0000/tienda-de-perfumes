# Guía de deploy y de reinicio de la base

> **Nombre del proyecto: `TiendaDePerfumes`.** Mover el chat a un proyecto se
> hace en el panel de NoCoder (sección 8), no en el código.

## Estado verificado de las cuentas del dueño (última comprobación)

Estos datos se probaron contra la base real, no son un ejemplo:

| Comprobación | Resultado |
| --- | --- |
| Conexión a Supabase (`ccdciluvdyxllbiaxuhe`) | OK — sesión del pooler 5432 verificada con la contraseña real |
| Estado de la base (verificado) | 23 tablas · 8 perfumes (los 8 con preguntas frecuentes) · 3 plantillas de campaña · 2 usuarios (1 administrador) |
| Host a usar siempre | `aws-0-us-east-1.pooler.supabase.com` (puerto 5432 para migrar, 6543 para la app) — el host `db.<ref>.supabase.co` NO resuelve desde el workspace |
| Login del panel (verificado) | `jonyperez1099@gmail.com` entra con la contraseña que definiste (comprobado contra la base real: coincide) |
| Conversión de "volvió este perfume" (verificado) | El cálculo cuenta la compra POSTERIOR al aviso y descarta la anterior: prueba automática `scripts/probe-restock-stats.mjs` → 1 de 1 = 100% |
| Dirección del sitio | Se vació la dirección de un deploy puntual de Vercel que había quedado guardada; ahora la app deduce el dominio real (o el propio cuando lo cargues en Administración → Contenido) |
| Tablas creadas | 23 tablas (`Product`, `User`, `Category`, `StoreSettings`, `StockAlert`, `CampaignTemplate`, …) |
| Contenido de la base | 8 perfumes, 7 categorías, 2 usuarios, 3 plantillas de campaña |
| Cuenta de administrador | `jonyperez1099@gmail.com` (rol ADMIN) |
| Preguntas frecuentes por perfume | Guardadas en las 8 fichas y visibles en la ficha pública |

## Cómo publicarlo en TUS cuentas (resumen en 3 pasos)

Tu base de Supabase (`TiendaPerfumes`) ya está **creada, con las 23 tablas, los 8
perfumes con sus preguntas frecuentes, las 3 plantillas de campaña y tu cuenta de
dueño**. Lo único que falta es que la web corra sobre ella, y eso se hace poniendo
las direcciones de la base en Vercel. Yo no puedo tocar tu cuenta de Vercel desde
aquí (no tengo tu clave de acceso), así que estos son los 3 pasos en tu pantalla:

1. **Vercel → tu proyecto → Settings → Environment Variables.** Agregá estas dos
   (marcá *Production*, *Preview* y *Development*):

   ```
   DATABASE_URL = postgresql://postgres.ccdciluvdyxllbiaxuhe:CONTRASEÑA@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true
   DIRECT_URL   = postgresql://postgres.ccdciluvdyxllbiaxuhe:CONTRASEÑA@aws-0-us-east-1.pooler.supabase.com:5432/postgres
   ```

   Donde dice `CONTRASEÑA` va la de tu base, codificada: `*` se escribe `%2A`, así
   que la tuya termina en `...0000%2A%2A`.

2. **Vercel → Deployments → Redeploy.** Al publicar, el proyecto crea/actualiza las
   tablas en Supabase solo (no borra nada de lo que ya hay).

3. **Entrá a `https://TU-DOMINIO/admin`** con tu correo y la contraseña que
   definiste. Todo lo demás (perfumes, preguntas frecuentes, plantillas, avisos)
   ya está cargado.

Para que Google te encuentre, después: Administración → **Contenido**, cargá tu
dominio en "Dirección del sitio" y el código de Search Console, y subí
`https://TU-DOMINIO/sitemap.xml` en Search Console → Sitemaps.

**Para cambiar la contraseña del dueño:** iniciá sesión, entrá a **Mi cuenta →
Perfil** y usá el bloque de contraseña (la actual y la nueva). La nueva se guarda
en la base y vale desde ese momento para entrar en `/admin`.

## 0. Deploy a las cuentas propias (Vercel + Supabase del dueño)


El proyecto de base de datos del dueño **ya está creado, con las tablas y los
datos de la tienda cargados**:

| Dato | Valor |
| --- | --- |
| Proyecto Supabase (id) | `ccdciluvdyxllbiaxuhe` |
| Organización | `shido0000's projects` (`vercel_icfg_rkOvyRow9XiVxTxywT4QiHQD`) |
| Región | `us-east-1` |
| Nombre del proyecto / base | `TiendaPerfumes` (base `postgres`) |
| Host del pooler | `aws-0-us-east-1.pooler.supabase.com` |
| Cuenta de Vercel | `shido0000` · equipo `shido0000s-projects` · `jonyperez1099@gmail.com` |

La base **ya tiene las tablas y los datos cargados** (8 perfumes, 7 categorías y
la cuenta de administrador). Verificado contra el servidor real, no supuesto.

### Cadenas de conexión a pegar en Vercel

En **Supabase → Project Settings → Database → Connection string** copiá las dos
(usá la contraseña de la base que elegiste al crear el proyecto):

- **Session pooler** (puerto `5432`) → es la que va en `DIRECT_URL`, la usa
  Prisma para crear las tablas. También sirve como `DATABASE_URL`.
- **Transaction pooler** (puerto `6543`, con `?pgbouncer=true`) → opcional para
  `DATABASE_URL` en producción. Aviso: `npx prisma db push` **falla** por ese
  puerto (error `prepared statement "s1" already exists`); las tablas se crean
  siempre por el 5432 y la app después puede usar el 6543.

Formato (lo que ya quedó verificado y funcionando):

```
DATABASE_URL="postgresql://postgres.ccdciluvdyxllbiaxuhe:CONTRASEÑA@aws-0-us-east-1.pooler.supabase.com:5432/postgres"
DIRECT_URL="postgresql://postgres.ccdciluvdyxllbiaxuhe:CONTRASEÑA@aws-0-us-east-1.pooler.supabase.com:5432/postgres"
```

Reemplazá `CONTRASEÑA` por la contraseña de la base. Si tiene caracteres
especiales (`*`, `#`, `@`, `%`), escribila **codificada para URL**: `*` es `%2A`,
`#` es `%23`, `@` es `%40`, `%` es `%25`. Ejemplo: la contraseña `Abc.1**`
se escribe `Abc.1%2A%2A`.

### Variables que hay que cargar en el deploy

| Variable | Para qué |
| --- | --- |
| `DATABASE_URL` | conexión de la app a la base (pooler, 6543) |
| `DIRECT_URL` | conexión directa para crear tablas (5432) |
| `JWT_SECRET` | firma de la sesión; cualquier texto largo y secreto |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | cuenta del dueño |
| `NEXT_PUBLIC_SITE_URL` | la URL pública, para que el sitemap y Google usen el dominio correcto |
| `CRON_SECRET` | (opcional) protege el trabajo automático de la cola de avisos |
| `RESEND_API_KEY` / `BREVO_API_KEY` | (opcional) envío de correo real |
| `WHATSAPP_TOKEN` / `WHATSAPP_PHONE_ID` | (opcional) envío por WhatsApp |

Después del primer deploy, el `postinstall` genera el cliente de Prisma. Si la
base está vacía, **cargá el catálogo desde el panel** (`/admin`): la app no carga
datos de ejemplo en ningún paso.

### Cómo publicar (la base ya está lista; falta solo conectar Vercel)

La parte de Supabase **ya está hecha y verificada**: el proyecto
`ccdciluvdyxllbiaxuhe` tiene sus 23 tablas, 8 perfumes con sus preguntas
frecuentes, las categorías, la cuenta de administrador y las plantillas de
campaña. No hay que volver a crear nada en la base.

Falta unicamente apuntar Vercel a esa base:

1. Entrá a Vercel con la cuenta `shido0000` (equipo `shido0000s-projects`) e
   importá el repositorio de este proyecto.
2. En **Settings → Environment Variables** cargá:

   ```
   DATABASE_URL="postgresql://postgres.ccdciluvdyxllbiaxuhe:CONTRASEÑA@aws-0-us-east-1.pooler.supabase.com:5432/postgres"
   DIRECT_URL="postgresql://postgres.ccdciluvdyxllbiaxuhe:CONTRASEÑA@aws-0-us-east-1.pooler.supabase.com:5432/postgres"
   JWT_SECRET=cualquier-cadena-larga-y-secreta
   NEXT_PUBLIC_SITE_URL=https://TU-DOMINIO
   ADMIN_EMAIL=jonyperez1099@gmail.com
   ADMIN_PASSWORD=la-contraseña-del-panel
   ```

   (`CONTRASEÑA` es la contraseña de la base que ya usaste; codificá `*` como
   `%2A`.)
3. Hacé **Deploy** y, cuando termine, tocá **Redeploy** una vez para que tome las
   variables.
4. Verificá que `https://TU-DOMINIO/api/health` responda OK y que la portada
   muestre los 8 perfumes. Entrá a `/admin` con `jonyperez1099@gmail.com`.

---


## 1. Por qué fallaba el deploy ("Failed to fetch")

El error `Failed to fetch` no viene de la base de datos ni del código: viene de la
**subida** del proyecto. La carpeta del proyecto pesaba más de 900 MB porque
incluía `node_modules` (617 MB) y `.next` (304 MB), que son archivos generados y
no tienen por qué viajar. La subida tardaba tanto que el navegador cortaba la
conexión antes de terminar.

Ya quedó resuelto con dos archivos nuevos en la raíz:

- **`.gitignore`** — le dice a git (y al deploy) que no suba `node_modules`,
  `.next`, `.env`, `*.tsbuildinfo` ni archivos internos.
- **`.vercelignore`** — la misma lista para Vercel, más los scripts de prueba.

Con eso el proyecto que se sube pesa **1,9 MB** en lugar de 900 MB. Vercel
instala las dependencias y compila por su cuenta.

Si vuelve a aparecer `Failed to fetch`, probá en este orden:

1. **Redeploy** otra vez (a veces es un corte puntual de red).
2. Cerrá sesión y volvé a entrar en el panel de NoCoder.
3. Si sigue: el build falla, no la subida. En ese caso el mensaje real está en el
   log del deploy; revisá primero que `npm run build` pase acá abajo.

## 2. Qué hace el deploy por su cuenta

Cada vez que publicás, Vercel:

1. crea (o reutiliza) una base Postgres del proyecto,
2. corre `npm install` y `prisma generate`,
3. corre `scripts/db-prepare.mjs`, que hace `prisma db push` (crea **sólo** las
   tablas que falten y nunca borra datos). **No carga filas de ejemplo**: la base
   de producción es la fuente de verdad y sus datos no se tocan,
4. compila la app.

Es idempotente: podés publicar cien veces y el catálogo no se duplica ni se
borra.

**Importante:** el paso 3 corre `db push` **sin** `--accept-data-loss`. Si algún
cambio del esquema pidiera borrar una columna o una tabla con datos, el push
falla, el build continúa y la app arranca con el esquema anterior. Nunca se
pierden datos en silencio.

## 3. Empezar de cero en la base de PRODUCCIÓN

Esto es lo que hay que hacer si querés el sitio publicado limpio, sin las
reservas y usuarios de prueba.

> ⚠️ Borra **todas** las reservas, usuarios y opiniones del sitio publicado. El
> catálogo y la cuenta de administrador se vuelven a crear solos.

**Opción A — la más simple: pedir una base nueva.**

1. En este panel, borrá la base provisionada del proyecto (o pedí que se
   reprovisione) y publicá con **Redeploy**.
2. El deploy crea una base vacía y `scripts/db-prepare.mjs` la deja lista sola:
   tablas + catálogo + admin.

**Opción B — si tenés acceso a la consola de Supabase del proyecto.**

1. Entrá al proyecto de Supabase del deploy → **SQL Editor**.
2. Corré esto para vaciar las tablas sin tocar la estructura:

```sql
TRUNCATE TABLE "ReservationItem", "Reservation", "CartItem", "WishlistItem",
  "Review", "StockAlert", "CheckoutIntent", "PushSubscription",
  "ChatMessage", "Campaign", "CurrencyRateLog", "WithdrawalRequest", "ComboItem",
  "Combo", "Banner", "Product", "Category", "User"
RESTART IDENTITY CASCADE;
```

3. Publicá con **Redeploy**: las tablas se recrean vacías y el catálogo se vuelve
   a cargar desde el panel de Administración.

**Opción C — desde acá, apuntando a la base de producción.**

```bash
# 1. poné las URLs de la base de producción en .env
#    (DATABASE_URL y DIRECT_URL, las mismas que ve el deploy)
# 2. guardá una copia antes, por las dudas
pg_dump "$DIRECT_URL" > copia-antes-de-reiniciar.sql
# 3. vaciá las tablas, recreálas y cargá el catálogo
npm run db:reset
```

`npm run db:reset` **no** borra el esquema de Postgres ni la base: borra las
tablas una por una, las vuelve a crear con el esquema actual y **deja las tablas
vacías** (no carga datos de ejemplo).
(Este detalle importa: `prisma db push --force-reset` sí borraba el esquema
entero y dejaba la base inutilizable, porque el usuario de la app no tiene
permiso para recrearlo. Por eso ese comando ya no se usa.)

## 4. Reiniciar solo la base de PREVIEW (la de este panel)

```bash
npm run db:reset
```

Deja la base de este panel como recién instalada: catálogo de ejemplo, ajustes
iniciales y la cuenta de administrador.

## 5. Verificar que quedó bien

```bash
curl https://tu-dominio.com/api/health
```

```json
{
  "ok": true,
  "productCount": 8,
  "categoryCount": 5,
  "adminExists": true,
  "checks": { "database": true, "catalogLoaded": true, "categoriesLoaded": true, "adminExists": true }
}
```

Si `productCount` es 0, la base quedó vacía: hay que cargar el catálogo desde
**Administración** (`/admin`). La app no carga datos de ejemplo en ningún paso,
así que una base vacía se llena desde el panel, nunca con un seed.

### Antes de cada cambio grande: copia de la base

```bash
# con DIRECT_URL (la conexión directa, sin el pooler) en el entorno
pg_dump "$DIRECT_URL" > copia-antes-de-cambiar.sql
```

Para restaurarla: `psql "$DIRECT_URL" < copia-antes-de-cambiar.sql`. Si usás
Supabase, también sirve *Database → Backups* en su panel: guardá un punto de
restauración manual antes de tocar el esquema.

### La cuenta de administrador del deploy

La cuenta del dueño **ya existe en la base de producción** y la app no crea
cuentas automáticamente. Para crear otra cuenta de administrador, entrá al panel
con la que ya tenés y usá **Administración → Usuarios**. Para cambiar una
contraseña, usá **Mi cuenta → Perfil**.

### El asistente IA

El chat funciona sin configurar nada (responde con los datos reales de la
tienda). Para conectar un modelo: **Administración → Asistente IA**, elegís
proveedor, pegás la clave y guardás. También vale `OPENROUTER_API_KEY` /
`GROQ_API_KEY` / `GEMINI_API_KEY` como variables del deploy.

**Sobre la clave de OpenRouter:** los modelos que OpenRouter regalaba
(`nombre:free`) ya no existen — la API devuelve "no longer available". Con una
clave de OpenRouter el asistente usa por defecto **GPT-6 Luna**, que cuesta
fracciones de centavo por conversación (con el saldo de prueba alcanza para
miles de mensajes). Si un modelo desaparece, el asistente prueba
automáticamente los otros dos de la lista antes de caer a sus respuestas por
reglas, así nunca queda mudo. Si querés costo cero sí o sí, usá Groq o Gemini,
que mantienen plan gratuito.

## 6. Para que Google muestre la tienda

Una web nueva no aparece en Google por existir: Google tiene que encontrarla,
revisarla y decidir que vale la pena mostrarla. La web ya está preparada
(sitemap, robots, datos estructurados de tienda y de cada perfume, y preguntas
frecuentes de cada ficha). Lo que falta es avisarle a Google.

**El punto más importante: la dirección del sitio.** Una URL de Vercel del tipo
`mistandmood-6x5vec3ke-nocoder1.vercel.app` es la dirección de **una**
publicación. Cada vez que se publica, Vercel genera una distinta y la vieja deja
de ser la principal, así que Google nunca llega a indexar nada (y lo poco que
indexó, lo pierde). Para aparecer en las búsquedas hace falta una dirección fija:
conectar un **dominio propio** (por ejemplo `mistandmood.com`) en Vercel →
Settings → Domains, y dejarlo escrito en **Administración → Contenido → Dirección
del sitio**. Después de eso, la misma dirección sirve para siempre.

Pasos, en orden:

1. **Dominio propio** conectado en Vercel (el paso que desbloquea todo lo demás).
2. En **Administración → Contenido → Cómo te encuentra Google**, revisar el
   título, la descripción y las palabras clave. Son los textos que Google muestra
   en el resultado.
3. Entrar a [Search Console](https://search.google.com/search-console), agregar la
   dirección como propiedad y copiar el código de verificación. Pegarlo en el campo
   **Código de Google Search Console** del panel y guardar.
4. En Search Console → **Sitemaps**, cargar `https://TU-DOMINIO/sitemap.xml`.
5. En Search Console → **Inspección de URL**, pegar la portada y tocar
   **Solicitar indexación**.

Cuánto tarda: unos días si la web es nueva (a veces 1-2 semanas). Buscar el
nombre exacto de la tienda funciona antes que buscar "perfumes La Habana",
porque para las palabras genéricas Google compite con miles de sitios y pesa la
antigüedad del dominio.

Las preguntas frecuentes de cada perfume se cargan en **Productos → editar un
perfume → Preguntas frecuentes de este perfume**. Además de verse en la ficha,
Google puede mostrarlas directamente en el resultado de búsqueda.

## 7. A qué cuenta están subiendo las cosas

| Qué | Valor |
| --- | --- |
| Publicación del sitio | Vercel, cuenta **`shido0000`** (equipo `shido0000s-projects`, `jonyperez1099@gmail.com`) |
| Base de datos | Supabase del dueño, proyecto **`ccdciluvdyxllbiaxuhe`**, región `us-east-1`, base `TiendaPerfumes` |
| Usuario de base | `postgres` (el dueño del proyecto de Supabase) |

Estas son las cuentas del dueño, ya configuradas para este proyecto. La base de
datos del proyecto de Supabase **ya está creada con las tablas y los datos**
(verificado por conexión directa): 8 perfumes, 7 categorías, 2 combos, 2 banners
y la cuenta de administrador.

### Lo que falta de tu lado para que el deploy use ESA base

El deploy de esta página aprovisiona su propia base. Para que apunte a la tuya:

1. En Vercel, proyecto del sitio → **Settings → Environment Variables**.
2. Cargá (con la contraseña de la base):
   - `DATABASE_URL` = `postgresql://postgres.ccdciluvdyxllbiaxuhe:CONTRASEÑA@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true`
   - `DIRECT_URL` = `postgresql://postgres.ccdciluvdyxllbiaxuhe:CONTRASEÑA@aws-0-us-east-1.pooler.supabase.com:5432/postgres`
3. Redeploy. El build sincroniza el esquema y carga el catálogo solo.

> La contraseña de la base nunca se escribe en ningún archivo del proyecto. Si
> tiene caracteres especiales, codificala para URL (`*` → `%2A`).


## 8. Proyecto "TiendaDePerfumes" y qué credencial de Vercel hace falta

### El proyecto y este chat

El nombre del proyecto es **TiendaDePerfumes** (el paquete del código ya se llama
`tienda-de-perfumes`). Crear el proyecto y mover un chat de un proyecto a otro se
hace **solo desde el panel de NoCoder**, no desde el código:

1. En el panel de NoCoder, **New project** → nombre `TiendaDePerfumes` → crear.
2. Abrir esta conversación y, en el menú de la conversación (los tres puntos de
   arriba a la derecha), elegir **Move to project** → `TiendaDePerfumes`.

Por qué el chat "no aparece" en Proyectos pero sí en *Todos los proyectos*: un
chat sin proyecto asignado queda en el grupo suelto, y la vista **Proyectos**
solo muestra los que ya tienen uno. Mientras no se mueva, sigue estando ahí y no
se pierde nada.

### Qué pedirle a Vercel (y qué NO mandar)

Lo que hace falta es un **token de acceso a la API de Vercel** (un texto largo
que empieza con `vercel_`). No hacen falta ni la contraseña de la cuenta ni un
código OTP de login, y **no hay que enviarlos**.

Cómo se saca:

1. Entrar a Vercel con la cuenta `shido0000`.
2. **Account Settings → Tokens → Create Token**.
3. Nombre: `nocoder`. Scope: el equipo **`shido0000s-projects`**
   (si queda en *Personal*, el token no puede publicar en el proyecto del equipo).
   Expiración: la más corta que sirva (1 día alcanza).
4. Copiar el token **en el momento** (Vercel lo muestra una sola vez) y pasarlo
   por acá.

Con ese token se puede **publicar el proyecto por línea de comandos**
(`npx vercel --prod`) cargando antes las variables de entorno
(`DATABASE_URL`, `DIRECT_URL`, `JWT_SECRET`, `NEXT_PUBLIC_SITE_URL`,
`ADMIN_EMAIL`, `ADMIN_PASSWORD`). Sin token, la publicación se hace con el botón
**Deploy** (el cohete) del panel de NoCoder.

Recomendaciones al terminar:

- **Revocar el token** en Vercel (Account Settings → Tokens → Revoke) una vez que
  el sitio quedó publicado.
- Si el token se pega en un chat, tratarlo como una contraseña: da acceso de
  publicación a todo el equipo.

### Contraseñas y claves

- La contraseña de la base de Supabase se usa **solo** dentro de las cadenas
  `DATABASE_URL` / `DIRECT_URL` (codificando `*` como `%2A`) y nunca se escribe
  en un archivo del proyecto.
- Si la contraseña de la base se compartió por chat o por correo, cambiarla en
  Supabase (**Project Settings → Database → Reset database password**) y
  actualizar las dos variables en Vercel.

## 9. Errores conocidos y su causa

| Mensaje del deploy | Causa | Solución |
| --- | --- | --- |
| `Failed to fetch` | El proyecto subía `node_modules` y `.next` (900 MB) y la subida se cortaba | Ya resuelto con `.gitignore` y `.vercelignore` |
| `este cambio en el esquema destruiría datos existentes` | El esquema ya no coincide con las columnas reales de la base | Alinear el esquema a la base o vaciar las tablas (sección 3) |
| `no schema has been selected to create in` | Se borró el esquema de Postgres, no solo las tablas | Pedir que se reprovisione la base; nunca usar `--force-reset` |
| La web abre pero sin productos | La base del deploy está vacía | La app ya **no** carga datos de ejemplo (protege los datos de producción). Cargá el catálogo desde **Administración → Productos** |
| No puedo entrar como administrador | La base no tiene esa cuenta o la contraseña no coincide | La app no crea cuentas sola; pedile a otro administrador que la restablezca desde **Administración → Usuarios** |
