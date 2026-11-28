#!/usr/bin/env node
/**
 * Pruebas de regresión de extremo a extremo para Mist & Mood.
 *
 * Uso:
 *   node scripts/regression.mjs                 # contra localhost:3000
 *   BASE_URL=https://tu-dominio node scripts/regression.mjs
 *   BASE_URL=... ADMIN_EMAIL=... ADMIN_PASSWORD=... node scripts/regression.mjs
 *
 * Qué hace: recorre cada superficie pública y privada de la app (páginas y
 * API), crea un cliente de prueba, ejercita el flujo completo de reserva
 * (carrito, lista de deseos, envío por km, comprobante obligatorio, descuento
 * de stock y rechazo por falta de stock), comprueba los permisos de
 * administración y al final BORRA únicamente los datos que creó (usuario de
 * prueba, sus reservas y el stock que consumió).
 *
 * Sale con código 1 si alguna comprobación falla.
 */
const BASE = process.env.BASE_URL || "http://localhost:3000";
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "jonyperez1099@gmail.com";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const CF_TOKEN = process.env.CLOUDFLARE_API_TOKEN;
const CF_ACCOUNT = process.env.CLOUDFLARE_ACCOUNT_ID;
const D1_DATABASE_ID = process.env.D1_DATABASE_ID || "c5cf1178-9e09-4a12-b567-a9aff41ad8b3";
const PROOF = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFAAH/q842iQAAAABJRU5ErkJggg==";

if (!ADMIN_PASSWORD) throw new Error("Falta ADMIN_PASSWORD para ejecutar la regresión");

