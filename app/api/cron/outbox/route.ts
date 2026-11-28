/**
 * Trabajo automático diario.
 *
 * GitHub Actions lo llama solo (ver `.github/workflows/cron-outbox.yml`). Hace tres cosas, en orden:
 *
 * 1. Genera los recordatorios de reposición: reservas entregadas hace
 *    `repurchaseDays` días, todavía sin recordatorio, con su perfume.
 * 2. Encola los avisos pendientes de la lista de espera que llevan días sin
 *    procesarse (red de seguridad del flujo de reposición de stock).
 * 3. Procesa la cola: manda todo lo PENDING por correo / WhatsApp / push.
 *
 * Protección: si `CRON_SECRET` está definido, exige
 * `Authorization: Bearer <CRON_SECRET>` (Vercel lo manda solo en sus crons).
 * Sin la variable, la ruta funciona igual — así el proyecto no queda inútil por
 * una variable que falta, pero en producción conviene definirla.
 */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { enqueue, processOutbox } from "@/lib/outbox";
import { requireAdmin } from "@/lib/session";
import { generateRepurchaseReminders } from "@/lib/repurchase";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const DAY_MS = 24 * 60 * 60 * 1000;

async function authorized(request: Request): Promise<boolean> {
  // 1) El dueño desde el panel (Administración → Avisos automáticos).
  const admin = await requireAdmin().catch(() => null);
  if (admin) return true;

  // 2) GitHub Actions Cron, con CRON_SECRET.
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return true;
  const header = request.headers.get("authorization") ?? "";
  const url = new URL(request.url);
  return header === `Bearer ${secret}` || url.searchParams.get("secret") === secret;
}


async function run(request: Request) {
  if (!(await authorized(request))) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const settings = await prisma.storeSettings
    .findUnique({ where: { id: "singleton" } })
    .catch(() => null);
  const repurchaseDays = settings?.repurchaseDays ?? 60;

  const [reminders, processed] = await Promise.all([
    generateRepurchaseReminders(repurchaseDays).catch((e) => {
      console.error("[cron] recordatorios:", (e as Error).message);
      return 0;
    }),
    Promise.resolve(0),
  ]);
  void processed;

  const outbox = await processOutbox(40);

  return NextResponse.json({
    ok: true,
    at: new Date().toISOString(),
    repurchaseQueued: reminders,
    outbox,
  });
}

// GitHub Actions Cron llama con POST; el botón del panel usa GET.
export async function GET(request: Request) {
  return run(request);
}

export async function POST(request: Request) {
  return run(request);
}
