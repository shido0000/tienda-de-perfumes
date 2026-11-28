#!/usr/bin/env node
/**
 * Publica este proyecto (el de la vista previa del chat) en el proyecto de
 * Vercel ya existente, usando un token de API.
 *
 * Uso:
 *   VERCEL_TOKEN=xxx node scripts/deploy-vercel.mjs [--prod]
 *
 * Qué hace, en orden:
 *  1. Comprueba el token y ubica el proyecto/equipo correctos.
 *  2. Vincula el workspace a ese proyecto (.vercel/project.json).
 *  3. Carga/actualiza las variables de entorno de producción con las de .env
 *     (base de datos, JWT, cuenta del dueño, clave del asistente).
 *  4. Sube los archivos y compila en Vercel.
 *
 * Nunca imprime el valor de una variable secreta.
 */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { spawnSync } from "node:child_process";

const TOKEN = process.env.VERCEL_TOKEN;
const PROD = !process.argv.includes("--preview");
const ROOT = process.cwd();
const PROJECT_NAME = process.env.VERCEL_PROJECT_NAME || "tienda-de-perfumes";

if (!TOKEN) {
  console.error("Falta VERCEL_TOKEN en el entorno.");
  process.exit(1);
}

const API = "https://api.vercel.com";

async function api(pathname, init = {}) {
  const res = await fetch(API + pathname, {
    ...init,
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
  });
  const text = await res.text();
  let body = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  return { ok: res.ok, status: res.status, body };
}

function readLocalEnv() {
  const out = {};
  const file = path.join(ROOT, ".env");
  if (!fs.existsSync(file)) return out;
  for (const raw of fs.readFileSync(file, "utf8").split("\n")) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq < 0) continue;
    const key = line.slice(0, eq).trim();
    const val = line
      .slice(eq + 1)
      .trim()
      .replace(/^"(.*)"$/s, "$1")
      .replace(/^'(.*)'$/s, "$1");
    if (key) out[key] = val;
  }
  return out;
}

function run(cmd, args) {
  const res = spawnSync(cmd, args, {
    cwd: ROOT,
    stdio: "inherit",
    env: { ...process.env, VERCEL_TOKEN: TOKEN },
  });
  if (res.status !== 0) throw new Error(`Falló: ${cmd} ${args.join(" ")}`);
}

async function main() {
  // 1. Proyectos visibles para este token
  const list = await api("/v9/projects?limit=100");
  if (!list.ok) {
    console.error("Token inválido o sin permisos:", JSON.stringify(list.body).slice(0, 300));
    process.exit(2);
  }
  const projects = list.body?.projects || [];
  let project = projects.find((p) => p.name === PROJECT_NAME) || projects[0];
  if (!project) {
    console.error("El token no ve ningún proyecto de Vercel.");
    process.exit(3);
  }
  const teamId = project.accountId;
  console.log(`Proyecto: ${project.name} (equipo ${teamId})`);

  const q = `?teamId=${teamId}`;
  const detail = await api(`/v9/projects/${encodeURIComponent(project.name)}${q}`);
  if (detail.ok) project = detail.body;

  // 2. Vincular localmente
  fs.mkdirSync(path.join(ROOT, ".vercel"), { recursive: true });
  fs.writeFileSync(
    path.join(ROOT, ".vercel", "project.json"),
    JSON.stringify({ projectId: project.id, orgId: teamId }, null, 2),
  );
  console.log(".vercel/project.json escrito");

  // 3. Variables de entorno de producción
  const local = readLocalEnv();
  const jwt =
    process.env.JWT_SECRET || local.JWT_SECRET || crypto.randomBytes(32).toString("hex");
  const wanted = {
    DATABASE_URL: local.DATABASE_URL || process.env.DATABASE_URL,
    DIRECT_URL: local.DIRECT_URL || process.env.DIRECT_URL,
    JWT_SECRET: jwt,
    OPENROUTER_API_KEY: local.OPENROUTER_API_KEY || process.env.OPENROUTER_API_KEY,
    ADMIN_EMAIL: process.env.ADMIN_EMAIL || "jonyperez1099@gmail.com",
    ADMIN_PASSWORD: process.env.ADMIN_PASSWORD,
  };

  const existing = await api(`/v9/projects/${project.id}/env${q}`);
  const existingList = existing.body?.envs || [];

  for (const [key, value] of Object.entries(wanted)) {
    if (!value) continue;
    const current = existingList.find(
      (e) => e.key === key && (e.target || []).includes("production"),
    );
    const payload = {
      key,
      value,
      type: key.startsWith("NEXT_PUBLIC_") ? "plain" : "encrypted",
      target: ["production", "preview", "development"],
    };
    if (current) {
      const upd = await api(`/v9/projects/${project.id}/env/${current.id}${q}`, {
        method: "PATCH",
        body: JSON.stringify({ value, target: payload.target, type: payload.type }),
      });
      console.log(`Variable ${key}: ${upd.ok ? "actualizada" : `error ${upd.status}`}`);
    } else {
      const add = await api(`/v10/projects/${project.id}/env${q}`, {
        method: "POST",
        body: JSON.stringify(payload),
      });
      console.log(`Variable ${key}: ${add.ok ? "cargada" : `error ${add.status}`}`);
    }
  }

  // 4. Desplegar
  console.log("\nSubiendo y compilando en Vercel…");
  const args = [
    "--no-install",
    "vercel",
    "deploy",
    PROD ? "--prod" : "",
    "--yes",
    "--scope",
    teamId,
  ].filter(Boolean);
  run("npx", args);
  console.log("\nPublicación terminada.");
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
