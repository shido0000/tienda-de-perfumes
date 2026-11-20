import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { formatMoney } from "@/lib/currency";
import { STATUS_LABEL } from "@/lib/types";
import { getCurrentUser } from "@/lib/session";
import { clientIp, rateLimit, tooManyRequests } from "@/lib/rate-limit";
import { resolveAiConfig } from "@/lib/ai-config";
import { askAi, type AiTurn } from "@/lib/chat-ai";
import { getRefManager, markedPrice, type ManagerInfo } from "@/lib/manager";

export const dynamic = "force-dynamic";

type ChatProduct = { id: string; name: string; brand: string; price: string; image: string | null };

type Reply = {
  reply: string;
  suggestions?: string[];
  products?: ChatProduct[];
  whatsapp?: string;
  /** true cuando la respuesta la redactó el modelo de IA. */
  ai?: boolean;
};

const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

/**
 * Palabra completa dentro del texto. Se usa límites de palabra para que
 * "compro" no se dispare con "comprobante" ni "hola" con "holandesa": ese era
 * el motivo de que el asistente contestara otra cosa.
 */
const word = (text: string, ...words: string[]) =>
  words.some((w) => new RegExp(`(^|[^a-z0-9])${w}([^a-z0-9]|$)`, "i").test(text));

/**
 * ¿El mensaje es sólo un saludo o cortesía? (hola, buenas, gracias, chau…)
 *
 * El saludo de bienvenida SOLO debe salir en este caso. Antes se devolvía
 * también cuando el mensaje no encajaba en ninguna intención, y por eso a
 * "¿cuánto cuesta el envío?" o "¿cómo pago?" el asistente contestaba el saludo.
 */
const GREETINGS = [
  "hola", "holaa", "buenas", "buen dia", "buenos dias", "buenas tardes", "buenas noches",
  "hey", "que tal", "que hubo", "saludos", "gracias", "muchas gracias", "chau", "adios",
  "hasta luego", "ok", "dale", "genial",
];

function isGreetingOnly(text: string): boolean {
  const clean = norm(text)
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!clean) return true;
  const strip = new Set([
    "el", "la", "los", "las", "un", "una", "de", "del", "que", "tal", "muy", "sr", "sra",
    "por", "favor", "favor.", "como", "estas", "esta", "todo", "bien", "ahi", "y", "a",
  ]);
  const words = clean.split(" ").filter((w) => w && !strip.has(w));
  if (words.length === 0) return true;
  if (words.length > 4) return false;
  return words.every((w) =>
    GREETINGS.some((g) => g === w || (g.includes(" ") && clean.includes(g))),
  );
}

/**
 * Intenciones del asistente y sus palabras clave.
 *
 * Antes las respuestas se elegían por ORDEN de un `if` tras otro: "¿cómo pago el
 * envío?" caía en "envío" sólo porque esa comprobación iba primero, y por eso a
 * veces contestaba otra cosa. Ahora cada intención se PUNTÚA con las palabras
 * que realmente aparecen en el mensaje y gana la que más coincide; a igualdad,
 * gana la que el cliente mencionó primero.
 */
const INTENTS = {
  envio: ["envio", "enviar", "envian", "domicilio", "delivery", "flete", "kilometro", "kilometros", "km", "traer"],
  pago: ["pago", "pagar", "pagos", "efectivo", "transferencia", "transferir", "tarjeta", "banco", "comprobante", "deposito"],
  reservar: ["reservar", "reservo", "reserva", "reservas", "comprar", "compro", "pedir", "pedido", "carrito", "encargar"],
  ofertas: ["oferta", "ofertas", "combo", "combos", "descuento", "descuentos", "promo", "promocion", "promociones", "rebaja", "rebajas", "pack"],
  contacto: ["donde", "direccion", "ubicacion", "local", "tienda", "horario", "horarios", "abren", "abierto", "telefono", "contacto", "whatsapp"],
  catalogo: ["perfume", "perfumes", "fragancia", "fragancias", "catalogo", "productos", "venden", "opciones", "marcas"],
  /**
   * Ayuda sobre la propia web: cuenta, login, reseñas, instalar la app, el test
   * de aroma o las novedades. Antes cualquier pregunta de este tipo caía en el
   * saludo genérico ("no sé de qué me hablás"), que es justo lo que un cliente
   * nuevo pregunta primero.
   */
  ayuda: [
    "cuenta", "registrar", "registrarme", "registro", "inscribir", "sesion", "login", "entrar",
    "ingresar", "contrasena", "clave", "perfil", "usuario", "instalar", "instalo", "app",
    "aplicacion", "celular", "movil", "descargar", "resena", "resenas", "opinion", "opiniones",
    "opinar", "comentar", "comentario", "valorar", "novedad", "novedades", "aviso", "avisame",
    "espera", "test", "recomendacion", "recomiendas", "acierta", "aconsejas",
  ],
} as const;

