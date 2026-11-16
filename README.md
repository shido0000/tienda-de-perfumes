# Mist & Mood — perfumería de nicho (reservas online)

Tienda de perfumes donde el cliente **reserva** fragancias: arma el carrito, elige
retiro en tienda o envío por kilómetro (calculado por distancia), paga en efectivo
o por transferencia, y la tienda confirma cada reserva desde el panel de administración.

La moneda base de la tienda es el **peso cubano (CUP)**. El visitante puede ver los
precios en USD, EUR o MLC desde el selector del encabezado; la tienda define las
cotizaciones en **Administración → Ajustes**.

> **Deploy y reinicio de la base:** ver **[GUIA-DEPLOY.md](GUIA-DEPLOY.md)**.
> Ahí está qué hacer si el deploy falla con `Failed to fetch`, cómo empezar la
> base de producción de cero sin perder el catálogo y cómo reiniciar la base de
> prueba con `npm run db:reset`.

## Qué puede hacer cada quien

**Cliente**
- Ver el catálogo con filtros por familia olfativa, buscador y ficha de producto con notas.
- Cambiar la moneda de visualización (CUP por defecto, más USD / EUR / MLC).
- Guardar favoritos en la lista de deseos y sumar varios productos al carrito.
- Checkout: retiro o envío por km con mapa, datos de contacto, nota opcional.
- Pagar en efectivo (pago al retirar/recibir) o por transferencia (adjuntando la imagen del comprobante).
- Ver sus reservas, su estado y volver a pedir.
- Entrar a **Mi cuenta**: un resumen de sus compras y la edición de su nombre, teléfono y contraseña.

**Administración** (`/admin`)
- Productos: crear, editar, precio en CUP, stock, categoría, notas, visibilidad y fotos (URL).
- Reservas: ver todas, cambiar estado y confirmar el pago.
- Ajustes de la tienda: nombre, eslogan, WhatsApp, dirección y coordenadas, tarifas de
  envío (base, por km, radio máximo), monedas y cotizaciones, datos bancarios.
- Categorías: crear, renombrar y eliminar las familias del catálogo.
- Usuarios: ver a todos los clientes y darles o quitarles el acceso de administrador.
- Campañas: preparar publicaciones para Facebook, Instagram, WhatsApp y X.
- Dashboard: ingresos, reservas por estado, más vendidos y productos por reponer.

## Cómo entrar como administrador

La cuenta del dueño la crea el seed con los valores de `ADMIN_EMAIL` y
`ADMIN_PASSWORD`. **Definí esas dos variables en el deploy antes de publicar**
(la contraseña no se escribe en este archivo a propósito: cualquiera que lea el
repositorio podría usarla).

Si no las definís, el seed usa los valores por defecto de `prisma/seed.ts` y
avisa por consola. Esos valores son de prueba: cambialos antes de abrir la tienda.

Entrá por `/login` (hay un enlace “¿Administrás la tienda?” debajo del formulario)
y después abrí **Panel** en el menú.

Para cambiar la contraseña: poné un valor nuevo en `ADMIN_PASSWORD` (variables del
deploy) y volvé a correr `npm run db:seed`. La cuenta se actualiza (upsert), no se
duplica, y no hay que borrar datos.

## Deploy: por qué no había productos y no se podía entrar

El deploy crea una base Postgres vacía. Si el esquema y los datos iniciales no se
cargan contra **esa** base, la portada aparece sin productos y no existe ninguna
cuenta de administrador.

Ahora el build se encarga solo: `npm run build` ejecuta `scripts/db-prepare.mjs`,
que hace `prisma db push` (crea las tablas) y `prisma db seed` (ajustes, catálogo y
cuenta de administrador) antes de compilar. Es idempotente: correrlo mil veces deja
la misma base, sin duplicar perfumes.

Para comprobar el estado después de un deploy, abrí `/api/health`:

```json
{ "ok": true, "productCount": 8, "adminExists": true }
```

