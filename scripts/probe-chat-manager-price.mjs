#!/usr/bin/env node
/**
 * Comprueba que el asistente muestre el precio CON la ganancia del gestor a
 * quien llegó por el enlace de un gestor, y el precio normal al resto.
 *
 * Uso: node scripts/probe-chat-manager-price.mjs [http://localhost:3000]
 */
const BASE = process.argv[2] || "http://localhost:3000";

const ask = async (message, refCode) => {
  const headers = { "Content-Type": "application/json" };
  if (refCode) headers.Cookie = `mm_ref=${refCode}`;
  const res = await fetch(`${BASE}/api/chat`, {
    method: "POST",
    headers,
    body: JSON.stringify({ message, history: [] }),
  });
  if (!res.ok) throw new Error(`chat ${res.status}`);
  return res.json();
};

const main = async () => {
  const normal = await ask("¿Qué perfumes tienen?");
  const first = (normal.products || [])[0];
  if (!first) throw new Error("el catálogo está vacío: no hay nada que comparar");

  const manager = process.env.PROBE_REF_CODE;
  if (!manager) {
    console.log("Precio normal:", first.name, first.price);
    console.log("Falta PROBE_REF_CODE (código de un gestor con ganancia) para comparar.");
    return;
  }

  const referred = await ask("¿Qué perfumes tienen?", manager);
  const same = (referred.products || []).find((p) => p.id === first.id);
  console.log("normal  :", first.name, first.price);
  console.log("gestor  :", same?.name, same?.price);
  if (!same || same.price === first.price) {
    console.log("FALLA: el precio del gestor no incluye la ganancia.");
    process.exit(1);
  }
  console.log("OK: el precio mostrado al cliente del gestor es mayor.");
};

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