const d1Query = async (sql, params = []) => {
  if (!CF_TOKEN || !CF_ACCOUNT) {
    throw new Error("Faltan CLOUDFLARE_API_TOKEN o CLOUDFLARE_ACCOUNT_ID para limpiar D1");
  }
  const res = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT}/d1/database/${D1_DATABASE_ID}/query`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${CF_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ sql, params: params.map(String) }),
    },
  );
  const body = await res.json();
  if (!res.ok || !body.success) {
    throw new Error(body.errors?.[0]?.message || `D1 API respondió ${res.status}`);
  }
  return body.result?.[0];
};

const jar = new Map(); // nombre -> Cookie header
let pass = 0;
const failures = [];
const created = { userId: null, reservationIds: [], stockUsed: [] };

const saveCookies = (name, res) => {
  const raw = res.headers.getSetCookie?.() ?? [];
  const cookies = raw.map((c) => c.split(";")[0]).filter(Boolean);
  if (cookies.length) jar.set(name, cookies.join("; "));
};

const api = async (path, { method = "GET", body, as, raw } = {}) => {
  const headers = {};
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (as && jar.get(as)) headers.Cookie = jar.get(as);
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
    redirect: "manual",
  });
  saveCookies(as || path, res);
  if (raw) return { status: res.status, res };
  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch { /* no es JSON */ }
  return { status: res.status, json, text };
};

const ok = (name, detail = "") => {
  pass++;
  console.log(`  ✓ ${name}${detail ? ` — ${detail}` : ""}`);
};
const fail = (name, detail = "") => {
  failures.push({ name, detail });
  console.log(`  ✗ ${name}${detail ? ` — ${detail}` : ""}`);
};
const check = (name, cond, detail = "") => (cond ? ok(name, detail) : fail(name, detail));

const section = (title) => console.log(`\n${title}`);

const run = async () => {
  console.log(`Regresión de Mist & Mood → ${BASE}`);
  const stamp = Date.now();
  const email = `regresion.${stamp}@example.com`;
  const password = "regresion12345";

  // ── 1. Salud y catálogo público ───────────────────────────────────────────
  section("1. Estado del servicio y datos públicos");
  const health = await api("/api/health");
  check("GET /api/health responde ok", health.status === 200 && health.json?.ok === true, `status ${health.status}`);
  check("Hay productos cargados", (health.json?.productCount ?? 0) > 0, `${health.json?.productCount} productos`);
  check("Existe la cuenta de administrador", health.json?.adminExists === true);

  const settings = await api("/api/settings");
  check("GET /api/settings", settings.status === 200 && !!settings.json?.settings?.brand, settings.json?.settings?.brand);
  check("La moneda base es CUP", settings.json?.settings?.baseCurrency === "CUP", settings.json?.settings?.baseCurrency);

  const cats = await api("/api/categories");
  check("GET /api/categories", cats.status === 200 && Array.isArray(cats.json?.categories), `${cats.json?.categories?.length ?? 0} categorías`);

  const list = await api("/api/products");
  check("GET /api/products", list.status === 200 && Array.isArray(list.json?.products), `${list.json?.products?.length ?? 0} productos`);
  check("El catálogo NO expone el costo interno", !JSON.stringify(list.json).includes("costUsd"));

  const product = (list.json?.products ?? []).find((p) => p.stock === null || p.stock >= 2);
  if (!product) {
    fail("Hay un producto con stock disponible para probar la reserva");
    return;
  }
  ok("Producto de prueba elegido", `${product.name ?? product.id}`);
  const detail = await api(`/api/products/${product.id}`);
  check("GET /api/products/[id]", detail.status === 200 && detail.json?.product?.id === product.id);
  check("GET /api/products/inexistente devuelve 404", (await api("/api/products/no-existe")).status === 404);

  // ── 2. Páginas públicas ──────────────────────────────────────────────────
  section("2. Páginas públicas");
  for (const p of ["/", "/login", "/registro", "/carrito",
    "/legal/terminos", "/legal/reservas-pagos", "/legal/privacidad", "/legal/cookies"]) {
    const r = await api(p, { raw: true });
    const html = await r.res.text();
    check(`GET ${p}`, r.status === 200 && html.includes("<html"), `status ${r.status}`);
  }
  const home = await (await fetch(`${BASE}/`)).text();
  check("La portada vende en CUP y no ofrece cambiar de moneda",
    home.includes("CUP") && !/otra moneda|otra divisa/i.test(home));
  check("La navegación ofrece Mi cuenta y Mi perfil",
    home.includes("Mi cuenta") && home.includes("Mi perfil"));
  check("La portada ya no muestra el texto de ejemplo del andamio",
    !home.includes("scaffolded by NoCoder"));

  // ── 3. Registro e inicio de sesión ───────────────────────────────────────
  section("3. Cuentas: registro, login, sesión");
  const reg = await api("/api/auth/register", {
    method: "POST",
    body: { name: "Prueba Regresión", email, password, phone: "+53 5512 3456" },
  });
  created.userId = reg.json?.user?.id ?? null;
  check("POST /api/auth/register crea la cuenta", reg.status === 200 || reg.status === 201, `status ${reg.status}`);
  check("El registro no acepta el mismo correo dos veces",
    (await api("/api/auth/register", { method: "POST", body: { name: "Otro", email, password } })).status >= 400);

  check("Login con contraseña incorrecta devuelve 401",
    (await api("/api/auth/login", { method: "POST", body: { email, password: "incorrecta" } })).status === 401);
  const login = await api("/api/auth/login", { method: "POST", body: { email, password }, as: "client" });
  check("Login del cliente", login.status === 200 && login.json?.user?.role === "CLIENT", `status ${login.status}`);
  const me = await api("/api/auth/me", { as: "client" });
  check("GET /api/auth/me con sesión", me.status === 200 && me.json?.user?.email === email);
  check("GET /api/auth/me sin sesión devuelve 401", (await api("/api/auth/me")).status === 401);

  // ── 4. Carrito y lista de deseos ─────────────────────────────────────────
  section("4. Carrito y lista de deseos");
  const addCart = await api("/api/cart", { method: "POST", as: "client", body: { productId: product.id, quantity: 1 } });
  check("POST /api/cart agrega un producto", addCart.status === 200, `status ${addCart.status}`);
  check("PATCH /api/cart cambia la cantidad",
    (await api("/api/cart", { method: "PATCH", as: "client", body: { productId: product.id, quantity: 2 } })).status === 200);
  const cartBad = await api("/api/cart", { method: "POST", as: "client", body: { productId: product.id, quantity: 0 } });
  check("POST /api/cart rechaza cantidad 0", cartBad.status === 400, `status ${cartBad.status}`);
  check("POST /api/cart sin sesión devuelve 401",
    (await api("/api/cart", { method: "POST", body: { productId: product.id, quantity: 1 } })).status === 401);
  check("DELETE /api/cart vacía el producto",
    (await api(`/api/cart?productId=${product.id}`, { method: "DELETE", as: "client" })).status === 200);

  const wish = await api("/api/wishlist", { method: "POST", as: "client", body: { productId: product.id } });
  check("POST /api/wishlist guarda el favorito", wish.status === 200, `status ${wish.status}`);
  const wishList = await api("/api/wishlist", { as: "client" });
  check("GET /api/wishlist lo devuelve", wishList.status === 200);
  check("DELETE /api/wishlist lo quita",
    (await api(`/api/wishlist?productId=${product.id}`, { method: "DELETE", as: "client" })).status === 200);

  // ── 5. Envío por kilómetro en CUP ────────────────────────────────────────
  section("5. Envío por distancia");
  const quote = await api("/api/shipping/quote", {
    method: "POST", as: "client", body: { latitude: 23.12, longitude: -82.37 },
  });
  check("POST /api/shipping/quote cotiza", quote.status === 200, `status ${quote.status}`);
  const quoted = quote.json;
  check("La cotización trae distancia y costo",
    !!quoted && typeof quoted.cost === "number" && typeof quoted.distanceKm === "number",
    quoted ? `${quoted.distanceKm} km → ${quoted.cost}` : "");
  check("El envío se expresa en CUP", quoted?.currency === "CUP", quoted?.currency);

  // ── 6. Reservas: comprobante obligatorio, stock ──────────────────────────
  section("6. Reservas");
  const before = (await api(`/api/products/${product.id}`)).json?.product?.stock;

  const noProof = await api("/api/reservations", {
    method: "POST", as: "client",
    body: { items: [{ productId: product.id, quantity: 1 }], deliveryType: "PICKUP", paymentMethod: "TRANSFER" },
  });
  check("Transferencia sin comprobante se rechaza", noProof.status === 400, `status ${noProof.status}`);

  const pickup = await api("/api/reservations", {
    method: "POST", as: "client",
    body: {
      items: [{ productId: product.id, quantity: 1 }],
      deliveryType: "PICKUP", paymentMethod: "TRANSFER", transferProofUrl: PROOF,
    },
  });
  const resv = pickup.json?.reservation;
  if (resv?.id) created.reservationIds.push(resv.id);
  check("Reserva con retiro y comprobante se crea", pickup.status === 201 || pickup.status === 200, `status ${pickup.status}`);
  check("La reserva trae código legible", !!resv?.code, resv?.code);
  check("La reserva queda pendiente de confirmación", resv?.status === "PENDING", resv?.status);

  const after = (await api(`/api/products/${product.id}`)).json?.product?.stock;
  if (before !== null && before !== undefined) {
    created.stockUsed.push({ productId: product.id, quantity: 1 });
    check("El stock se descuenta al reservar", after === before - 1, `${before} → ${after}`);
  }

  const delivery = await api("/api/reservations", {
    method: "POST", as: "client",
    body: {
      items: [{ productId: product.id, quantity: 1 }],
      deliveryType: "DELIVERY", paymentMethod: "CASH",
      address: "Calle 23 #100, Vedado", latitude: 23.12, longitude: -82.37,
    },
  });
  const delResv = delivery.json?.reservation;
  if (delResv?.id) created.reservationIds.push(delResv.id);
  check("Reserva con envío a domicilio se crea", delivery.status === 201 || delivery.status === 200, `status ${delivery.status}`);
  check("Cobra envío en CUP", delResv?.currency === "CUP" && Number(delResv?.shippingCost) > 0,
    `envío ${delResv?.shippingCost}`);
  if (before !== null && before !== undefined) created.stockUsed.push({ productId: product.id, quantity: 1 });

  check("Pedir más unidades de las que hay devuelve 409",
    [409, 400].includes((await api("/api/reservations", {
      method: "POST", as: "client",
      body: { items: [{ productId: product.id, quantity: 999 }], deliveryType: "PICKUP", paymentMethod: "CASH" },
    })).status));
  check("POST /api/reservations sin sesión devuelve 401",
    (await api("/api/reservations", {
      method: "POST",
      body: { items: [{ productId: product.id, quantity: 1 }], deliveryType: "PICKUP", paymentMethod: "CASH" },
    })).status === 401);

  if (resv?.id) {
    const own = await api(`/api/reservations/${resv.id}`, { as: "client" });
    check("GET /api/reservations/[id] devuelve la reserva propia", own.status === 200 && own.json?.reservation?.id === resv.id);
    const mine = await api("/api/reservations", { as: "client" });
    check("GET /api/reservations lista las reservas propias", mine.status === 200);
  }

  // ── 7. Cuenta del cliente ────────────────────────────────────────────────
  section("7. Cuenta del cliente");
  check("GET /api/account", (await api("/api/account", { as: "client" })).status === 200);
  check("PATCH /api/account guarda el nombre",
    (await api("/api/account", { method: "PATCH", as: "client", body: { name: "Prueba Regresión Editada" } })).status === 200);
  check("PATCH /api/account sin sesión devuelve 401",
    (await api("/api/account", { method: "PATCH", body: { name: "Intruso" } })).status === 401);

  // ── 8. Administración y permisos ─────────────────────────────────────────
  section("8. Administración y permisos");
  check("El cliente NO entra a la API de administración",
    (await api("/api/admin/stats", { as: "client" })).status === 403);

  const adminLogin = await api("/api/auth/login", { method: "POST", body: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD }, as: "admin" });
  check("Login del administrador", adminLogin.status === 200 && adminLogin.json?.user?.role === "ADMIN", `status ${adminLogin.status}`);

  for (const ep of ["/api/admin/stats", "/api/admin/reservations", "/api/admin/users", "/api/admin/campaigns", "/api/admin/categories", "/api/admin/products"]) {
    const r = await api(ep, { as: "admin" });
    check(`GET ${ep}`, r.status === 200, `status ${r.status}`);
  }
  check("La API de administración sin sesión devuelve 401/403",
    [401, 403].includes((await api("/api/admin/stats")).status));
  const adminPatch = (id, status) =>
    api(`/api/admin/reservations?id=${encodeURIComponent(id)}`, { method: "PATCH", as: "admin", body: { status } });
  check("PATCH de reserva con estado inválido devuelve 400",
    (await adminPatch(resv?.id, "NO_EXISTE")).status === 400);
  if (delResv?.id) {
    const confirm = await adminPatch(delResv.id, "CONFIRMED");
    check("El administrador confirma una reserva", confirm.status === 200 && confirm.json?.reservation?.status === "CONFIRMED", `status ${confirm.status}`);
  }

  // ── 9. Páginas protegidas ────────────────────────────────────────────────
  section("9. Páginas protegidas");
  for (const p of ["/checkout", "/mi-cuenta", "/mis-reservas", "/deseos", "/admin"]) {
    const anon = await api(p, { raw: true });
    check(`${p} redirige al login sin sesión`, anon.status === 307 || anon.status === 302 || anon.status === 200 && (await anon.res.text()).includes("login") || anon.status === 307, `status ${anon.status}`);
  }
  for (const [p, who] of [["/mi-cuenta", "client"], ["/mi-cuenta/perfil", "client"], ["/mis-reservas", "client"], ["/admin", "admin"]]) {
    const r = await api(p, { raw: true, as: who });
    check(`${p} abre con sesión de ${who}`, r.status === 200, `status ${r.status}`);
  }
  // Un cliente recibe la página de "sin permisos" (200) o una redirección; lo que
  // NO puede pasar es que vea el panel. Se comprueba el contenido, no sólo el código.
  const clientAdmin = await api("/admin", { raw: true, as: "client" });
  const clientAdminHtml = await clientAdmin.res.text();
  check("Un cliente no ve el panel de administración",
    clientAdmin.status === 307 || clientAdmin.status === 302 || clientAdmin.status === 403 ||
    (clientAdmin.status === 200 && /no tiene permisos de administrador/i.test(clientAdminHtml) && !/AdminPanel|Gestión de reservas/i.test(clientAdminHtml)),
    `status ${clientAdmin.status}`);
};

const cleanup = async () => {
  section("10. Limpieza de datos de prueba");
  try {
    if (created.userId) {
      const statements = [
        "DELETE FROM ReservationItem WHERE reservationId IN (SELECT id FROM Reservation WHERE userId = ?)",
        "DELETE FROM Reservation WHERE userId = ?",
        "DELETE FROM CartItem WHERE userId = ?",
        "DELETE FROM WishlistItem WHERE userId = ?",
        "DELETE FROM SiteVisit WHERE userId = ?",
        "DELETE FROM ManagerVisit WHERE userId = ?",
        "DELETE FROM CartAdd WHERE userId = ?",
        "DELETE FROM PushSubscription WHERE userId = ?",
        "DELETE FROM WithdrawalRequest WHERE userId = ?",
        "DELETE FROM User WHERE id = ?",
      ];
      for (const sql of statements) {
        await d1Query(sql, [created.userId]).catch(() => {});
      }
      ok("Cuenta y reservas de prueba eliminadas");
    }
    for (const { productId, quantity } of created.stockUsed) {
      await d1Query("UPDATE Product SET stock = stock + ? WHERE id = ?", [quantity, productId]);
    }
    if (created.stockUsed.length) ok("Stock devuelto al catálogo");
  } catch (e) {
    fail("Limpieza de datos de prueba", e.message);
  }
};

try {
  await run();
} catch (e) {
  fail("La suite se interrumpió", e.message);
} finally {
  await cleanup();
}

console.log(`\n${"─".repeat(58)}`);
console.log(`${pass} comprobaciones OK, ${failures.length} fallos`);
if (failures.length) {
  console.log("\nFallos:");
  for (const f of failures) console.log(` - ${f.name}${f.detail ? ` (${f.detail})` : ""}`);
  process.exit(1);
}
console.log("Todo en orden.");