Si `productCount` es 0 o `adminExists` es `false`, corré `npm run db:push && npm run db:seed`
en el entorno donde vive la base (necesita `DATABASE_URL` y, si usás un pooler,
también `DIRECT_URL` para las migraciones).

Si la base todavía no está disponible, la portada **no se rompe**: muestra un
estado vacío y el catálogo aparece en cuanto el seed termina.

## Datos de ejemplo que hay que reemplazar

Estos valores son de mentira y están pensados para que los cambies desde
**Administración → Ajustes** (no hace falta tocar código):

- Nombre y eslogan de la tienda, WhatsApp y dirección (`Calle Ejemplo 145, La Habana`).
- Coordenadas de la tienda (se usan para calcular el envío por km).
- Datos bancarios de la transferencia (`Banco Ejemplo`, CUENTA/Alias).
- Tarifas de envío: base, por km y radio máximo.
- Cotizaciones de moneda (CUP = 1; USD, EUR y MLC valen N pesos cubanos).
- Productos, marcas, precios y fotos del catálogo (las fotos actuales son de ejemplo).

Los textos legales (términos, privacidad, cookies, reservas y pagos)
son plantillas: revisalos antes de publicar.

## Nombre de la tienda y tema claro / oscuro

El nombre **Mist & Mood** vive en un solo lugar que manda: los ajustes de la tienda
en la base de datos. Se cambia desde **Administración → Ajustes → Nombre**, y con eso
cambian el encabezado, el pie y los mensajes de WhatsApp.

El botón de sol/luna en el encabezado alterna entre **tema claro y oscuro**. La
elección se recuerda en el navegador; si nadie eligió todavía, se respeta la
preferencia del sistema operativo. Los colores del modo oscuro son los mismos
nombres de token con otros valores (fondos casi negros, texto marfil, acento
burdeos aclarado), definidos en `app/globals.css` bajo `.dark`.

## Moneda y locale

Configurado para Cuba: **CUP** como moneda base, precios formateados en es-CU y
envío calculado en kilómetros. Las monedas y sus cotizaciones se editan en Ajustes.

**La moneda la elige la tienda, no el cliente.** En Administración → Ajustes hay un
selector *“Moneda en la que el cliente ve los precios”*: todo el catálogo, el carrito
y el checkout se muestran en esa moneda. El envío a domicilio, en cambio, **siempre se
cobra y se muestra en CUP**, porque es el costo real del reparto.

## Aviso de reservas por WhatsApp

Cada reserva nueva intenta avisar a los números cargados en Administración → Ajustes →
*Avisos de reservas por WhatsApp*. El mensaje sale solo si en el servidor hay
`WHATSAPP_TOKEN` y `WHATSAPP_PHONE_ID` (API Cloud de Meta); no hace falta ninguna otra
configuración. Si esas variables no están, la reserva igual se registra: en el panel,
cada reserva muestra el teléfono del cliente con un enlace de WhatsApp listo para
escribirle, y la administración puede reenviar el aviso a mano.

## Avisos de reservas en el móvil (notificaciones push)

En Administración → Ajustes… (la tarjeta **Avisos de reservas**) el dueño pulsa
*Activar avisos* en cada dispositivo (móvil, tablet, PC) y desde ese momento el
sistema le muestra una notificación cuando entra una reserva, incluso con la web
cerrada. Funciona como el aviso de WhatsApp: es una notificación del sistema.

No hay que configurar nada en el servidor: las claves del aviso (VAPID) se generan
solas la primera vez y se guardan en la base. Si se prefiere fijarlas por entorno,
`VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` y `VAPID_SUBJECT` tienen prioridad.

Con *Enviar prueba* se comprueba que el aviso llega a ese dispositivo. En iPhone hay
que instalar antes la app desde Compartir → Añadir a inicio.

## Asistente con IA (chat del sitio)

El botón de chat de la esquina responde dudas del catálogo, envíos, pagos y
reservas. Funciona **también sin configurar nada**: si no hay modelo conectado,
contesta con respuestas armadas a partir de los datos reales de la tienda
(precios, stock, categorías).