type Intent = keyof typeof INTENTS;

/** Intención dominante del mensaje (o null si no coincide ninguna). */
function bestIntent(text: string): Intent | null {
  let best: { intent: Intent; score: number; pos: number } | null = null;
  for (const intent of Object.keys(INTENTS) as Intent[]) {
    let score = 0;
    let pos = Number.POSITIVE_INFINITY;
    for (const term of INTENTS[intent]) {
      const m = new RegExp(`(^|[^a-z0-9])${term}([^a-z0-9]|$)`, "i").exec(text);
      if (!m) continue;
      score += 1;
      // "el envío" pesa menos que "domicilio": las palabras largas son más
      // específicas, así una mención de pasada no gana la conversación.
      score += term.length >= 7 ? 0.5 : 0;
      pos = Math.min(pos, m.index);
    }
    if (score === 0) continue;
    if (!best || score > best.score || (score === best.score && pos < best.pos)) {
      best = { intent, score, pos };
    }
  }
  return best?.intent ?? null;
}

const STOP = new Set([
  "que", "quien", "como", "cual", "cuales", "donde", "cuando", "tienen", "tiene", "hay",
  "quiero", "busco", "necesito", "para", "por", "con", "los", "las", "una", "uno", "unos",
  "unas", "del", "mas", "muy", "perfume", "perfumes", "aroma", "fragancia", "fragancias",
  "precio", "precios", "cuesta", "cuanto", "esta", "este", "esto", "algo", "algun", "alguna",
  "podes", "puedo", "podrias", "tenes", "sabes", "decime", "mostrame", "ver", "sobre", "seria",
]);

function keywords(text: string): string[] {
  return text
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP.has(w));
}

function toChatProduct(
  p: {
    id: string;
    name: string;
    brand: string;
    price: unknown;
    currency: string;
    images: string[];
  },
  manager: ManagerInfo | null = null,
): ChatProduct {
  // El visitante que llegó por el enlace de un gestor paga el precio + la
  // ganancia del gestor, igual que en el catálogo y en el carrito. El asistente
  // debe mostrar exactamente ese mismo precio, sin decirle al cliente que hay
  // un recargo.
  const base = Number(p.price);
  const price = manager ? markedPrice(base, manager) : base;
  return {
    id: p.id,
    name: p.name,
    brand: p.brand,
    price: formatMoney(price, p.currency),
    image: p.images?.[0] ?? null,
  };
}

/** Productos del catálogo que menciona un texto (para adjuntar tarjetas). */
function productsMentioned(
  text: string,
  catalog: { id: string; name: string; brand: string }[],
  all: Parameters<typeof toChatProduct>[0][],
  manager: ManagerInfo | null = null,
): ChatProduct[] {
  const hay = norm(text);
  const hits = all.filter((p) => {
    const name = norm(p.name);
    if (name.length < 4) return false;
    if (hay.includes(name)) return true;
    const first = name.split(/\s+/)[0];
    return first.length > 3 && new RegExp(`(^|[^a-z0-9])${first}([^a-z0-9]|$)`).test(hay);
  });
  return hits.slice(0, 4).map((p) => toChatProduct(p, manager));
}

