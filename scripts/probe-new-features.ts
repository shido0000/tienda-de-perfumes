import { prisma } from "../lib/db";
import { AUTH_COOKIE, signToken } from "../lib/auth";
const BASE = "http://localhost:3000";
(async () => {
  const admin = await prisma.user.findFirst({ where: { role: "ADMIN" } });
  if (!admin) return console.log("no admin");
  const cookie = `${AUTH_COOKIE}=${signToken(admin.id)}`;
  const get = async (p: string) => {
    const r = await fetch(`${BASE}${p}`, { headers: { cookie } });
    return { s: r.status, t: await r.text() };
  };
  const tpl = await get("/api/admin/campaign-templates");
  const tj = JSON.parse(tpl.t);
  console.log("plantillas:", tpl.s, (tj.templates ?? []).map((x: any) => x.title).join(" | "));
  const seg = await get("/api/admin/campaign-segments");
  console.log("segmentos:", seg.s, (JSON.parse(seg.t).segments ?? []).length);
  const rs = await get("/api/admin/restock-stats");
  console.log("restock:", rs.s, rs.t.slice(0, 120));
  const page = await get("/admin");
  console.log("/admin:", page.s, "tiene 'Cómo te encuentra Google':", page.t.includes("Cómo te encuentra Google"), "| sección preguntas perfume:", page.t.includes("Preguntas frecuentes de este perfume"));
})().then(() => prisma.$disconnect());
