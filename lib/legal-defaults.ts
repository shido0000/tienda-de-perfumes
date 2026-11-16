/**
 * Textos legales por defecto.
 *
 * Formato: Markdown mínimo. Se admiten `## Título`, párrafos, listas con
 * `- ` o `1. ` y **negrita**. Nada de HTML, así que el renderizador es seguro
 * por construcción (sin dangerouslySetInnerHTML).
 */
export const LEGAL_DEFAULTS = {
  termsText: `## 1. Identificación del comercio
El sitio es operado por **[Razón social a completar]**, con domicilio legal en **[Domicilio legal a completar]** y CUIT **[CUIT a completar]**. El contacto comercial es el WhatsApp publicado en el pie de página.

## 2. Objeto
El sitio permite consultar un catálogo de perfumes y fragancias y accesorios afines y generar **reservas** de esos productos. La reserva no es una compra: es una solicitud que la tienda confirma manualmente.

## 3. Cuenta de usuario
Para guardar reservas y listas de deseos necesitás una cuenta. Sos responsable de la confidencialidad de tu contraseña y de la veracidad de los datos que ingresás.

## 4. Precios y moneda
Los precios se muestran en la moneda que define la tienda. Al confirmar una reserva, el importe de cada producto se convierte a esa moneda y **queda fijado** en el comprobante. Una orden no mezcla monedas.

## 5. Reservas y disponibilidad
Las reservas quedan en estado pendiente hasta la confirmación de la tienda. Si el producto no estuviera disponible, la tienda puede cancelar la reserva y te avisa por WhatsApp.

## 6. Entrega
Podés elegir retiro en tienda (sin costo) o envío a domicilio dentro del radio máximo configurado. El costo de envío se calcula con una tarifa base más un costo por kilómetro según la distancia entre la tienda y el punto que marques.

## 7. Pagos
Se aceptan efectivo y transferencia bancaria. No se procesan pagos con tarjeta ni hay pasarela de pago en este sitio. El comprobante se envía por WhatsApp.

## 8. Propiedad intelectual
Marcas, textos, fotografías y diseño del sitio pertenecen a sus titulares y no pueden reproducirse sin autorización.

## 9. Legislación aplicable
Estos términos se rigen por la legislación del domicilio del comercio. El consumidor conserva todos los derechos que le otorga la normativa de defensa del consumidor de su jurisdicción.`,

  reservationsText: `## 1. Cómo se reserva
1. Agregás productos al carrito.
2. En el checkout elegís entrega (retiro o envío) y forma de pago.
3. Confirmás y el sistema genera un código único de reserva.
4. La tienda revisa la reserva y te escribe por WhatsApp.

## 2. Estados de la reserva
- **Pendiente de confirmación:** la tienda todavía no la revisó.
- **Confirmada:** el producto está reservado a tu nombre.
- **En preparación / Enviada:** el pedido está siendo despachado.
- **Entregada:** entregada en tienda o enviada.
- **Cancelada:** la reserva no se concretó.

## 3. Formas de pago
**Transferencia:** la reserva queda pendiente hasta que la tienda confirme la acreditación. Los datos bancarios son los publicados en la sección de pagos y en el checkout.

**Efectivo:** pagás al retirar en la tienda o al recibir el envío.

## 4. Envíos
El costo de envío se informa antes de confirmar: tarifa base más costo por kilómetro, calculado desde la tienda hasta el punto que marcás en el mapa. Fuera del radio máximo no se ofrece envío; en ese caso podés elegir retiro o coordinar por WhatsApp.

## 5. Devoluciones
Si necesitás cancelar una reserva, escribinos por WhatsApp desde el botón de contacto de la tienda o desde tu cuenta y coordinamos la cancelación. La reserva queda registrada y la tienda responde por el mismo canal.

Por tratarse de productos de perfumería, los frascos abiertos o usados pueden no ser elegibles para devolución por razones sanitarias. Esto se evalúa caso por caso y conforme a la normativa aplicable.

## 6. Comprobantes
Después de confirmar una reserva podés enviar el comprobante por WhatsApp a la tienda y a tu propio número. También podés reenviarlo desde "Mis reservas".`,

  privacyText: `## 1. Qué datos guardamos
- Nombre y correo electrónico al crear la cuenta.
- Teléfono y dirección cuando elegís envío a domicilio.
- Las reservas que generás y su estado.
- La ubicación que marcás en el mapa para calcular el envío.

## 2. Para qué los usamos
Para gestionar tu cuenta, preparar y entregar tus reservas, avisarte por WhatsApp sobre el estado del pedido y responder tus consultas. No vendemos ni cedemos tus datos a terceros con fines publicitarios.

## 3. Contraseña
Tu contraseña se guarda cifrada (hash con bcrypt). Nadie en la tienda puede leerla.

## 4. Cuánto tiempo
Conservamos los datos de tu cuenta mientras exista y los de cada reserva el tiempo necesario para responder por la operación.

## 5. Tus derechos
Podés pedir acceso, corrección o eliminación de tus datos escribiendo al WhatsApp de la tienda. También podés cambiar tu nombre, teléfono y contraseña desde **Mi cuenta**.

## 6. Seguridad
El sitio usa conexión cifrada, almacenamiento local para el carrito de invitados y cookies de sesión httpOnly para mantener tu sesión iniciada.`,

  cookiesText: `## 1. Qué son
Las cookies son pequeños archivos que el sitio guarda en tu navegador para recordar información entre visitas.

## 2. Qué usamos
- **Sesión:** una cookie httpOnly que mantiene tu sesión iniciada. Sin ella no podrías ver tus reservas.
- **Tema:** una preferencia guardada en el almacenamiento del navegador para recordar si usás modo claro u oscuro.
- **Carrito de invitado:** tus productos se guardan en el almacenamiento local hasta que iniciás sesión.

## 3. Cookies de terceros
Este sitio no incluye publicidad ni rastreadores de terceros. El mapa de selección de entrega carga mosaicos de OpenStreetMap, que puede registrar la petición de la imagen.

## 4. Cómo desactivarlas
Podés borrar o bloquear las cookies desde la configuración de tu navegador. Si bloqueás la cookie de sesión, no vas a poder iniciar sesión ni ver tus reservas.`,
} as const;

export type LegalKey = keyof typeof LEGAL_DEFAULTS;
