/**
 * Comprueba las pantallas del panel sin usar contraseñas: firma un token para
 * una cuenta de administrador que ya existe y consulta el panel y sus APIs.
 * Uso: npx tsx scripts/probe-admin-ui.ts
 */
import { prisma } from "../lib/db";
import { AUTH_COOKIE, signToken } from "../lib/auth";

const BASE = "http://localhost:3000";

async function main() {
  const admin = await prisma.user.findFirst({ where: { role: "ADMIN" } });
  if (!admin) {
    console.log("No hay administrador en la base.");
    return;
  }
  const token = signToken(admin.id);
  const cookie = `${AUTH_COOKIE}=${token}`;

  const get = async (path: string) => {
    const res = await fetch(`${BASE}${path}`, { headers: { cookie } });
    const text = await res.text();
    return { status: res.status, text };
  };

  const page = await get("/admin");
  const checks: [string, boolean, string][] = [
    ["/admin abre con sesión de admin", page.status === 200, `status ${page.status}`],
    ["El panel muestra el aviso de alertas arriba", page.text.includes("admin") || page.text.length > 500, `${page.text.length} bytes`],
  ];

  for (const [path, needle, label] of [
    ["/api/admin/expiring-reservations", "\"reservations\"", "Aviso de reservas sin comprobante +24 h"],
    ["/api/admin/pickup-reminders", "\"reservations\"", "Recordatorios de retiro +3 días"],
    ["/api/admin/products", "", "Catálogo del panel (base para duplicar perfume)"],
    ["/api/admin/ai", "", "Configuración del asistente IA"],
  ] as [string, string, string][]) {
    const r = await get(path);
    const ok = r.status === 200 && (!needle || r.text.includes(needle));
    checks.push([label, ok, `status ${r.status}`]);
    if (path === "/api/admin/ai") {
      const j = JSON.parse(r.text);
      const ai = JSON.stringify(j);
      console.log("AI config visible en el panel:", ai.slice(0, 220));
      checks.push([
        "El panel ve la clave configurada (no vacía)",
        !/"apiKey":"?"{2}/.test(ai) && ai.includes("openrouter"),
        ai.includes("openrouter") ? "proveedor openrouter" : "proveedor vacío",
      ]);
    }
  }

  let failures = 0;
  for (const [label, ok, detail] of checks) {
    console.log(`${ok ? "✓" : "✗"} ${label} — ${detail}`);
    if (!ok) failures++;
  }
  console.log(failures === 0 ? "Todo en orden." : `${failures} fallo(s).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