Para conectarlo a un modelo de IA **gratuito**:

1. Entrá a **Administración → Asistente IA**.
2. Elegí el proveedor: **Groq**, **Google AI Studio (Gemini)** u **OpenRouter**.
   Los tres tienen capa gratuita; cada opción muestra el enlace para sacar la
   clave.
3. Pegá la clave, elegí un modelo y guardá. Se aplica al instante, sin redeploy.

La clave se guarda en la base de la tienda; si preferís fijarla por entorno,
valen `GROQ_API_KEY`, `GEMINI_API_KEY` u `OPENROUTER_API_KEY` (tienen prioridad
sobre las de la base). Si el modelo falla, cae solo a las respuestas por reglas.

## Instalar la web en el móvil (app)

En el encabezado y en el pie hay un botón **Instalar app**. En Android/Chrome
abre el aviso del sistema para agregarla al inicio; en iPhone muestra los pasos
(Compartir → Añadir a inicio). Cuando hay una versión nueva, ese mismo botón
pasa a decir **Actualizar** y recarga la copia más reciente.

## Banners de la portada

La franja de banners de la portada **mantiene el marco fijo** y solo cambia el
texto, la imagen y los datos de cada banner (con un cruce suave). No se rearma
el bloque entero entre banner y banner, así que el cambio no "salta".

## Cómo se llama el proyecto

El proyecto se llama **TiendaDePerfumes**. Para tener el chat dentro de ese
proyecto: en el panel de NoCoder, crear el proyecto `TiendaDePerfumes` y, desde el
menú de esta conversación (los tres puntos de arriba a la derecha), elegir
**Move to project → TiendaDePerfumes**. Un chat sin proyecto aparece solo en
*Todos los proyectos*, por eso no sale en la vista *Proyectos*.

Para publicar en Vercel hace falta un **token de la API** (Account Settings →
Tokens → Create Token, con scope del equipo `shido0000s-projects`); no hacen falta
la contraseña de la cuenta ni un código de acceso. Después de publicar, revocá el
token. Detalle completo en `GUIA-DEPLOY.md`, sección 8.

## Herramientas para vender más (nuevas)

En el panel hay tres pestañas nuevas, además de lo que ya estaba:

- **Alertas** — junta todo lo que conviene atender hoy:
  - *Stock bajo*: perfumes con 0, 1 o 2 unidades, marcados en rojo.
  - *Avísame cuando llegue*: la lista de espera que dejan los clientes en la ficha
    de un perfume agotado. Cada uno trae su WhatsApp con un botón para escribirle.
    Al cargar unidades nuevas, marcá "Avisado" y luego "Cerrar".
  - *Llegaron al pago y no terminaron*: clientes que armaron el carrito y no
    confirmaron la reserva, con el resumen del carrito y su WhatsApp.
  - *Sin confirmar hace 24 h*: reservas con pago pendiente y sin comprobante. El
    stock está inmovilizado; escribiles o cancelá para liberarlo.
- **Opiniones** — moderación. Solo se publican en la web las que aprobás, y solo
  puede opinar quien reservó ese perfume de verdad.
- **Cierre de caja** — elegí un día y ves: cuántas reservas entraron, cuánto
  representan (por moneda), cuántas unidades se vendieron, lo más vendido, lo que
  hay que reponer y el detalle de cada reserva. Se puede imprimir.

Otras mejoras:

- **Ficha más sensorial**: cada perfume puede tener *duración en la piel* y
  *ocasión* (día / noche / ambas). Se editan en Productos y se filtran en el
  catálogo. También aparece "**Comprá junto con**": dos perfumes que combinan.
- **Etapas claras en Mis reservas**: el cliente ve un recorrido de cuatro pasos
  (Reserva creada → Comprobante/pago → Lista o en camino → Entregada) con el
  estado actual resaltado.
- **Plantillas de WhatsApp**: en cada reserva del panel hay botones que abren
  WhatsApp con el mensaje ya escrito (lista para retirar, recordar comprobante,
  salió el envío, gracias por la compra).
