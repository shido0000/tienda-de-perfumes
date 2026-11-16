"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Plus,
  Trash,
  Copy,
  Check,
  WhatsappLogo,
  PencilSimple,
  Users,
  X,
} from "@phosphor-icons/react/dist/ssr";
import type { CampaignTemplateDTO } from "@/lib/types";
import { useConfirm } from "@/components/ui/ConfirmProvider";
import { useToast } from "@/components/ui/ToastProvider";

const PLATFORMS = [
  { id: "WHATSAPP", label: "WhatsApp" },
  { id: "INSTAGRAM", label: "Instagram" },
  { id: "FACEBOOK", label: "Facebook" },
  { id: "TWITTER", label: "X (Twitter)" },
] as const;

type Segment = {
  id: string;
  label: string;
  description: string;
  count: number;
  phones: string[];
};

type Draft = {
  id: string | null;
  title: string;
  platform: string;
  message: string;
  link: string;
};

const emptyDraft: Draft = { id: null, title: "", platform: "WHATSAPP", message: "", link: "" };

const inputClass =
  "w-full rounded-control border border-line bg-bg px-3 py-2 text-sm text-ink placeholder:text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40";

/**
 * Plantillas de mensaje guardadas.
 *
 * El problema real: el dueño escribe el mensaje de WhatsApp desde cero cada vez
 * que quiere avisar algo a otro grupo de clientes. Acá guarda el texto una vez
 * y después elige a qué segmento mandarlo: ve cuántos son, a quiénes les
 * corresponde y copia los números listos para pegar.
 */
