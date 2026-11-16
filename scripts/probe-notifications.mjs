/**
 * Prueba de punta a punta de los avisos automáticos.
 *
 * 1. Deja un perfume en 0 unidades y crea una alerta "avísame cuando llegue"
 *    con un correo y un teléfono de prueba.
 * 2. Sube el stock por la API del panel: el aviso debe generarse y procesarse
 *    solo (SENT si el canal está configurado, SKIPPED con motivo si no).
 * 3. Muestra la cola y borra todo lo que creó.
 *
 * Uso: node scripts/probe-notifications.mjs
 */
const BASE = process.env.BASE_URL || "http://localhost:3000";
const EMAIL = process.env.ADMIN_EMAIL || "jonyperez1099@gmail.com";
const PASSWORD = process.env.ADMIN_PASSWORD || "shido.0000";

let cookie = "";

async function api(path, init = {}) {
  const res = await fetch(BASE + path, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(cookie ? { Cookie: cookie } : {}),
      ...(init.headers ?? {}),
    },
  });
  const set = res.headers.getSetCookie?.() ?? [];
  if (set.length) cookie = set.map((c) => c.split(";")[0]).join("; ");
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    /* html */
  }
  return { status: res.status, json, text };
}

const out = [];
function log(...args) {
  out.push(args.join(" "));
  console.log(...args);
}

const login = await api("/api/auth/login", {
  method: "POST",
  body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
});
log("login:", login.status);
if (login.status !== 200) process.exit(1);

const list = await api("/api/products");
const product = (list.json?.products ?? [])[0];
if (!product) {
  log("no hay productos");
  process.exit(1);
}
log("producto:", product.id, product.name, "stock", product.stock);

// 1) Dejar en 0
await api(`/api/products/${product.id}`, {
  method: "PATCH",
  body: JSON.stringify({ stock: 0 }),
});

// 2) Alerta de prueba
const { PrismaClient } = await import("@prisma/client");
const prisma = new PrismaClient();
const alert = await prisma.stockAlert.create({
  data: {
    productId: product.id,
    name: "zz-test alerta",
    email: "zz-test@example.com",
    phone: "5491100000009",
    status: "NEW",
  },
});
log("alerta creada:", alert.id);

// 3) Reponer → se dispara solo
const restock = await api(`/api/products/${product.id}`, {
  method: "PATCH",
  body: JSON.stringify({ stock: 3 }),
});
log("reposición:", restock.status, JSON.stringify(restock.json?.restock ?? null));

const queue = await prisma.outboxMessage.findMany({
  where: { subject: { contains: product.name } },
  orderBy: { createdAt: "desc" },
  take: 5,
});
log(
  "cola:",
  queue.map((m) => `${m.channel}:${m.status}${m.error ? " (" + m.error.slice(0, 40) + ")" : ""}`),
);

// 4) Limpieza
await prisma.outboxMessage.deleteMany({ where: { id: { in: queue.map((m) => m.id) } } });
await prisma.stockAlert.deleteMany({ where: { id: alert.id } });
await prisma.product.update({ where: { id: product.id }, data: { stock: product.stock ?? 0 } });
await prisma.$disconnect();
log("limpieza: ok");
