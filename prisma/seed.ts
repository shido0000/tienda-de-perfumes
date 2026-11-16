import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

/**
 * Seed "Mist & Mood" — perfumería cubana.
 * Idempotente: actualiza la configuración, hace upsert del admin y del cliente
 * demo, y repunta el catálogo de ejemplo a las fragancias de muestra.
 */
const prisma = new PrismaClient();

const IMG = (id: string) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=1200&q=70`;

type SeedProduct = {
  name: string;
  brand: string;
  description: string;
  category: string;
  notes: string;
  price: number;
  /** Precio anterior (tachado) cuando el producto está en rebaja. */
  compareAtPrice?: number;
  stock: number;
  image: string;
  duration: string;
  occasion: "DIA" | "NOCHE" | "AMBAS";
};

/**
 * Preguntas que lleva toda ficha nueva. El dueño las retoca desde Productos →
 * "Preguntas frecuentes de este perfume". Son las cuatro que la gente pregunta
 * siempre antes de reservar.
 */
const DEFAULT_FAQS = [
  {
    q: "¿Es original?",
    a: "Sí. Cada frasco llega sellado de fábrica, con su caja y su código de lote. Si al recibirlo tenés cualquier duda, escribinos por WhatsApp y lo revisamos con vos.",
  },
  {
    q: "¿Cuánto dura el perfume?",
    a: "En la piel rinde entre 6 y 8 horas, y en la ropa puede quedar varias horas más. Para que dure más, aplicalo sobre la piel hidratada y en los puntos de pulso.",
  },
  {
    q: "¿Puedo probarlo antes de comprar?",
    a: "Sí. Tenemos decants de prueba y el set de descubrimiento, así conocés el aroma en tu piel antes de llevarte el frasco completo.",
  },
  {
    q: "¿Cómo hago la reserva y el pago?",
    a: "Reservás desde la ficha del perfume, eligiendo entrega a domicilio o retiro en tienda. Te confirmamos por WhatsApp con los datos de pago (transferencia o contraentrega).",
  },
];

const PRODUCTS: SeedProduct[] = [  {
    name: "Ámbar Nº 7 · Eau de parfum",
    brand: "Casa Vergara",
    description:
      "Un ámbar cálido montado sobre benjuí y vainilla de Madagascar, con un fondo de maderas secas. Proyección media, pensado para la noche y para el invierno. Frasco de 50 ml con atomizador.",
    category: "Nicho",
    notes: "Salida: bergamota · Corazón: benjuí, incienso · Fondo: vainilla, cedro",
    price: 56000,
    stock: 8,
    image: IMG("1541643600914-78b084683601"),
    duration: "8-10 h",
    occasion: "NOCHE",
  },
  {
    name: "Higo y Vetiver",
    brand: "Atelier Sur",
    description:
      "Verde, jugoso y apenas lechoso: hoja de higo recién cortada sobre vetiver de Haití. Un perfume diurno, limpio, que funciona todo el año. Frasco de 100 ml.",
    category: "Nicho",
    notes: "Salida: hoja de higo · Corazón: savia verde · Fondo: vetiver, musgo",
    price: 47000,
    stock: 15,
    image: IMG("1594035910387-fea47794261f"),
    duration: "6-7 h",
    occasion: "AMBAS",
  },
  {
    name: "Azahar de Sevilla",
    brand: "Casa Vergara",
    description:
      "Flor de naranjo en su punto justo: luminosa sin ser dulce, con un fondo de almizcle blanco que la sostiene. Frasco de 75 ml.",
    category: "Clásico",
    notes: "Salida: neroli · Corazón: azahar · Fondo: almizcle blanco",
    price: 43000,
    stock: 22,
    image: IMG("1615634260167-c8cdede054de"),
    duration: "6-8 h",
    occasion: "AMBAS",
  },
  {
    name: "Cuero de Biblioteca",
    brand: "Maison Oter",
    description:
      "Cuero gastado, papel viejo y un hilo de tabaco. Una fragancia de interiores y de piel, intensa y seca, para quien no busca pasar desapercibido. Frasco de 50 ml.",
    category: "Oriental",
    notes: "Salida: pimienta negra · Corazón: cuero, tabaco · Fondo: sándalo, haba tonka",
    price: 72000,
    stock: 5,
    image: IMG("1587017539504-67cfbddac569"),
    duration: "10-12 h",
    occasion: "AMBAS",
  },
  {
    name: "Agua de Sal",
    brand: "Atelier Sur",
    description:
      "Aire de costa en un frasco: sal marina, cítricos helados y una madera gris que queda en la piel. Eau de toilette de 100 ml.",
    category: "Fresco",
    notes: "Salida: limón de Amalfi · Corazón: sal marina, hinojo · Fondo: madera gris",
    price: 33000,
    // Rebaja: precio anterior tachado en la ficha y en "Rebajas".
    compareAtPrice: 41000,
    stock: 30,
    image: IMG("1592945403244-b3fbafd7f539"),
    duration: "5-6 h",
    occasion: "AMBAS",
  },
  {
    name: "Rosa de Medianoche",
    brand: "Maison Oter",
    description:
      "Rosa de Damasco oscurecida con pachulí y un toque de frambuesa negra. Femenina y sin edad, con una estela larga. Frasco de 50 ml.",
    category: "Floral",
    notes: "Salida: frambuesa negra · Corazón: rosa de Damasco · Fondo: pachulí, ámbar gris",
    price: 62000,
    compareAtPrice: 74000,
    stock: 11,
    image: IMG("1595425970377-c9703cf48b6d"),
    duration: "8-9 h",
    occasion: "NOCHE",
  },
  {
    name: "Cedro y Pimienta",
    brand: "Norte Botánica",
    description:
      "Un amaderado nítido: pimienta rosa al principio y cedro del Atlas que se va secando con las horas. Unisex. Frasco de 75 ml.",
    category: "Amaderado",
    notes: "Salida: pimienta rosa · Corazón: cedro del Atlas · Fondo: vetiver, musgo de roble",
    price: 39000,
    stock: 17,
    image: IMG("1619994403073-2cec844b8e63"),
    duration: "7-8 h",
    occasion: "AMBAS",
  },
  {
    name: "Set de descubrimiento · 5 x 10 ml",
    brand: "Casa Vergara",
    description:
      "Cinco fragancias de la casa en formato de viaje, con tarjetas de notas y vale de descuento para el frasco completo. Ideal para elegir la primera.",
    category: "Sets",
    notes: "5 frascos de 10 ml · tarjetas de notas incluidas",
    price: 18000,
    stock: 24,
    image: IMG("1547887538-e3a2f32cb1cc"),
    duration: "6-7 h",
    occasion: "NOCHE",
  },
];

const SETTINGS = {
  brand: "Mist & Mood",
  tagline: "",
  storeAddress: "Calle Ejemplo 145, La Habana",
  bankDetails:
    "Banco Ejemplo\nTitular: Mist & Mood\nCUENTA: 0000000000\nAlias: MIST-AND-MOOD",
  baseCurrency: "CUP",
  // Moneda en la que el cliente ve los precios. La define la tienda.
  displayCurrency: "CUP",
  // Números de WhatsApp que reciben el aviso de cada reserva nueva.
  notificationPhones: [] as string[],
  whatsapp: "5350000000",
  whatsappDisplay: "+53 5000 0000",
  storeLat: 23.1136,
  storeLng: -82.3666,
  baseRate: 250,
  perKm: 120,
  maxRadius: 20,
  // rate = cuántos CUP vale 1 unidad de esa moneda (CUP siempre 1).
  currencies: [
    { code: "CUP", symbol: "$", rate: 1, label: "Peso cubano" },
    { code: "USD", symbol: "US$", rate: 320, label: "Dólar" },
    { code: "EUR", symbol: "€", rate: 345, label: "Euro" },
    { code: "MLC", symbol: "MLC", rate: 270, label: "MLC" },
  ],
};

async function main() {
  await prisma.storeSettings.upsert({
    where: { id: "singleton" },
    update: SETTINGS,
    create: { id: "singleton", ...SETTINGS },
  });

  // Cuenta del dueño. En el deploy se puede definir con ADMIN_EMAIL / ADMIN_PASSWORD;
  // si no están, se usan los valores por defecto documentados en el README.
  const adminEmail = process.env.ADMIN_EMAIL || "jonyperez1099@gmail.com";
  const adminPassword = process.env.ADMIN_PASSWORD || "shido.0000";
  if (!process.env.ADMIN_EMAIL || !process.env.ADMIN_PASSWORD) {
    console.warn(
      "\n⚠  ADMIN_EMAIL / ADMIN_PASSWORD no están definidas en el entorno.\n" +
        "   Se usó la cuenta por defecto del repositorio, que cualquiera puede leer.\n" +
        "   Definí las dos variables en el deploy y volvé a publicar.\n",
    );
  }
  const adminPasswordHash = await bcrypt.hash(adminPassword, 10);

  // Si venía el correo de ejemplo de una instalación anterior, se renombra
  // en vez de crear una segunda cuenta de administrador.
  for (const legacyEmail of ["admin@mistmood.example.com", "admin@nochendeautor.example.com"]) {
    const legacy = await prisma.user.findUnique({ where: { email: legacyEmail } });
    if (legacy && legacyEmail !== adminEmail) {
      const taken = await prisma.user.findUnique({ where: { email: adminEmail } });
      if (taken) {
        await prisma.user.delete({ where: { id: legacy.id } });
      } else {
        await prisma.user.update({ where: { id: legacy.id }, data: { email: adminEmail } });
      }
    }
  }

  await prisma.user.upsert({
    where: { email: adminEmail },
    update: { role: "ADMIN", passwordHash: adminPasswordHash },
    create: {
      email: adminEmail,
      name: "Dueño de la tienda",
      role: "ADMIN",
      passwordHash: adminPasswordHash,
    },
  });

  await prisma.user.upsert({
    where: { email: "cliente@ejemplo.com" },
    update: {},
    create: {
      email: "cliente@ejemplo.com",
      name: "Cliente de prueba",
      role: "CLIENT",
      passwordHash: await bcrypt.hash("Cliente1234", 10),
    },
  });

  const existing = await prisma.product.findMany({ orderBy: { createdAt: "asc" } });

  // Categorías: se crean a partir del catálogo de muestra (idempotente).
  const categoryNames = [...new Set(PRODUCTS.map((p) => p.category))];
  for (let i = 0; i < categoryNames.length; i++) {
    const name = categoryNames[i];
    const slug = name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
    await prisma.category.upsert({
      where: { name },
      update: {},
      create: { name, slug, order: i + 1 },
    });
  }
  const categoryRows = await prisma.category.findMany();
  const categoryByName = new Map(categoryRows.map((c) => [c.name, c]));

  for (let i = 0; i < PRODUCTS.length; i++) {
    const p = PRODUCTS[i];
    const cat = categoryByName.get(p.category);
    const data = {
      name: p.name,
      brand: p.brand,
      description: p.description,
      category: p.category,
      categoryId: cat?.id ?? null,
      notes: p.notes,
      price: p.price,
      compareAtPrice: p.compareAtPrice ?? null,
      currency: "CUP",
      // Costo en USD de ejemplo (aproximado, solo visible para administración).
      costUsd: Math.round((p.price / 320) * 0.62 * 100) / 100,
      images: [p.image],
      visible: true,
      stock: p.stock,
      duration: p.duration,
      occasion: p.occasion,
    };
    if (existing[i]) {
      await prisma.product.update({ where: { id: existing[i].id }, data });
    } else {
      // Las preguntas frecuentes se cargan solo al crear el perfume: en una
      // recarga del seed se respetan las que el dueño haya editado.
      await prisma.product.create({ data: { ...data, faqs: DEFAULT_FAQS } });
    }
  }

  for (const extra of existing.slice(PRODUCTS.length)) {
    await prisma.product.update({
      where: { id: extra.id },
      data: { visible: false },
    });
  }

  // ---------------------------------------------------------------- Ofertas
  // Combos de ejemplo (idempotentes): se identifican por su título.
  const current = await prisma.product.findMany({ where: { visible: true } });
  const byName = new Map(current.map((p) => [p.name, p]));
  const priceOf = (...names: string[]) =>
    names.reduce((sum, n) => sum + Number(byName.get(n)?.price ?? 0), 0);

  const COMBOS = [
    {
      title: "Dúo fresco · Agua de Sal + Higo y Vetiver",
      description:
        "Dos frescos para el día: uno marino y otro verde y amaderado. Juntos bajan el precio del par.",
      image: IMG("1613521551177-511eab868c4d"),
      names: ["Agua de Sal", "Higo y Vetiver"],
      price: 70000,
      compareAtPrice: 80000,
      order: 1,
    },
    {
      title: "Ritual de noche · Rosa + Cedro",
      description:
        "Una floral oscura para la noche y un amaderado seco para el día siguiente. Ahorrás en el par.",
      image: IMG("1615634260167-c8cdede054de"),
      names: ["Rosa de Medianoche", "Cedro y Pimienta"],
      price: 89000,
      compareAtPrice: 101000,
      order: 2,
    },
  ];

  for (const c of COMBOS) {    const items = c.names
      .map((n) => byName.get(n))
      .filter((p): p is NonNullable<typeof p> => Boolean(p));

    // Las ofertas se guardan en USD (la referencia con la que la tienda fija el
    // precio del combo). Los valores del seed están escritos en CUP, se
    // convierten con la cotización por defecto (320 CUP = 1 USD).
    const toUsd = (cup: number) => Math.round((cup / 320) * 10000) / 10000;
    const data = {
      title: c.title,
      description: c.description,
      image: c.image,
      price: toUsd(c.price),
      compareAtPrice: c.compareAtPrice > c.price ? toUsd(c.compareAtPrice) : null,
      currency: "USD",
      visible: true,
      order: c.order,
    };

    const found = await prisma.combo.findFirst({ where: { title: c.title } });
    let comboId: string;
    if (found) {
      await prisma.combo.update({ where: { id: found.id }, data });
      comboId = found.id;
    } else {
      const created = await prisma.combo.create({ data });
      comboId = created.id;
    }

    // Se reemplazan los items para que el combo quede siempre coherente.
    await prisma.comboItem.deleteMany({ where: { comboId } });
    for (const p of items) {
      await prisma.comboItem.create({
        data: { comboId, productId: p.id, quantity: 1 },
      });
    }
    // Si ningún producto del combo existe todavía, no se muestra en la web.
    if (items.length === 0) {
      await prisma.combo.update({ where: { id: comboId }, data: { visible: false } });
    }
  }

  // ---------------------------------------------------------------- Banners
  const BANNERS = [
    {
      title: "Ofertas de la semana",
      subtitle: "Combos de fragancias con precio especial. Por tiempo limitado.",
      image: null,
      ctaLabel: "Ver ofertas",
      ctaUrl: "/ofertas",
      background: "#1b1a17",
      textColor: "#f6f1e6",
      placement: "HOME",
      order: 1,
      endsAt: null,
    },
    {
      title: "Rebajas",
      subtitle: "Últimas unidades con el precio anterior tachado.",
      image: null,
      ctaLabel: "Ver rebajas",
      ctaUrl: "/rebajas",
      background: "#6b1f2a",
      textColor: "#f6f1e6",
      placement: "BOTH",
      order: 2,
      endsAt: null,
    },
  ] as const;

  for (const b of BANNERS) {
    const found = await prisma.banner.findFirst({ where: { title: b.title } });
    const data = {
      title: b.title,
      subtitle: b.subtitle,
      image: b.image,
      ctaLabel: b.ctaLabel,
      ctaUrl: b.ctaUrl,
      background: b.background,
      textColor: b.textColor,
      placement: b.placement,
      visible: true,
      order: b.order,
      endsAt: b.endsAt,
    };
    if (found) {
      await prisma.banner.update({ where: { id: found.id }, data });
    } else {
      await prisma.banner.create({ data });
    }
  }

  // ------------------------------------------------ Plantillas de campaña
  // Mensajes de WhatsApp listos para reusar con cualquier segmento. Solo se
  // crean si el dueño todavía no guardó ninguna, para no pisar las suyas.
  const templateCount = await prisma.campaignTemplate.count();
  if (templateCount === 0) {
    await prisma.campaignTemplate.createMany({
      data: [
        {
          title: "Volvió tu perfume",
          platform: "WHATSAPP",
          message:
            "Hola {nombre}, te escribimos de la tienda: volvió a entrar el perfume que estabas esperando. Te guardamos uno si respondés este mensaje en las próximas 24 horas.",
          uses: 0,
        },
        {
          title: "Recompra a los 2 meses",
          platform: "WHATSAPP",
          message:
            "Hola {nombre}, ¿cómo va tu frasco? Si ya está por terminar, te preparo otro y te lo dejo reservado con retiro en tienda o entrega a domicilio.",
          uses: 0,
        },
        {
          title: "Novedad del catálogo",
          platform: "WHATSAPP",
          message:
            "Hola {nombre}, entró una fragancia nueva a la tienda y creemos que te va a gustar. Te dejo el enlace para que la veas y la pruebes en piel cuando quieras.",
          uses: 0,
        },
      ],
    });
    console.log("3 plantillas de campaña cargadas.");
  }

  const n = await prisma.product.count({ where: { visible: true } });
  console.log(`Seed listo. ${n} perfumes visibles en el catálogo.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
