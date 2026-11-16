/**
 * Envío de correo automático.
 *
 * Se apoya en la API HTTP de Resend o Brevo (las dos tienen plan gratuito) y se
 * llama con `fetch`, así que no agrega ninguna dependencia al proyecto ni un
 * binario nativo al build de Vercel.
 *
 * Regla de honestidad: si no hay clave configurada, la función NO inventa un
 * envío. Devuelve `{ ok: false, configured: false }` y quien llama deja el
 * mensaje en la cola como SKIPPED con el motivo escrito.
 */
import { prisma } from "./db";

export type EmailProvider = "resend" | "brevo";

export type SendEmailInput = {
  to: string;
  subject: string;
  /** Cuerpo en texto plano: se convierte a HTML simple con párrafos y saltos. */
  text: string;
  replyTo?: string;
};

export type SendEmailResult =
  | { ok: true; provider: EmailProvider }
  | { ok: false; configured: false; reason: string }
  | { ok: false; configured: true; reason: string };

type EmailConfig = {
  provider: EmailProvider;
  apiKey: string;
  from: string;
  replyTo?: string;
};

/** La forma de la clave alcanza para saber a qué proveedor pertenece. */
function guessProvider(key: string): EmailProvider {
  const k = key.trim();
  // Las claves de Resend empiezan con "re_"; las de Brevo son un token largo.
  return k.startsWith("re_") ? "resend" : "brevo";
}

/**
 * Lee la configuración de correo: primero la base (se cambia desde el panel sin
 * redeploy) y si no hay, las variables de entorno del deploy.
 */
export async function resolveEmailConfig(): Promise<EmailConfig | null> {
  let from = process.env.EMAIL_FROM ?? "";
  let apiKey = process.env.RESEND_API_KEY || process.env.BREVO_API_KEY || "";
  let provider: EmailProvider | null = process.env.RESEND_API_KEY
    ? "resend"
    : process.env.BREVO_API_KEY
      ? "brevo"
      : null;

  try {
    const row = await prisma.storeSettings.findUnique({ where: { id: "singleton" } });
    if (row) {
      if (row.emailFrom?.trim()) from = row.emailFrom.trim();
      if (row.emailApiKey?.trim()) {
        apiKey = row.emailApiKey.trim();
        provider =
          row.emailProvider === "resend" || row.emailProvider === "brevo"
            ? row.emailProvider
            : guessProvider(apiKey);
      }
    }
  } catch {
    /* base fría: se usan las variables de entorno */
  }

  if (!apiKey) return null;
  if (!from) {
    // Un remitente de ejemplo válido para el sandbox de Resend: sirve para
    // probar, pero el dueño debería poner el suyo en el panel.
    from = "Mist & Mood <onboarding@resend.dev>";
  }
  return {
    provider: provider ?? guessProvider(apiKey),
    apiKey,
    from,
  };
}

/** Texto plano -> HTML mínimo, sin inyectar nada del cliente sin escapar. */
export function textToHtml(text: string): string {
  const escape = (s: string) =>
    s
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  const paragraphs = text
    .split(/\n{2,}/)
    .map((p) => `<p style="margin:0 0 14px">${escape(p).replace(/\n/g, "<br>")}</p>`)
    .join("");
  return `<!doctype html><html><body style="margin:0;padding:24px;background:#f6f4ef;font-family:Georgia,'Times New Roman',serif;color:#1c1a17">
<div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:14px;padding:28px;border:1px solid #e6e1d8">
${paragraphs}
</div></body></html>`;
}

/** Envía un correo por el proveedor configurado. Nunca lanza. */
export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  const config = await resolveEmailConfig();
  if (!config) {
    return {
      ok: false,
      configured: false,
      reason:
        "No hay proveedor de correo configurado (Administración → Avisos automáticos).",
    };
  }

  const to = input.to.trim();
  if (!to || !to.includes("@")) {
    return { ok: false, configured: true, reason: "El correo del cliente no es válido." };
  }

  const html = textToHtml(input.text);

  try {
    if (config.provider === "resend") {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${config.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: config.from,
          to: [to],
          subject: input.subject,
          text: input.text,
          html,
          ...(input.replyTo ? { reply_to: input.replyTo } : {}),
        }),
      });
      if (res.ok) return { ok: true, provider: "resend" };
      const detail = await res.text().catch(() => "");
      return { ok: false, configured: true, reason: `Resend ${res.status}: ${detail.slice(0, 200)}` };
    }

    // Brevo espera el remitente separado en nombre y correo.
    const match = config.from.match(/^(.*)<([^>]+)>$/);
    const sender = match
      ? { name: match[1].trim() || "Mist & Mood", email: match[2].trim() }
      : { name: "Mist & Mood", email: config.from.trim() };
    const res = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "api-key": config.apiKey,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        sender,
        to: [{ email: to }],
        subject: input.subject,
        textContent: input.text,
        htmlContent: html,
        ...(input.replyTo ? { replyTo: { email: input.replyTo } } : {}),
      }),
    });
    if (res.ok) return { ok: true, provider: "brevo" };
    const detail = await res.text().catch(() => "");
    return { ok: false, configured: true, reason: `Brevo ${res.status}: ${detail.slice(0, 200)}` };
  } catch (error) {
    return {
      ok: false,
      configured: true,
      reason: `No se pudo conectar con el proveedor: ${(error as Error).message}`,
    };
  }
}
