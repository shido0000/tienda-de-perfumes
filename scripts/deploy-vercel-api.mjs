#!/usr/bin/env node
/**
 * Publica el proyecto por la API REST de Vercel (sin el CLI).
 *
 * El CLI (`vercel deploy`) falla con este token de equipo ("User not found"),
 * porque necesita resolver la cuenta personal. La API de despliegues acepta
 * los archivos en línea y funciona con tokens de equipo.
 *
 * Uso:  VERCEL_TOKEN=xxx node scripts/deploy-vercel-api.mjs
 *
 * - Sube solo el código fuente (respeta .vercelignore + exclusiones fijas).
 * - Usa las variables de entorno que ya tiene el proyecto en Vercel.
 * - Espera a que el despliegue quede READY e imprime la URL.
 */
import fs from "node:fs";
import path from "node:path";

const TOKEN = process.env.VERCEL_TOKEN;
const ROOT = process.cwd();
const PROJECT = process.env.VERCEL_PROJECT_NAME || "tienda-de-perfumes";
const API = "https://api.vercel.com";

if (!TOKEN) {
  console.error("Falta VERCEL_TOKEN.");
  process.exit(1);
}

const SKIP_DIRS = new Set([
  "node_modules",
  ".next",
  ".git",
  ".vercel",
  "out",
  "dist",
  "build",
  "coverage",
  ".nocoder",
  ".vscode",
  ".idea",
]);
const SKIP_FILES = new Set([
  ".env",
  ".env.local",
  "tsconfig.tsbuildinfo",
  ".DS_Store",
]);

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

function collect(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith(".") && entry.name !== ".env.example") {
      // .env.example sirve de documentación; el resto de dotfiles no hace falta
      if (entry.name !== ".gitignore" && entry.name !== ".vercelignore") continue;
    }
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue;
      collect(path.join(dir, entry.name), files);
      continue;
    }
    if (SKIP_FILES.has(entry.name)) continue;
    const abs = path.join(dir, entry.name);
    const rel = path.relative(ROOT, abs).split(path.sep).join("/");
    if (rel.endsWith(".log") || rel.endsWith(".tsbuildinfo")) continue;
    if (rel.startsWith("scripts/") && /^(regression\.mjs|smoke\.sh)$/.test(path.basename(rel)))
      continue;
    files.push({ file: rel, data: fs.readFileSync(abs, "utf8") });
  }
  return files;
}

async function main() {
  const list = await api("/v9/projects?limit=100");
  if (!list.ok) {
    console.error("Token inválido:", JSON.stringify(list.body).slice(0, 300));
    process.exit(2);
  }
  const project =
    (list.body.projects || []).find((p) => p.name === PROJECT) || list.body.projects?.[0];
  if (!project) {
    console.error("No hay proyectos visibles para este token.");
    process.exit(3);
  }
  const teamId = project.accountId;
  console.log(`Proyecto destino: ${project.name} · equipo ${teamId}`);

  const files = collect(ROOT);
  const bytes = files.reduce((n, f) => n + Buffer.byteLength(f.data), 0);
  console.log(`Archivos a subir: ${files.length} (${(bytes / 1024 / 1024).toFixed(2)} MB)`);

  const payload = {
    name: project.name,
    project: project.id,
    target: "production",
    files: files.map((f) => ({ file: f.file, data: f.data })),
    projectSettings: { framework: "nextjs" },
  };

  const res = await api(`/v13/deployments?teamId=${teamId}&forceNew=1`, {
    method: "POST",
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    console.error("Vercel rechazó el despliegue:", JSON.stringify(res.body).slice(0, 800));
    process.exit(4);
  }

  const { id, url } = res.body;
  console.log(`Despliegue creado: ${id}`);
  console.log(`URL: https://${url}`);

  // Esperar a que termine
  for (let i = 0; i < 120; i += 1) {
    await new Promise((r) => setTimeout(r, 5000));
    const st = await api(`/v13/deployments/${id}?teamId=${teamId}`);
    const state = st.body?.readyState;
    if (state === "READY") {
      console.log(`\n✅ Publicado: https://${url}`);
      const aliases = (st.body?.alias || []).join(", ");
      if (aliases) console.log(`Alias: ${aliases}`);
      return;
    }
    if (state === "ERROR" || state === "CANCELED") {
      console.error(`\n❌ El despliegue terminó en estado ${state}.`);
      const logs = await api(`/v2/deployments/${id}/events?teamId=${teamId}&limit=50`);
      const events = Array.isArray(logs.body) ? logs.body : [];
      for (const e of events.slice(-25)) {
        console.error(`${e.type}: ${(e.text || e.payload?.text || "").toString().slice(0, 300)}`);
      }
      process.exit(5);
    }
    if (i % 6 === 0) console.log(`… compilando (${state})`);
  }
  console.error("Tiempo de espera agotado; revisá el panel de Vercel.");
  process.exit(6);
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