- **Exportar clientes a CSV** desde Usuarios → "Exportar CSV" (abre en Excel).
- **Historial de cotizaciones**: cada cambio de tasa queda guardado con su fecha.
  Las reservas ya creadas conservan su precio: mover la tasa hoy no cambia el
  precio de una reserva de ayer.

## Avisos automáticos (envío solo, sin tocar nada)

Los dos avisos de venta ya **se envían solos**, no hace falta que nadie abra
WhatsApp:

- **Volvió este perfume** — en cuanto un perfume agotado vuelve a tener
  unidades, cada persona de la lista de espera recibe su aviso por los canales
  que dejó (correo, WhatsApp y/o notificación en el teléfono). Se dispara en el
  mismo segundo en que guardás el stock nuevo.
- **Recordatorio de reposición** — a quien compró un frasco hace ~2 meses le
  llega el mensaje "¿ya se te está terminando?" y la oferta de prepararle otro.

Todo pasa por una **cola** (`OutboxMessage`): primero se guarda el mensaje y
después se intenta mandar. Si un canal no está configurado, el mensaje **no se
pierde**: queda en la cola como *Omitido* con el motivo escrito y se puede
reintentar con un botón.

**Dónde se ve y se controla:** *Administración → Avisos automáticos*.

- Interruptores para encender/apagar cada aviso.
- Campo de días para el recordatorio (por defecto 60).
- Configuración de correo: remitente, correo del dueño, proveedor (Resend o
  Brevo) y la clave. **La clave no se muestra nunca**, solo se escribe.
- Botón **Mandar correo de prueba** para comprobar que el envío real funciona.
- **Cola de mensajes**: cada aviso con su estado (Enviado / En cola / Falló /
  Omitido), el destinatario, el motivo del fallo y el texto completo.

**Canales y qué hace falta para cada uno**

| Canal | Variable / panel | Sin configurar |
| --- | --- | --- |
| Correo | Clave de Resend (`re_...`) o Brevo, desde el panel o `RESEND_API_KEY` / `BREVO_API_KEY` | queda *Omitido* |
| WhatsApp | `WHATSAPP_TOKEN` + `WHATSAPP_PHONE_ID` (WhatsApp Cloud API de Meta) | queda *Omitido* |
| Notificación | Claves VAPID del deploy; el cliente tiene que aceptar notificaciones | queda *Omitido* |

**Automático sin depender de nadie:** `vercel.json` programa el trabajo cada
hora (`/api/cron/outbox`). Ahí se generan los recordatorios de reposición y se
manda la cola pendiente. Si definís `CRON_SECRET` en el deploy, solo Vercel (o
un administrador logueado) puede ejecutarlo.

## Recordatorios de retiro y tareas del día

- **Aviso arriba del panel:** al entrar a *Panel* aparece, fija arriba, una franja con
  lo que hay que atender hoy: reservas con más de 24 h sin comprobante y reservas
  listas para retirar que llevan más de 3 días esperando. El botón *Ver alertas* lleva
  a la pestaña **Alertas**.
- **Recordatorio por WhatsApp de retiros viejos:** en **Alertas → Esperando retiro
  hace +3 días** cada reserva trae el mensaje *Recordar retiro* ya escrito, con el
  código de la reserva y la dirección de la tienda.
- **Copiar mensaje sin abrir WhatsApp:** en **Reservas**, cada plantilla tiene dos
  botones: uno abre WhatsApp y el otro (el ícono de copiar) copia el texto al
  portapapeles para pegarlo donde quieras (SMS, Instagram, etc.).
- **Código de reserva compartible:** el cliente ve su código (`MOOD-1234`) en
  *Mis reservas* y en el comprobante, con un botón para **compartirlo o copiarlo** y
  avisarte por WhatsApp sin tener que preguntarte cuál es.
- **Duplicar un perfume:** en **Productos**, el ícono de duplicar abre el formulario
  con todos los datos copiados (marca, notas, categoría, precios), listo para cambiarle
  el nombre y las notas y guardar como uno nuevo.

