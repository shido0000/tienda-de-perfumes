"use client";

/**
 * Administración → Avisos automáticos.
 *
 * Muestra, sin adornos: si el envío automático está encendido, si el correo
 * está configurado, y la cola real de mensajes con lo que pasó con cada uno
 * (enviado / falló / omitido y por qué). Desde acá se puede mandar la cola ya,
 * reintentar un mensaje o mandar un correo de prueba.
 */
import { useCallback, useEffect, useState } from "react";
import {
  EnvelopeSimple,
  WhatsappLogo,
  BellRinging,
  ArrowClockwise,
  CheckCircle,
  WarningCircle,
  PaperPlaneTilt,
  FloppyDisk,
  Clock,
} from "@phosphor-icons/react/dist/ssr";
import { useToast } from "@/components/ui/ToastProvider";

type OutboxMessage = {
  id: string;
  kind: string;
  channel: "EMAIL" | "WHATSAPP" | "PUSH";
  recipient: string;
  subject: string;
  body: string;
  status: "PENDING" | "SENT" | "FAILED" | "SKIPPED";
  error: string | null;
  attempts: number;
  createdAt: string;
  sentAt: string | null;
};

type Settings = {
  autoRestockEnabled: boolean;
  autoRepurchaseEnabled: boolean;
  repurchaseDays: number;
  emailFrom: string;
  emailProvider: string;
  ownerEmail: string;
  emailConfigured: boolean;
  emailProviderResolved: string | null;
  hasStoredKey: boolean;
  /** Solo se usa al escribir una clave nueva; nunca se lee del servidor. */
  emailApiKey?: string;
};

const KIND_LABEL: Record<string, string> = {
  RESTOCK: "Volvió un perfume",
  REPURCHASE: "Recordatorio de reposición",
  CAMPAIGN: "Campaña",
  MANUAL: "Manual",
  LAUNCH: "Novedad",
};

const STATUS = {
  SENT: { label: "Enviado", tone: "text-primary" },
  PENDING: { label: "En cola", tone: "text-muted" },
  FAILED: { label: "Falló", tone: "text-danger" },
  SKIPPED: { label: "Omitido", tone: "text-accent" },
} as const;

const input =
  "w-full rounded-control border border-line bg-bg px-3 py-2 text-sm text-ink outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20";

