import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { processOutbox, retryMessage } from "@/lib/outbox";
import { resolveEmailConfig, sendEmail } from "@/lib/email";
import { invalidateSettingsCache } from "@/lib/settings";
import { z } from "zod";

export const dynamic = "force-dynamic";

/**
 * Panel de avisos automáticos.
 *
 * GET   → estado (interruptores, si hay correo configurado) + los últimos
 *         mensajes de la cola con su resultado real.
 * PUT   → guarda los interruptores y la configuración de correo.
 * POST  → acciones: "process" (mandar la cola ya), "retry" (reenviar uno),
 *         "test" (mandar un correo de prueba al dueño).
 *
 * Nunca se reporta un envío que no ocurrió: si no hay proveedor de correo,
 * el mensaje queda SKIPPED con el motivo y así se muestra.
 */

const putSchema = z.object({
  autoRestockEnabled: z.boolean().optional(),
  autoRepurchaseEnabled: z.boolean().optional(),
  repurchaseDays: z.number().int().min(7).max(365).optional(),
  emailFrom: z.string().max(200).optional(),
  emailProvider: z.enum(["", "resend", "brevo"]).optional(),
  /** Cadena vacía = borrar la clave guardada. */
  emailApiKey: z.string().max(400).optional(),
  ownerEmail: z.string().max(200).optional(),
});

const postSchema = z.object({
  action: z.enum(["process", "retry", "test"]),
  id: z.string().max(60).optional(),
});

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const [row, messages] = await Promise.all([
    prisma.storeSettings.findUnique({ where: { id: "singleton" } }).catch(() => null),
    prisma.outboxMessage
      .findMany({ orderBy: { createdAt: "desc" }, take: 60 })
      .catch(() => []),
  ]);

  const emailConfig = await resolveEmailConfig().catch(() => null);

  return NextResponse.json({
    settings: {
      autoRestockEnabled: row?.autoRestockEnabled ?? true,
      autoRepurchaseEnabled: row?.autoRepurchaseEnabled ?? true,
      repurchaseDays: row?.repurchaseDays ?? 60,
      emailFrom: row?.emailFrom ?? "",
      emailProvider: row?.emailProvider ?? "",
      ownerEmail: row?.ownerEmail ?? "",
      // Nunca sale la clave: solo si hay una válida.
      emailConfigured: Boolean(emailConfig),
      emailProviderResolved: emailConfig?.provider ?? null,
      hasStoredKey: Boolean(row?.emailApiKey?.trim()),
    },
    messages: messages.map((m) => ({
      id: m.id,
      kind: m.kind,
      channel: m.channel,
      recipient: m.recipient,
      subject: m.subject,
      body: m.body,
      status: m.status,
      error: m.error,
      attempts: m.attempts,
      createdAt: m.createdAt.toISOString(),
      sentAt: m.sentAt ? m.sentAt.toISOString() : null,
    })),
  });
}

export async function PUT(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const parsed = putSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Datos inválidos" },
      { status: 400 },
    );
  }
  const d = parsed.data;

  const data: Record<string, unknown> = {};
  if (d.autoRestockEnabled !== undefined) data.autoRestockEnabled = d.autoRestockEnabled;
  if (d.autoRepurchaseEnabled !== undefined) data.autoRepurchaseEnabled = d.autoRepurchaseEnabled;
  if (d.repurchaseDays !== undefined) data.repurchaseDays = d.repurchaseDays;
  if (d.emailFrom !== undefined) data.emailFrom = d.emailFrom.trim();
  if (d.emailProvider !== undefined) data.emailProvider = d.emailProvider;
  if (d.ownerEmail !== undefined) data.ownerEmail = d.ownerEmail.trim();
  if (d.emailApiKey !== undefined) data.emailApiKey = d.emailApiKey.trim();

  await prisma.storeSettings.upsert({
    where: { id: "singleton" },
    update: data,
    create: { id: "singleton", ...data },
  });
  invalidateSettingsCache();

  const emailConfig = await resolveEmailConfig().catch(() => null);
  return NextResponse.json({
    ok: true,
    emailConfigured: Boolean(emailConfig),
    emailProviderResolved: emailConfig?.provider ?? null,
  });
}

export async function POST(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const parsed = postSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Acción inválida" }, { status: 400 });
  }
  const { action, id } = parsed.data;

  if (action === "process") {
    const result = await processOutbox(60);
    return NextResponse.json({ ok: true, result });
  }

  if (action === "retry") {
    if (!id) return NextResponse.json({ error: "Falta el mensaje" }, { status: 400 });
    await retryMessage(id);
    const result = await processOutbox(60);
    return NextResponse.json({ ok: true, result });
  }

  // Prueba de correo: deja claro al dueño si el envío real funciona.
  const row = await prisma.storeSettings
    .findUnique({ where: { id: "singleton" } })
    .catch(() => null);
  const to = row?.ownerEmail?.trim() || admin.email;
  if (!to) {
    return NextResponse.json({ error: "No hay correo destino." }, { status: 400 });
  }

  const result = await sendEmail({
    to,
    subject: "Prueba de avisos automáticos · Mist & Mood",
    text: [
      "Este es un correo de prueba de tu tienda.",
      "Si lo estás leyendo, los avisos de reposición y recordatorios de reposición ya pueden salir solos.",
      `Enviado a ${to}.`,
    ].join("\n\n"),
  });

  if (result.ok) {
    return NextResponse.json({ ok: true, provider: result.provider, to });
  }
  return NextResponse.json(
    { error: result.reason, configured: result.configured, to },
    { status: 400 },
  );
}