## Límites conocidos

- El pago no se cobra online: la reserva queda pendiente hasta que la tienda confirma el pago.
- No se envían correos ni mensajes automáticos; la confirmación se coordina por WhatsApp.
- Las fotos se pueden **subir desde el panel** (se guardan dentro del propio registro,
  hasta ~900 KB) o pegar un enlace externo.

## Pruebas de regresión

Antes de publicar cualquier cambio, con la app corriendo:

```bash
npm run test:regression
```

Recorre de punta a punta cada superficie del sistema: salud del servicio, catálogo,
ajustes, categorías, todas las páginas públicas, registro, login, sesión, carrito,
lista de deseos, cotización de envío en CUP, reserva con comprobante obligatorio,
descuento de stock, rechazo por falta de stock (409), permisos de cliente y de
administrador, y las páginas protegidas. Al terminar **borra los datos de prueba**
que creó (usuario, reservas y el stock que consumió), así que se puede correr las
veces que haga falta.

Sale con código 0 si todo está en orden y con 1 si algo falla, listando los fallos.
Para probarlo contra el sitio publicado:

```bash
BASE_URL=https://tu-dominio.com npm run test:regression
```

## Publicar en producción (migración)

El deploy de Vercel corre `npm run build`, que en orden:

1. genera el cliente de Prisma;
2. **sincroniza el esquema de la base** (`prisma db push`);
3. **carga los datos iniciales** de forma idempotente (ajustes, categorías,
   catálogo y cuenta de administrador), sin duplicar nada;
4. compila la app.

Por eso publicar es simplemente pulsar **Redeploy** en Vercel: la base de
producción se pone al día sola y la cuenta de administrador se recrea/actualiza
con los valores de `ADMIN_EMAIL` y `ADMIN_PASSWORD`.

La tabla `WithdrawalRequest` (del retirado formulario de arrepentimiento) sigue
declarada en `prisma/schema.prisma` a propósito, aunque ninguna pantalla la use.
Si se borrara del esquema, `prisma db push` intentaría `DROP TABLE
"WithdrawalRequest"` y el deploy se detendría por riesgo de pérdida de datos,
como pasó el 8 de noviembre. Para eliminarla de verdad hay que hacerlo a mano y
en dos pasos (guardar los datos, luego `DROP TABLE`), no desde el esquema.

Importante, para no perder datos: el paso 2 corre **sin** `--accept-data-loss`.
Un cambio aditivo (una tabla o una columna nueva) se aplica solo; si alguna vez
el esquema pidiera borrar una columna o una tabla con datos, el push falla, el
build sigue y la app arranca con el esquema anterior. En ese caso hay que
revisar el cambio a mano con `npx prisma migrate diff` antes de publicar. No se
pierde información en silencio.

### Si el deploy dice "este cambio en el esquema destruiría datos existentes"

Significa que `prisma/schema.prisma` ya no describe las columnas que existen en
la base en vivo (otra precisión de `Decimal`, otro `@default`, otro tipo). Se
corrige **alineando el esquema a la base**, no al revés:

```bash
# ver qué columnas existen de verdad
psql "$DIRECT_URL" -c '\d "Combo"'
# alinear el esquema y comprobar que ya no hay diferencias
npx prisma db push --skip-generate
```

La causa conocida de este aviso: `Combo.price` y `Combo.compareAtPrice` están
como `Decimal(12,2)` y `Combo.currency` tiene `@default("CUP")`. Escribirlos como
`Decimal(12,4)` o `@default("USD")` provoca un `ALTER` que el deploy rechaza. Si
de verdad hiciera falta más precisión, se hace en dos despliegues: primero se
añade una columna nueva y se copian los datos, y solo después se elimina la
vieja.

Después de publicar, comprobá el estado:

```bash
curl https://tu-dominio.com/api/health
# { "ok": true, "productCount": 8, "adminExists": true }
```

Si `productCount` es 0, la base de producción quedó vacía: corré
`npm run db:push && npm run db:seed` con el `DATABASE_URL` de producción.