const dateFmt = new Intl.DateTimeFormat("es", {
  day: "2-digit",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

function ChannelIcon({ channel }: { channel: OutboxMessage["channel"] }) {
  if (channel === "EMAIL") return <EnvelopeSimple size={16} aria-hidden />;
  if (channel === "WHATSAPP") return <WhatsappLogo size={16} aria-hidden />;
  return <BellRinging size={16} aria-hidden />;
}

export function AdminNotifications() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [messages, setMessages] = useState<OutboxMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [openBody, setOpenBody] = useState<string | null>(null);
  const toast = useToast();

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/notifications", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "No pudimos leer los avisos.");
      setSettings(data.settings);
      setMessages(data.messages);
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const save = async (patch: Partial<Settings>) => {
    if (!settings) return;
    const next = { ...settings, ...patch };
    setSettings(next);
    setBusy("save");
    try {
      const res = await fetch("/api/admin/notifications", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        // La clave se manda solo si el usuario la escribió (campo aparte).
        body: JSON.stringify({
          autoRestockEnabled: next.autoRestockEnabled,
          autoRepurchaseEnabled: next.autoRepurchaseEnabled,
          repurchaseDays: next.repurchaseDays,
          emailFrom: next.emailFrom,
          emailProvider: next.emailProvider,
          ownerEmail: next.ownerEmail,
          ...(patch.emailApiKey !== undefined ? { emailApiKey: patch.emailApiKey } : {}),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "No se pudo guardar.");
      await load();
      toast.success("Guardado", "Los avisos usan la nueva configuración.");
    } catch (e) {
      toast.error("No se pudo guardar", (e as Error).message);
      await load();
    } finally {
      setBusy(null);
    }
  };

  const act = async (action: "process" | "retry" | "test", id?: string) => {
    setBusy(action + (id ?? ""));
    try {
      const res = await fetch("/api/admin/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "No se pudo completar.");
      if (action === "process" || action === "retry") {
        const r = data.result ?? {};
        toast.success(
          "Cola procesada",
          `${r.sent ?? 0} enviados, ${r.skipped ?? 0} omitidos, ${r.failed ?? 0} fallidos.`,
        );
      } else {
        toast.success("Correo de prueba enviado", `Revisá la bandeja de ${data.to}.`);
      }
      await load();
    } catch (e) {
      toast.error("No se pudo completar", (e as Error).message);
      await load();
    } finally {
      setBusy(null);
    }
  };

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="h-24 animate-pulse rounded-card bg-line/40" />
        <div className="h-40 animate-pulse rounded-card bg-line/40" />
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="rounded-card border border-line bg-surface p-6 text-sm text-muted">
        {error ?? "No pudimos cargar los avisos."}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="rounded-card border border-line bg-surface p-6 shadow-sm">
        <h2 className="text-h3">Avisos automáticos</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          Cuando vuelve un perfume o un cliente compró hace unos meses, el mensaje sale solo por
          los canales que dejó (correo, WhatsApp, notificación). Lo que no se pueda entregar queda
          en la cola de abajo con el motivo, nunca se pierde.
        </p>

        <div className="mt-6 space-y-4">
          <label className="flex items-start gap-3">
            <input
              type="checkbox"
              checked={settings.autoRestockEnabled}
              onChange={(e) => void save({ autoRestockEnabled: e.target.checked })}
              className="mt-1 h-4 w-4 accent-[var(--color-primary)]"
            />
            <span>
              <span className="block text-sm font-medium text-ink">
                Avisar solo cuando vuelve un perfume
              </span>
              <span className="block text-xs text-muted">
                Se dispara al cargar unidades de un perfume agotado.
              </span>
            </span>
          </label>

          <label className="flex items-start gap-3">
            <input
              type="checkbox"
              checked={settings.autoRepurchaseEnabled}
              onChange={(e) => void save({ autoRepurchaseEnabled: e.target.checked })}
              className="mt-1 h-4 w-4 accent-[var(--color-primary)]"
            />
            <span>
              <span className="block text-sm font-medium text-ink">
                Recordar la reposición a los {settings.repurchaseDays} días
              </span>
              <span className="block text-xs text-muted">
                A quien compró un frasco hace un tiempo, con el mensaje &quot;¿ya se te está
                terminando?&quot;.
              </span>
            </span>
          </label>

          <div className="max-w-xs">
            <label className="mb-1 block text-xs font-medium text-ink" htmlFor="repurchaseDays">
              Días desde la compra para el recordatorio
            </label>
            <input
              id="repurchaseDays"
              type="number"
              min={7}
              max={365}
              value={settings.repurchaseDays}
              onChange={(e) =>
                setSettings({ ...settings, repurchaseDays: Number(e.target.value) || 0 })
              }
              onBlur={(e) => {
                const v = Math.min(365, Math.max(7, Number(e.target.value) || 60));
                setSettings({ ...settings, repurchaseDays: v });
                void save({ repurchaseDays: v });
              }}
              className={input}
            />
          </div>
        </div>
      </div>

      {/* Correo: sin esto, los avisos por correo quedan omitidos */}
      <div className="rounded-card border border-line bg-surface p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-h3">Envío por correo</h3>
          <span
            className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs ${
              settings.emailConfigured
                ? "border-primary/30 bg-primary/10 text-primary"
                : "border-line bg-bg text-muted"
            }`}
          >
            {settings.emailConfigured ? (
              <CheckCircle size={14} aria-hidden />
            ) : (
              <WarningCircle size={14} aria-hidden />
            )}
            {settings.emailConfigured
              ? `Listo (${settings.emailProviderResolved ?? "proveedor"})`
              : "Sin configurar"}
          </span>
        </div>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          El correo se manda con <strong className="text-ink">Resend</strong> o{" "}
          <strong className="text-ink">Brevo</strong> (los dos tienen plan gratuito). Sin clave, los
          avisos siguen saliendo por WhatsApp y notificación; los correos quedan omitidos con el
          motivo escrito.
        </p>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-medium text-ink" htmlFor="emailFrom">
              Remitente (validado en el proveedor)
            </label>
            <input
              id="emailFrom"
              value={settings.emailFrom}
              onChange={(e) => setSettings({ ...settings, emailFrom: e.target.value })}
              onBlur={() => void save({ emailFrom: settings.emailFrom })}
              placeholder="Mist & Mood <avisos@midominio.com>"
              className={input}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-ink" htmlFor="ownerEmail">
              Correo del dueño (recibe pruebas)
            </label>
            <input
              id="ownerEmail"
              value={settings.ownerEmail}
              onChange={(e) => setSettings({ ...settings, ownerEmail: e.target.value })}
              onBlur={() => void save({ ownerEmail: settings.ownerEmail })}
              placeholder="dueno@ejemplo.com"
              className={input}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-ink" htmlFor="emailProvider">
              Proveedor
            </label>
            <select
              id="emailProvider"
              value={settings.emailProvider}
              onChange={(e) => void save({ emailProvider: e.target.value })}
              className={input}
            >
              <option value="">Detectar según la clave</option>
              <option value="resend">Resend</option>
              <option value="brevo">Brevo</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-ink" htmlFor="emailApiKey">
              Clave del proveedor
            </label>
            <input
              id="emailApiKey"
              type="password"
              autoComplete="off"
              placeholder={settings.hasStoredKey ? "•••••• (guardada)" : "re_... o token de Brevo"}
              onChange={(e) => setSettings({ ...settings, emailApiKey: e.target.value })}
              onBlur={(e) => {
                if (e.target.value.trim()) void save({ emailApiKey: e.target.value.trim() });
              }}
              className={input}
            />
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void save({})}
            disabled={busy === "save"}
            className="inline-flex items-center gap-2 rounded-control border border-line px-3 py-2 text-sm text-ink transition-colors hover:border-primary hover:text-primary disabled:opacity-50"
          >
            <FloppyDisk size={16} aria-hidden /> Guardar
          </button>
          <button
            type="button"
            onClick={() => void act("test")}
            disabled={busy === "test"}
            className="inline-flex items-center gap-2 rounded-control bg-primary px-3 py-2 text-sm font-medium text-on-primary transition-colors hover:bg-accent disabled:opacity-50"
          >
            <PaperPlaneTilt size={16} aria-hidden /> Mandar correo de prueba
          </button>
        </div>
      </div>

      {/* Cola real */}
      <div className="rounded-card border border-line bg-surface shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line p-5">
          <div>
            <h3 className="text-h3">Cola de mensajes</h3>
            <p className="mt-1 text-xs text-muted">
              Lo último que se generó, con lo que realmente pasó en cada envío.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void act("process")}
            disabled={busy === "process"}
            className="inline-flex items-center gap-2 rounded-control border border-line px-3 py-2 text-sm text-ink transition-colors hover:border-primary hover:text-primary disabled:opacity-50"
          >
            <ArrowClockwise size={16} aria-hidden /> Mandar la cola ahora
          </button>
        </div>

        {messages.length === 0 ? (
          <div className="p-8 text-center">
            <Clock size={28} className="mx-auto text-muted" aria-hidden />
            <p className="mt-3 text-sm text-ink">Todavía no hay avisos generados.</p>
            <p className="mt-1 text-xs text-muted">
              Aparecerán aquí cuando vuelva un perfume agotado o toque un recordatorio.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-line">
            {messages.map((m) => {
              const st = STATUS[m.status] ?? STATUS.PENDING;
              return (
                <li key={m.id} className="p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
                        <span className="inline-flex items-center gap-1">
                          <ChannelIcon channel={m.channel} />
                          {m.channel}
                        </span>
                        <span aria-hidden>·</span>
                        <span>{KIND_LABEL[m.kind] ?? m.kind}</span>
                        <span aria-hidden>·</span>
                        <span className="tabular-nums">{dateFmt.format(new Date(m.createdAt))}</span>
                      </div>
                      <p className="mt-1 truncate text-sm font-medium text-ink">
                        {m.subject || m.body.slice(0, 60)}
                      </p>
                      <p className="mt-0.5 truncate text-xs text-muted">Para: {m.recipient}</p>
                      {m.error && (
                        <p className="mt-1 text-xs text-danger">{m.error}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-medium ${st.tone}`}>{st.label}</span>
                      {(m.status === "FAILED" || m.status === "SKIPPED") && (
                        <button
                          type="button"
                          onClick={() => void act("retry", m.id)}
                          disabled={busy === "retry" + m.id}
                          className="rounded-control border border-line px-2 py-1 text-xs text-ink transition-colors hover:border-primary hover:text-primary disabled:opacity-50"
                        >
                          Reintentar
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setOpenBody(openBody === m.id ? null : m.id)}
                        className="rounded-control px-2 py-1 text-xs text-muted transition-colors hover:text-primary"
                        aria-expanded={openBody === m.id}
                      >
                        {openBody === m.id ? "Ocultar" : "Ver mensaje"}
                      </button>
                    </div>
                  </div>
                  {openBody === m.id && (
                    <pre className="mt-3 whitespace-pre-wrap rounded-control bg-bg p-3 text-xs leading-relaxed text-ink">
                      {m.body}
                    </pre>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