export function AdminCampaignTemplates() {
  const [templates, setTemplates] = useState<CampaignTemplateDTO[]>([]);
  const [segments, setSegments] = useState<Segment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copiedPhones, setCopiedPhones] = useState<string | null>(null);
  /** Plantilla elegida para ver a qué segmento mandarla. */
  const [target, setTarget] = useState<string | null>(null);
  const confirm = useConfirm();
  const toast = useToast();

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([
      fetch("/api/admin/campaign-templates").then(async (r) => {
        if (!r.ok) throw new Error("No pudimos cargar las plantillas.");
        return r.json();
      }),
      fetch("/api/admin/campaign-segments").then(async (r) => {
        if (!r.ok) throw new Error("No pudimos cargar los segmentos.");
        return r.json();
      }),
    ])
      .then(([t, s]) => {
        setTemplates(t.templates ?? []);
        setSegments(s.segments ?? []);
        setError(null);
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(load, [load]);

  const startNew = () => {
    setDraft(emptyDraft);
    setOpen(true);
  };

  const startEdit = (t: CampaignTemplateDTO) => {
    setDraft({
      id: t.id,
      title: t.title,
      platform: t.platform,
      message: t.message,
      link: t.link ?? "",
    });
    setOpen(true);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft.title.trim() || !draft.message.trim()) {
      setError("La plantilla necesita un nombre y un texto.");
      return;
    }
    setBusy(true);
    setError(null);
    const res = await fetch(
      draft.id ? `/api/admin/campaign-templates/${draft.id}` : "/api/admin/campaign-templates",
      {
        method: draft.id ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: draft.title.trim(),
          platform: draft.platform,
          message: draft.message.trim(),
          link: draft.link.trim() || null,
        }),
      },
    ).catch(() => null);
    setBusy(false);
    if (!res || !res.ok) {
      const data = await res?.json().catch(() => ({}));
      setError(data?.error ?? "No pudimos guardar la plantilla.");
      return;
    }
    const data = await res.json();
    const saved: CampaignTemplateDTO = data.template;
    setTemplates((prev) =>
      draft.id ? prev.map((t) => (t.id === draft.id ? saved : t)) : [saved, ...prev],
    );
    toast.success(
      draft.id ? "Plantilla actualizada" : "Plantilla guardada",
      `“${saved.title}” queda lista para reusar con otro segmento.`,
    );
    setDraft(emptyDraft);
    setOpen(false);
  };

  const remove = async (t: CampaignTemplateDTO) => {
    const ok = await confirm({
      title: `¿Eliminar la plantilla “${t.title}”?`,
      description: "Se borra el texto guardado. Las campañas ya creadas no cambian.",
      confirmLabel: "Eliminar",
      tone: "danger",
    });
    if (!ok) return;
    const res = await fetch(`/api/admin/campaign-templates/${t.id}`, {
      method: "DELETE",
    }).catch(() => null);
    if (res?.ok) {
      setTemplates((prev) => prev.filter((x) => x.id !== t.id));
      toast.success("Plantilla eliminada", `“${t.title}” ya no está en la lista.`);
    } else {
      toast.error("No pudimos eliminarla", "Probá de nuevo en unos segundos.");
    }
  };

  /** Copia el texto y suma un uso a la plantilla. */
  const copyText = async (t: CampaignTemplateDTO) => {
    const text = t.link ? `${t.message}\n\n${t.link}` : t.message;
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(t.id);
      setTimeout(() => setCopiedId((v) => (v === t.id ? null : v)), 1800);
      toast.success("Texto copiado", "Pegalo en WhatsApp o en la red que quieras.");
      fetch(`/api/admin/campaign-templates/${t.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ used: true }),
      }).catch(() => null);
      setTemplates((prev) =>
        prev.map((x) => (x.id === t.id ? { ...x, uses: x.uses + 1 } : x)),
      );
    } catch {
      toast.error("No pudimos copiar", "Tu navegador bloqueó el portapapeles.");
    }
  };

  const copyPhones = async (segment: Segment) => {
    try {
      await navigator.clipboard.writeText(segment.phones.join(", "));
      setCopiedPhones(segment.id);
      setTimeout(() => setCopiedPhones((v) => (v === segment.id ? null : v)), 1800);
      toast.success(
        `${segment.phones.length} números copiados`,
        "Pegalos en la lista de difusión de WhatsApp.",
      );
    } catch {
      toast.error("No pudimos copiar", "Tu navegador bloqueó el portapapeles.");
    }
  };

  const activeTemplate = useMemo(
    () => templates.find((t) => t.id === target) ?? null,
    [templates, target],
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-h3">Plantillas de mensaje</h2>
          <p className="mt-1 max-w-xl text-sm text-muted">
            Escribí el mensaje una vez y reusalo con otro grupo de clientes. Debajo de cada
            plantilla ves a qué segmentos les corresponde y cuántos son.
          </p>
        </div>
        <button
          type="button"
          onClick={startNew}
          className="inline-flex items-center gap-1.5 rounded-control bg-primary px-4 py-2 text-sm font-medium text-on-primary transition-opacity hover:opacity-90"
        >
          <Plus size={16} weight="bold" /> Nueva plantilla
        </button>
      </div>

      {open && (
        <form
          onSubmit={save}
          className="rounded-card border border-line bg-surface p-5 shadow-sm"
        >
          <div className="flex items-start justify-between gap-3">
            <h3 className="text-sm font-medium text-ink">
              {draft.id ? "Editar plantilla" : "Nueva plantilla"}
            </h3>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                setDraft(emptyDraft);
              }}
              aria-label="Cerrar el formulario"
              className="rounded-control p-1.5 text-muted hover:text-ink"
            >
              <X size={16} />
            </button>
          </div>

          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="text-xs font-medium text-muted">Nombre de la plantilla</span>
              <input
                value={draft.title}
                onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
                className={`${inputClass} mt-1.5`}
                placeholder="Recompra a 2 meses"
              />
            </label>
            <label className="block">
              <span className="text-xs font-medium text-muted">Canal</span>
              <select
                value={draft.platform}
                onChange={(e) => setDraft((d) => ({ ...d, platform: e.target.value }))}
                className={`${inputClass} mt-1.5`}
              >
                {PLATFORMS.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className="mt-3 block">
            <span className="text-xs font-medium text-muted">Mensaje</span>
            <textarea
              value={draft.message}
              onChange={(e) => setDraft((d) => ({ ...d, message: e.target.value }))}
              rows={5}
              className={`${inputClass} mt-1.5`}
              placeholder="Hola {nombre}, ¿ya se te está terminando tu frasco? Te preparo otro…"
            />
          </label>

          <label className="mt-3 block">
            <span className="text-xs font-medium text-muted">Enlace (opcional)</span>
            <input
              value={draft.link}
              onChange={(e) => setDraft((d) => ({ ...d, link: e.target.value }))}
              className={`${inputClass} mt-1.5`}
              placeholder="https://…"
            />
          </label>

          {error && (
            <p role="alert" className="mt-3 text-sm text-danger">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={busy}
            className="mt-4 rounded-control bg-primary px-4 py-2 text-sm font-medium text-on-primary transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {busy ? "Guardando…" : draft.id ? "Guardar cambios" : "Guardar plantilla"}
          </button>
        </form>
      )}

      {loading && <p className="text-sm text-muted">Cargando plantillas…</p>}

      {!loading && templates.length === 0 && (
        <p className="rounded-card border border-line bg-surface px-4 py-8 text-center text-sm text-muted">
          Todavía no guardaste ninguna plantilla. Creá la primera con el botón de arriba.
        </p>
      )}

      {!loading && templates.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2">
          {templates.map((t) => (
            <article
              key={t.id}
              className="flex flex-col rounded-card border border-line bg-surface p-5"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-medium text-ink">{t.title}</p>
                  <p className="text-xs text-muted">
                    {PLATFORMS.find((p) => p.id === t.platform)?.label ?? t.platform} · usado{" "}
                    {t.uses} {t.uses === 1 ? "vez" : "veces"}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    onClick={() => copyText(t)}
                    aria-label={`Copiar el texto de ${t.title}`}
                    className="rounded-control p-1.5 text-muted hover:text-primary"
                  >
                    {copiedId === t.id ? <Check size={16} /> : <Copy size={16} />}
                  </button>
                  <button
                    onClick={() => startEdit(t)}
                    aria-label={`Editar ${t.title}`}
                    className="rounded-control p-1.5 text-muted hover:text-primary"
                  >
                    <PencilSimple size={16} />
                  </button>
                  <button
                    onClick={() => remove(t)}
                    aria-label={`Eliminar ${t.title}`}
                    className="rounded-control p-1.5 text-muted hover:text-danger"
                  >
                    <Trash size={16} />
                  </button>
                </div>
              </div>

              <p className="mt-3 line-clamp-5 whitespace-pre-wrap text-sm leading-relaxed text-ink">
                {t.message}
              </p>

              <button
                onClick={() => setTarget(target === t.id ? null : t.id)}
                aria-expanded={target === t.id}
                className="mt-auto flex items-center gap-1.5 pt-4 text-xs font-medium text-primary hover:underline"
              >
                <Users size={13} />
                {target === t.id ? "Ocultar segmentos" : "Ver a quién mandarla"}
              </button>

              {target === t.id && (
                <ul className="mt-3 space-y-1.5 border-t border-line pt-3">
                  {segments.map((s) => (
                    <li
                      key={s.id}
                      className="flex items-start justify-between gap-2 rounded-control bg-bg px-2.5 py-2"
                    >
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-ink">
                          {s.label}{" "}
                          <span className="tabular-nums text-muted">({s.count})</span>
                        </p>
                        <p className="text-[11px] text-muted">{s.description}</p>
                      </div>
                      <button
                        type="button"
                        disabled={s.count === 0}
                        onClick={() => copyPhones(s)}
                        className="inline-flex shrink-0 items-center gap-1 rounded-full border border-line px-2 py-1 text-[11px] text-muted transition-colors hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        {copiedPhones === s.id ? (
                          <Check size={11} />
                        ) : (
                          <WhatsappLogo size={11} />
                        )}
                        {copiedPhones === s.id ? "Copiado" : "Copiar números"}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </article>
          ))}
        </div>
      )}

      {activeTemplate && (
        <p className="text-xs text-muted">
          Tip: copiá la plantilla, pegala en WhatsApp y mandala al segmento elegido. La tienda no
          envía mensajes sola desde acá.
        </p>
      )}
    </div>
  );
}
