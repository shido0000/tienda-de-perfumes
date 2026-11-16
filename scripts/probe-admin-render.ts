import { prisma } from "../lib/db";
import { AUTH_COOKIE, signToken } from "../lib/auth";
(async () => {
  const admin = await prisma.user.findFirst({ where: { role: "ADMIN" } });
  if (!admin) return console.log("no admin");
  const r = await fetch("http://localhost:3000/admin", { headers: { cookie: `${AUTH_COOKIE}=${signToken(admin.id)}` } });
  const t = await r.text();
  console.log("status", r.status, "bytes", t.length);
  for (const needle of ["encuentra Google", "Preguntas frecuentes", "google-site-verification", "Search Console"]) {
    console.log(needle, "→", t.includes(needle) || t.includes(encodeURIComponent(needle)) || t.includes(needle.replace(/ /g, "\\u0026")) );
  }
})().then(() => prisma.$disconnect());
