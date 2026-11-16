#!/usr/bin/env node
/**
 * Copia a Vercel (producción/preview/development) las variables de conexión
 * que funcionan en este workspace, tomadas de .env:
 *   DATABASE_URL, DIRECT_URL, JWT_SECRET, OPENROUTER_API_KEY
 *
 * El valor del proyecto en Vercel apuntaba a un esquema de Postgres distinto
 * (…_a9deb57c) que no existe, por eso la web publicada respondía sin datos.
 *
 * Uso: VERCEL_TOKEN=xxx node scripts/sync-vercel-env.mjs
 * Nunca imprime valores secretos.
 */
import fs from "node:fs";
import path from "node:path";

const TOKEN = process.env.VERCEL_TOKEN;
const API = "https://api.vercel.com";
const ROOT = process.cwd();
const PROJECT = process.env.VERCEL_PROJECT_NAME || "tienda-de-perfumes";
const KEYS = ["DATABASE_URL", "DIRECT_URL", "JWT_SECRET", "OPENROUTER_API_KEY", "ADMIN_EMAIL", "ADMIN_PASSWORD"];

if (!TOKEN) {
  console.error("Falta VERCEL_TOKEN.");
  process.exit(1);
}

function readEnv() {
  const out = {};
  const raw = fs.readFileSync(path.join(ROOT, ".env"), "utf8");
  for (const line of raw.split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq < 0) continue;
    const k = t.slice(0, eq).trim();
    const v = t.slice(eq + 1).trim().replace(/^"(.*)"$/s, "$1").replace(/^'(.*)'$/s, "$1");
    if (k) out[k] = v;
  }
  return out;
}

async function api(p, init = {}) {
  const res = await fetch(API + p, {
    ...init,
    headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json", ...(init.headers || {}) },
  });
  const text = await res.text();
  let body = null;
  try { body = text ? JSON.parse(text) : null; } catch { body = text; }
  return { ok: res.ok, status: res.status, body };
}

function mask(v) {
  return String(v).replace(/:\/\/([^:]+):[^@]+@/, "://$1:***@");
}

async function main() {
  const list = await api("/v9/projects?limit=100");
  const project = (list.body?.projects || []).find((p) => p.name === PROJECT);
  if (!project) { console.error("Proyecto no encontrado"); process.exit(2); }
  const teamId = project.accountId;
  const q = `?teamId=${teamId}`;
  const local = readEnv();
  const envs = (await api(`/v9/projects/${project.id}/env${q}`)).body?.envs || [];

  for (const key of KEYS) {
    const value = local[key];
    if (!value) { console.log(`${key}: no está en .env, se omite`); continue; }
    const existing = envs.filter((e) => e.key === key);
    if (existing.length === 0) {
      const add = await api(`/v10/projects/${project.id}/env${q}`, {
        method: "POST",
        body: JSON.stringify({ key, value, type: "encrypted", target: ["production", "preview", "development"] }),
      });
      console.log(`${key}: ${add.ok ? "creada" : `error ${add.status} ${JSON.stringify(add.body).slice(0, 160)}`}`);
      continue;
    }
    for (const e of existing) {
      // Vercel no permite cambiar el VALOR de una variable "sensitive": hay que
      // borrarla y volver a crearla. No se pierde nada: el valor nuevo es el
      // que funciona en este workspace.
      let upd;
      if (e.type === "sensitive") {
        const del = await api(`/v9/projects/${project.id}/env/${e.id}${q}`, { method: "DELETE" });
        if (!del.ok) {
          console.log(`${key}: no se pudo borrar la sensitive (${del.status})`);
          continue;
        }
        upd = await api(`/v10/projects/${project.id}/env${q}`, {
          method: "POST",
          body: JSON.stringify({ key, value, type: "sensitive", target: e.target }),
        });
      } else {
        upd = await api(`/v9/projects/${project.id}/env/${e.id}${q}`, {
          method: "PATCH",
          body: JSON.stringify({ value, type: "encrypted", target: e.target }),
        });
      }
      console.log(`${key} [${(e.target || []).join(",")}]: ${upd.ok ? "actualizada" : `error ${upd.status} ${JSON.stringify(upd.body).slice(0, 160)}`}`);
    }
    if (key.endsWith("_URL")) console.log(`   → ${mask(value)}`);
  }
}

main().catch((e) => { console.error(e.message || e); process.exit(1); });