export async function POST(req: Request) {
  const limited = rateLimit(`chat:${clientIp(req)}`, 30, 60_000);
  if (!limited.ok) return tooManyRequests(limited.retryAfterSeconds);

  const body = (await req.json().catch(() => ({}))) as {
    message?: unknown;
    history?: unknown;
    messages?: unknown;
  };

  /**
   * El cuerpo puede llegar en dos formas y hay que aceptar LAS DOS:
   *   a) { message: string, history: [...] }        (forma clásica)
   *   b) { messages: [{ role, content }, ...] }     (lo que manda el widget)
   * Antes sólo se leía `message`; cuando el widget mandaba `messages`, el texto
   * quedaba vacío y el asistente contestaba SIEMPRE el saludo genérico, sin
   * importar la pregunta.
   */
  const turns: { role: "user" | "assistant"; content: string }[] = Array.isArray(body.messages)
    ? (body.messages as unknown[]).map((t) => {
        const turn = t as { role?: string; content?: string };
        return {
          role: turn.role === "assistant" ? ("assistant" as const) : ("user" as const),
          content: String(turn.content ?? "").slice(0, 800),
        };
      })
    : [];

  // La pregunta actual es el último mensaje del usuario; lo anterior es contexto.
  const lastUserIdx = (() => {
    for (let i = turns.length - 1; i >= 0; i--) if (turns[i].role === "user") return i;
    return -1;
  })();
  const messageFromMessages = lastUserIdx >= 0 ? turns[lastUserIdx].content : "";

  const message = (String(body.message ?? "") || messageFromMessages).slice(0, 500);

  if (!message.trim()) {
    return NextResponse.json(
      { error: "Escribí tu consulta para que pueda ayudarte." },
      { status: 400 },
    );
  }

  const historyFromMessages: AiTurn[] = turns
    .slice(0, lastUserIdx >= 0 ? lastUserIdx : turns.length)
    .slice(-6)
    .filter((t) => t.content.trim().length > 0);

  const history: AiTurn[] = Array.isArray(body.history)
    ? (body.history as unknown[])
        .slice(-6)
        .map((t) => {
          const turn = t as { role?: string; content?: string };
          return {
            role: turn.role === "assistant" ? ("assistant" as const) : ("user" as const),
            content: String(turn.content ?? "").slice(0, 800),
          };
        })
        .filter((t) => t.content.trim().length > 0)
    : historyFromMessages;

  const text = norm(message).trim();
  const intent = bestIntent(text);
  const settings = await getSettings();
  // Si el visitante entró por el enlace de un gestor, el asistente muestra los
  // mismos precios que ve en la tienda: precio real + ganancia del gestor.
  const manager = await getRefManager().catch(() => null);
  const priced = (value: unknown, currency: string) =>
    formatMoney(manager ? markedPrice(Number(value), manager) : Number(value), currency);
  const wa = `https://wa.me/${settings.whatsapp}?text=${encodeURIComponent(
    `Hola ${settings.brand}, tengo una consulta: ${message || "..."}`,
  )}`;

  const base = (reply: string, suggestions?: string[]): Reply => ({ reply, suggestions, whatsapp: wa });

  if (isGreetingOnly(text)) {
    return NextResponse.json(
      base("¡Hola! Soy el asistente de la tienda. Contame qué buscás y te ayudo a elegirlo.", [
        "¿Qué perfumes tienen?",
        "¿Cuánto cuesta el envío?",
        "¿Cómo reservo?",
      ]),
    );
  }

  // ── Datos reales de la tienda (una sola consulta por petición) ────────────
  const [catalog, combos, categories] = await Promise.all([
    prisma.product
      .findMany({
        where: { visible: true },
        orderBy: { createdAt: "desc" },
        take: 60,
        select: {
          id: true,
          name: true,
          brand: true,
          price: true,
          currency: true,
          images: true,
          category: true,
          notes: true,
          description: true,
        },
      })
      .catch(() => []),
    prisma.combo
      .findMany({ where: { visible: true }, orderBy: [{ order: "asc" }], take: 8 })
      .catch(() => []),
    prisma.category.findMany({ take: 40 }).catch(() => []),
  ]);

  // ── 0) Datos del propio cliente: SIEMPRE por código, nunca por el modelo ───
  // "¿estado de mi reserva?" es un dato privado: el modelo lo inventaría. Esta
  // comprobación va antes que la IA para que no pueda desviarse.
  if (word(text, "mis", "mi", "mio", "mias", "estado") && intent === "reservar") {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        base("Para ver tus reservas necesitás iniciar sesión desde el botón “Ingresar” del encabezado.", [
          "¿Cómo reservo?",
        ]),
      );
    }
    const recent = await prisma.reservation.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 3,
    });
    if (recent.length === 0) {
      return NextResponse.json(
        base("Todavía no tenés reservas registradas. Cuando hagas la primera la vas a ver en “Mis reservas”.", [
          "¿Qué perfumes tienen?",
          "¿Cómo reservo?",
        ]),
      );
    }
    const lines = recent
      .map(
        (r) =>
          `• ${r.code} — ${STATUS_LABEL[r.status] ?? r.status} — ${formatMoney(
            Number(r.total),
            r.currency,
          )}`,
      )
      .join("\n");
    return NextResponse.json(
      base(`Estas son tus últimas reservas:\n${lines}\n\nEl detalle completo está en “Mis reservas”.`, [
        "¿Cuánto cuesta el envío?",
      ]),
    );
  }

  // ── 1) Modelo de lenguaje (si hay clave configurada) ─────────────────────
  // Se usa SOLO cuando el mensaje no cae en una intención que el código sabe
  // responder con datos exactos (envío, pagos, reservas, contacto, ofertas) o
  // cuando la pregunta es de catálogo/abierta. Así el modelo no puede "opinar"
  // sobre precios de envío ni cambiar la respuesta de una pregunta concreta:
  // eso es justo lo que hacía que a veces contestara otra cosa.
  const ai = await resolveAiConfig();
  if (
    ai.config.enabled &&
    catalog.length > 0 &&
    (intent === null || intent === "catalogo")
  ) {
    const catalogText = catalog
      .map(
        (p) =>
          `- ${p.name} · ${p.brand} · ${formatMoney(
            manager ? markedPrice(Number(p.price), manager) : Number(p.price),
            p.currency,
          )} · ${
            p.category || "sin familia"
          }${p.notes ? ` · notas: ${p.notes}` : ""}`,
      )
      .join("\n");

    const combosText = combos.length
      ? combos
          .map(
            (c) =>
              `- ${c.title} · ${formatMoney(
                manager ? markedPrice(Number(c.price), manager) : Number(c.price),
                c.currency,
              )}`,
          )
          .join("\n")
      : "Ninguna oferta activa.";

    const system = [
      `Sos el asistente virtual de ${settings.brand}, una perfumería de nicho.`,
      `Respondés SIEMPRE en español, con frases cortas (máximo 5 líneas) y un tono cercano, sin emojis.`,
      ``,
      `DATOS REALES DE LA TIENDA (única fuente de verdad; nunca inventes precios, stock ni marcas):`,
      `- Dirección: ${settings.storeAddress}`,
      `- WhatsApp: ${settings.whatsappDisplay}`,
      `- Envío a domicilio: se cobra en CUP, ${formatMoney(settings.baseRate, "CUP")} base + ${formatMoney(settings.perKm, "CUP")} por km, hasta ${settings.maxRadius} km. También hay retiro en tienda sin costo.`,
      `- Pagos: efectivo al retirar o al recibir, y transferencia bancaria con foto del comprobante. No se cobra online: la reserva queda pendiente hasta que la tienda confirma.`,
      `- Cómo reservar: agregar al carrito, elegir retiro o envío con el mapa en el checkout, confirmar y la tienda escribe por WhatsApp con un código de reserva.`,
      `- Familias olfativas disponibles: ${categories.map((c) => c.name).join(", ") || "no informadas"}.`,
      `- Cómo crear cuenta: botón "Ingresar"/"Entrar" arriba a la derecha, elegir "Crear cuenta" con nombre, correo y contraseña.`,
      `- Cómo iniciar sesión: "Ingresar" arriba a la derecha con correo y contraseña; la contraseña se puede recuperar escribiendo por WhatsApp. En "Mi cuenta" se editan nombre, teléfono y contraseña.`,
      `- Cómo dejar una reseña: en la ficha de un perfume, sección "Opiniones"; hace falta haber reservado ese perfume e iniciar sesión; la tienda la aprueba antes de publicarla.`,
      `- Cómo instalar la app: Android/Chrome muestra el aviso "Instalar app"; iPhone/Safari usa Compartir → Añadir a pantalla de inicio.`,
      `- Perfume agotado: en su ficha hay "Avísame cuando llegue" (deja WhatsApp o correo y se avisa al reponer). En la portada, "Enterate primero" suscribe a novedades.`,
      `- Test de aroma: "Encontrá tu aroma" hace 4 preguntas y recomienda 3 perfumes.`,
      ``,
      `CATÁLOGO ACTUAL (${catalog.length} fragancias):`,
      catalogText,
      ``,
      `OFERTAS ACTUALES:`,
      combosText,
      ``,
      `REGLAS:`,
      `- Si la pregunta es sobre perfumes, respondé nombrando exactamente los productos del catálogo que encajen (nombre tal cual figura arriba).`,
      `- Si preguntan algo que no está en estos datos (stock exacto de una unidad, descuentos especiales, fechas de entrega concretas), decí que lo confirmen por WhatsApp y ofrecé el enlace.`,
      `- Nunca digas que sos una IA de propósito general ni hables de otros temas. Si la pregunta no es de la tienda, redirigí amablemente.`,
      `- No uses listas con viñetas largas: texto corrido, máximo 3 oraciones.`,
      `- Si la pregunta pide un dato concreto (envío, pagos, horario, dirección, cómo reservar), respondé EXACTAMENTE con los datos de arriba, sin agregar nada que no esté.`,
    ].join("\n");

    const answer = await askAi({
      config: ai.config,
      system,
      history,
      question: message,
    });

    if (answer) {
      const products = productsMentioned(answer, catalog, catalog, manager);
      return NextResponse.json({
        reply: answer,
        suggestions: [
          "¿Cuánto cuesta el envío?",
          "¿Cómo reservo?",
          "¿Qué ofertas tienen?",
        ],
        products: products.length ? products : undefined,
        whatsapp: wa,
        ai: true,
      } satisfies Reply);
    }
  }

  // ── 2) Respuestas por reglas (siempre disponibles, aunque no haya IA) ────

  // Saludo (solo si el mensaje es corto: "hola, busco algo amaderado" no es saludo puro)
  if (text.split(/\s+/).length <= 3 && word(text, "hola", "buenas", "hey", "saludos", "buen dia")) {
    return NextResponse.json(
      base(
        `¡Hola! Bienvenido a ${settings.brand}. Puedo ayudarte a elegir una fragancia, calcular el envío o contarte cómo reservar.`,
        ["¿Qué perfumes tienen?", "¿Cuánto cuesta el envío?", "¿Cómo reservo?"],
      ),
    );
  }

  if (intent === "ayuda") {
    const t = text;
    const has = (...words: string[]) => word(t, ...words);

    if (has("cuenta", "registrar", "registrarme", "registro", "inscribir")) {
      return NextResponse.json(
        base(
          `Crear tu cuenta es gratis y toma un minuto:\n1. Arriba a la derecha tocá "Ingresar" (o "Entrar").\n2. Elegí "Crear cuenta" y completá tu nombre, correo y una contraseña.\n3. Listo: ya podés reservar, guardar favoritos y dejar reseñas.\nSi el correo ya está en uso, probá con otro o recuperá el acceso escribiéndonos por WhatsApp.`,
          ["¿Cómo inicio sesión?", "¿Cómo reservo?", "¿Qué perfumes tienen?"],
        ),
      );
    }

    if (has("sesion", "login", "entrar", "ingresar", "contrasena", "clave", "usuario", "perfil")) {
      return NextResponse.json(
        base(
          `Para iniciar sesión entrá arriba a la derecha en "Ingresar", poné tu correo y contraseña y tocá "Entrar".\n• Si olvidaste la contraseña: escribinos por WhatsApp y te ayudamos a recuperarla.\n• Una vez dentro, en "Mi cuenta" podés cambiar tu nombre, teléfono y contraseña.`,
          ["¿Cómo me registro?", "Cómo cambio mi contraseña", "Ver mis reservas"],
        ),
      );
    }

    if (has("instalar", "instalo", "app", "aplicacion", "celular", "movil", "descargar")) {
      return NextResponse.json(
        base(
          `Podés instalar ${settings.brand} en tu teléfono como una app:\n• Android (Chrome): aparece un aviso "Instalar app" abajo; tocá "Instalar" y queda con su ícono en la pantalla.\n• iPhone (Safari): tocá Compartir → "Añadir a pantalla de inicio".\nSe abre a pantalla completa, sin la barra del navegador, y recibe avisos de novedades.`,
          ["¿Cómo me registro?", "¿Qué perfumes tienen?", "¿Cómo reservo?"],
        ),
      );
    }

    if (has("resena", "resenas", "opinion", "opiniones", "opinar", "comentar", "comentario", "valorar")) {
      return NextResponse.json(
        base(
          `Podés dejar tu opinión de un perfume entrando a su ficha y bajando hasta "Opiniones".\n• Tenés que haber reservado ese perfume y tener la sesión iniciada.\n• Las estrellas son de 1 a 5 y podés contar tu experiencia en pocas líneas.\n• La tienda revisa cada opinión antes de publicarla, así que no aparece al instante.`,
          ["¿Cómo me registro?", "¿Qué perfumes tienen?", "Ver mis reservas"],
        ),
      );
    }

    if (has("novedad", "novedades", "aviso", "avisame", "espera", "volvio", "agotado", "stock")) {
      return NextResponse.json(
        base(
          `Si un perfume está agotado, en su ficha tenés el botón "Avísame cuando llegue": dejás tu WhatsApp o correo y te escribimos en cuanto vuelva el stock.\nY si querés enterarte primero de cada novedad, en la portada hay un bloque "Enterate primero" donde dejás tu contacto.`,
          ["¿Qué perfumes tienen?", "¿Cómo reservo?", "Buscar por familia"],
        ),
      );
    }

    if (has("test", "recomendacion", "recomiendas", "aconsejas", "no se", "cual elijo", "que me conviene")) {
      return NextResponse.json(
        base(
          `Si no sabés cuál elegir, hacé el test "Encontrá tu aroma": 4 preguntas (familia, ocasión, intensidad y presupuesto) y te recomendamos 3 perfumes del catálogo. Está en el menú, en "Encontrá tu aroma".`,
          ["¿Qué perfumes tienen?", "¿Cómo reservo?"],
        ),
      );
    }

    return NextResponse.json(
      base(
        `Puedo ayudarte con todo lo de la web:\n• Crear tu cuenta y iniciar sesión.\n• Reservar, pagar y ver el estado de tus reservas.\n• Dejar opiniones de un perfume.\n• Instalar la app en el teléfono.\n• Avisarte cuando vuelve un perfume agotado.\n¿Qué necesitás?`,
        ["¿Cómo me registro?", "¿Cómo reservo?", "¿Cómo instalo la app?"],
      ),
    );
  }

  if (intent === "envio") {
    return NextResponse.json(
      base(
        `El envío a domicilio se cobra en CUP según la distancia: ${formatMoney(
          settings.baseRate,
          "CUP",
        )} de base + ${formatMoney(settings.perKm, "CUP")} por kilómetro, hasta ${settings.maxRadius} km. En el checkout marcás tu ubicación en el mapa y el costo aparece antes de confirmar. Retirar en la tienda es sin costo.`,
        ["¿Cómo reservo?", "¿Dónde están?", "¿Qué perfumes tienen?"],
      ),
    );
  }

  if (intent === "pago") {
    return NextResponse.json(
      base(
        `Aceptamos dos formas de pago:\n• Efectivo, al retirar en la tienda o al recibir el envío.\n• Transferencia bancaria: los datos aparecen en el checkout y adjuntás la foto del comprobante.\nEl pago no se cobra en el sitio: la reserva queda pendiente hasta que la tienda confirme.`,
        ["¿Cuánto cuesta el envío?", "¿Cómo reservo?"],
      ),
    );
  }

  if (intent === "reservar") {
    return NextResponse.json(
      base(
        `Reservar es así:\n1. Agregás las fragancias al carrito.\n2. En el checkout elegís retiro en tienda o envío (con el mapa) y la forma de pago.\n3. Confirmás y te damos un código único de reserva.\n4. La tienda revisa la reserva y te escribe por WhatsApp para coordinar la entrega.`,
        ["¿Cuánto cuesta el envío?", "¿Cómo pago?", "Ver mis reservas"],
      ),
    );
  }

  if (intent === "ofertas") {
    if (combos.length === 0) {
      return NextResponse.json(
        base("Ahora mismo no hay ofertas activas, pero todo el catálogo está disponible para reservar.", [
          "¿Qué perfumes tienen?",
        ]),
      );
    }
    const list = combos
      .slice(0, 4)
      .map((c) => `• ${c.title} — ${priced(c.price, c.currency)}`)
      .join("\n");
    return NextResponse.json(
      base(`Estas son las ofertas vigentes:\n${list}\nLas encontrás en la sección Ofertas.`, [
        "¿Cómo pago?",
        "¿Qué perfumes tienen?",
      ]),
    );
  }

  if (intent === "contacto") {
    return NextResponse.json(
      base(
        `Estamos en ${settings.storeAddress}. Podés escribirnos por WhatsApp al ${settings.whatsappDisplay} y te respondemos a la brevedad; los pedidos se coordinan siempre por ese canal.`,
        ["¿Cuánto cuesta el envío?", "¿Qué perfumes tienen?"],
      ),
    );
  }

  // ── 3) Búsqueda en el catálogo por palabras reales del mensaje ───────────
  const words = keywords(text);
  if (words.length > 0) {
    const or = words.flatMap((w) => [
      { name: { contains: w, mode: "insensitive" as const } },
      { brand: { contains: w, mode: "insensitive" as const } },
      { category: { contains: w, mode: "insensitive" as const } },
      { notes: { contains: w, mode: "insensitive" as const } },
      { description: { contains: w, mode: "insensitive" as const } },
    ]);
    const found = await prisma.product.findMany({
      where: { visible: true, OR: or },
      orderBy: { createdAt: "desc" },
      take: 4,
    });
    if (found.length > 0) {
      return NextResponse.json({
        reply: `Estas fragancias encajan con lo que buscás. Tocá una para ver sus notas y reservarla:`,
        suggestions: ["¿Cuánto cuesta el envío?", "¿Cómo pago?"],
        whatsapp: wa,
        products: found.map((p) => toChatProduct(p, manager)),
      } satisfies Reply);
    }
  }

  // ── 4) Catálogo completo ─────────────────────────────────────────────────
  if (intent === "catalogo" || word(text, "perfume", "perfumes", "fragancia", "fragancias", "catalogo", "productos", "venden", "tienen", "opciones")) {
    const sample = catalog.slice(0, 4);
    return NextResponse.json({
      reply: sample.length
        ? "Estas son algunas fragancias del catálogo. Tocá una para ver el detalle:"
        : "El catálogo está cargándose en este momento; escribinos por WhatsApp y te pasamos las opciones.",
      suggestions: ["¿Cuánto cuesta el envío?", "¿Cómo pago?", "¿Tienen ofertas?"],
      whatsapp: wa,
      products: sample.map((p) => toChatProduct(p, manager)),
    } satisfies Reply);
  }

  return NextResponse.json(
    base(
      `No estoy seguro de haber entendido. Puedo ayudarte con el catálogo, el costo de envío, las formas de pago, tus reservas y las ofertas. Si preferís, escribinos por WhatsApp y te responde una persona.`,
      ["¿Qué perfumes tienen?", "¿Cuánto cuesta el envío?", "¿Cómo reservo?"],
    ),
  );
}
