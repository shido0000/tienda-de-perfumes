"use client";

import { useEffect, useMemo, useState } from "react";
import {
  FacebookLogo,
  InstagramLogo,
  WhatsappLogo,
  XLogo,
  Plus,
  Trash,
  Copy,
  Check,
  Clock,
  PaperPlaneTilt,
  PencilSimple,
  ImageSquare,
  CalendarBlank,
} from "@phosphor-icons/react/dist/ssr";
import type { CampaignDTO, CampaignTemplateDTO } from "@/lib/types";
import { PLATFORM_LABEL, CAMPAIGN_STATUS_LABEL } from "@/lib/types";
import { useConfirm } from "@/components/ui/ConfirmProvider";
import { useToast } from "@/components/ui/ToastProvider";
import { ImageField } from "./ImageField";

type Platform = "FACEBOOK" | "INSTAGRAM" | "WHATSAPP" | "TWITTER";
type Status = "DRAFT" | "SCHEDULED" | "PUBLISHED";

const PLATFORM_ICON: Record<Platform, React.ElementType> = {
  FACEBOOK: FacebookLogo,
  INSTAGRAM: InstagramLogo,
  WHATSAPP: WhatsappLogo,
  TWITTER: XLogo,
};

/** Límite de caracteres aproximado que acepta cada red. */
const PLATFORM_LIMIT: Record<Platform, number> = {
  FACEBOOK: 63206,
  INSTAGRAM: 2200,
  WHATSAPP: 1024,
  TWITTER: 280,
};

type Draft = {
  id: string | null;
  title: string;
  platform: Platform;
  message: string;
  link: string;
  image: string;
  status: Status;
  scheduledAt: string; // datetime-local
};

const emptyDraft = (): Draft => ({
  id: null,
  title: "",
  platform: "INSTAGRAM",
  message: "",
  link: "",
  image: "",
  status: "DRAFT",
  scheduledAt: "",
});

const fmtDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString("es-CU", { dateStyle: "medium", timeStyle: "short" }) : "";

export function AdminCampaigns() {
  const [campaigns, setCampaigns] = useState<CampaignDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [filter, setFilter] = useState<"ALL" | Status>("ALL");
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Draft>(emptyDraft());
  const confirm = useConfirm();
  const toast = useToast();
  const [copied, setCopied] = useState<string | null>(null);
  const [templates, setTemplates] = useState<CampaignTemplateDTO[]>([]);

  // Plantillas guardadas para reusar el mismo mensaje en otra campaña/segmento.
  useEffect(() => {
    fetch("/api/admin/campaign-templates")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setTemplates(d?.templates ?? []))
      .catch(() => {});
  }, []);

  const load = () => {
    setLoading(true);
    fetch("/api/admin/campaigns")
      .then(async (r) => {
        if (!r.ok) throw new Error("No pudimos cargar las campañas.");
        return r.json();
      })
      .then((d) => setCampaigns(d.campaigns ?? []))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const startNew = () => {
    setDraft(emptyDraft());
    setError(null);
    setOpen(true);
  };

  const startEdit = (c: CampaignDTO) => {
    setDraft({
      id: c.id,
      title: c.title,
      platform: (c.platform as Platform) ?? "INSTAGRAM",
      message: c.message,
      link: c.link ?? "",
      image: c.image ?? "",
      status: (c.status as Status) ?? "DRAFT",
      scheduledAt: c.scheduledAt ? c.scheduledAt.slice(0, 16) : "",
    });
    setError(null);
    setOpen(true);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);

    if (!draft.title.trim() || !draft.message.trim()) {
      setError("La campaña necesita título y texto.");
      setBusy(false);
      return;
    }
    if (draft.status === "SCHEDULED" && !draft.scheduledAt) {
      setError("Elegí la fecha y hora para programar la publicación.");
      setBusy(false);
      return;
    }

    const payload = {
      title: draft.title.trim(),
      platform: draft.platform,
      message: draft.message.trim(),
      link: draft.link.trim() || "",
      image: draft.image.trim() || null,
      status: draft.status,
      scheduledAt: draft.scheduledAt ? new Date(draft.scheduledAt).toISOString() : null,
    };

    const res = await fetch(
      draft.id ? `/api/admin/campaigns/${draft.id}` : "/api/admin/campaigns",
      {
        method: draft.id ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      },
    ).catch(() => null);

    setBusy(false);
    if (!res?.ok) {
      const d = await res?.json().catch(() => ({}));
      setError(d?.error ?? "No pudimos guardar la campaña.");
      return;
    }
    toast.success(
      draft.id ? "Campaña actualizada" : "Campaña creada",
      "Copiá el texto y la imagen para publicarla en la red elegida.",
    );
    setOpen(false);
    setDraft(emptyDraft());
    load();
  };

  const setCampaignStatus = async (c: CampaignDTO, next: Status) => {
    const res = await fetch(`/api/admin/campaigns/${c.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next }),
    }).catch(() => null);
    if (res?.ok) {
      setCampaigns((prev) => prev.map((x) => (x.id === c.id ? { ...x, status: next } : x)));
      toast.info(
        "Estado actualizado",
        `“${c.title}” pasó a ${CAMPAIGN_STATUS_LABEL[next as keyof typeof CAMPAIGN_STATUS_LABEL] ?? next}.`,
      );
    } else {
      toast.error("No se pudo cambiar el estado", "Probá de nuevo.");
    }
  };

  const remove = async (c: CampaignDTO) => {
    const ok = await confirm({
      title: `¿Eliminar la campaña "${c.title}"?`,
      description: "Se borra del historial de campañas. Esta acción no se puede deshacer.",
      confirmLabel: "Eliminar",
      tone: "danger",
    });
    if (!ok) return;
    const res = await fetch(`/api/admin/campaigns/${c.id}`, { method: "DELETE" }).catch(
      () => null,
    );
    if (res?.ok) {
      setCampaigns((prev) => prev.filter((x) => x.id !== c.id));
      toast.success("Campaña eliminada", `“${c.title}” se quitó del historial.`);
    }
  };

  const copy = async (c: CampaignDTO) => {
    const text = [c.message, c.link].filter(Boolean).join("\n\n");
    try {
      await navigator.clipboard.writeText(text);
      setCopied(c.id);
      setTimeout(() => setCopied(null), 2000);
      toast.info("Texto copiado", "Pegalo en la red social cuando quieras publicar.");
    } catch {
      toast.error("No se pudo copiar", "Seleccioná el texto y copialo a mano.");
    }
  };

  const counts = useMemo(
    () => ({
      ALL: campaigns.length,
      DRAFT: campaigns.filter((c) => c.status === "DRAFT").length,
      SCHEDULED: campaigns.filter((c) => c.status === "SCHEDULED").length,
      PUBLISHED: campaigns.filter((c) => c.status === "PUBLISHED").length,
    }),
    [campaigns],
  );

  const visible = campaigns.filter((c) => filter === "ALL" || c.status === filter);
  const limit = PLATFORM_LIMIT[draft.platform];
  const overLimit = draft.message.length > limit;

  const inputClass =
    "w-full rounded-control border border-line bg-bg px-3 py-2 text-sm text-ink placeholder:text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-h3">Campañas</h2>
          <p className="mt-1 max-w-xl text-sm text-muted">
            Prepará la publicación completa —texto, imagen, enlace y fecha— y copiala a la red
            social elegida. La tienda no publica automáticamente: te damos el texto listo.
          </p>
        </div>
        <button
          type="button"
          onClick={startNew}
          className="inline-flex items-center gap-1.5 rounded-control bg-primary px-4 py-2 text-sm font-medium text-on-primary hover:opacity-90"
        >
          <Plus size={16} weight="bold" /> Nueva campaña
        </button>
      </div>

      {/* Filtros por estado */}
      <div className="flex flex-wrap gap-1.5">
        {(["ALL", "DRAFT", "SCHEDULED", "PUBLISHED"] as const).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setFilter(s)}
            aria-pressed={filter === s}
            className={`rounded-full border px-3 py-1 text-xs transition-colors ${
              filter === s
                ? "border-primary bg-primary/10 text-primary"
                : "border-line text-muted hover:text-ink"
            }`}
          >
            {s === "ALL" ? "Todas" : CAMPAIGN_STATUS_LABEL[s]} ({counts[s]})
          </button>
        ))}
      </div>

      {open && (
        <form onSubmit={save} className="space-y-4 rounded-card border border-line bg-surface p-5">
          <div className="flex items-center justify-between">
            <h3 className="text-h4">{draft.id ? "Editar campaña" : "Nueva campaña"}</h3>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block sm:col-span-2">
              <span className="text-xs font-medium text-muted">Título interno</span>
              <input
                value={draft.title}
                onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
                placeholder="Lanzamiento colección otoño"
                className={`${inputClass} mt-1.5`}
                required
              />
            </label>

            <label className="block">
              <span className="text-xs font-medium text-muted">Red social</span>
              <select
                value={draft.platform}
                onChange={(e) => setDraft((d) => ({ ...d, platform: e.target.value as Platform }))}
                className={`${inputClass} mt-1.5`}
              >
                {(Object.keys(PLATFORM_LABEL) as Platform[]).map((p) => (
                  <option key={p} value={p}>
                    {PLATFORM_LABEL[p]}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="text-xs font-medium text-muted">Estado</span>
              <select
                value={draft.status}
                onChange={(e) => setDraft((d) => ({ ...d, status: e.target.value as Status }))}
                className={`${inputClass} mt-1.5`}
              >
                <option value="DRAFT">Borrador</option>
                <option value="SCHEDULED">Programada</option>
                <option value="PUBLISHED">Publicada</option>
              </select>
            </label>

            {draft.status === "SCHEDULED" && (
              <label className="block sm:col-span-2">
                <span className="text-xs font-medium text-muted">Fecha y hora previstas</span>
                <input
                  type="datetime-local"
                  value={draft.scheduledAt}
                  onChange={(e) => setDraft((d) => ({ ...d, scheduledAt: e.target.value }))}
                  className={`${inputClass} mt-1.5`}
                  required
                />
              </label>
            )}
          </div>

          <label className="block">
            <div className="flex items-baseline justify-between">
              <span className="text-xs font-medium text-muted">Texto de la publicación</span>
              <span
                className={`text-[11px] tabular-nums ${
                  overLimit ? "text-danger" : "text-muted"
                }`}
              >
                {draft.message.length} / {limit}
              </span>
            </div>
            {templates.length > 0 && (
              <div className="mt-1.5 flex flex-wrap items-center gap-2">
                <span className="text-[11px] text-muted">Usar una plantilla guardada:</span>
                {templates.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => {
                      setDraft((d) => ({ ...d, message: t.message, link: t.link ?? d.link }));
                      void fetch(`/api/admin/campaign-templates/${t.id}`, {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ used: true }),
                      }).catch(() => null);
                    }}
                    className="rounded-full border border-line px-2.5 py-1 text-[11px] text-muted transition-colors hover:border-primary hover:text-primary"
                  >
                    {t.title}
                  </button>
                ))}
              </div>
            )}
            <textarea
              value={draft.message}
              onChange={(e) => setDraft((d) => ({ ...d, message: e.target.value }))}
              rows={5}
              placeholder={"Nuevas fragancias disponibles.\nReservá la tuya en la tienda."}
              className={`${inputClass} mt-1.5 resize-y`}
              required
            />
          </label>

          <ImageField
            label="Imagen de la publicación (opcional)"
            value={draft.image}
            onChange={(image) => setDraft((d) => ({ ...d, image }))}
            hint="Se copia o descarga para adjuntarla en la red social."
          />

          <label className="block">
            <span className="text-xs font-medium text-muted">Enlace (opcional)</span>
            <input
              value={draft.link}
              onChange={(e) => setDraft((d) => ({ ...d, link: e.target.value }))}
              placeholder="https://..."
              className={`${inputClass} mt-1.5`}
            />
          </label>

          {error && (
            <p role="alert" className="text-sm text-danger">
              {error}
            </p>
          )}

          <div className="flex flex-wrap gap-2">
            <button
              type="submit"
              disabled={busy || overLimit}
              className="inline-flex items-center gap-1.5 rounded-control bg-primary px-4 py-2 text-sm font-medium text-on-primary hover:opacity-90 disabled:opacity-50"
            >
              <Check size={15} weight="bold" />
              {busy ? "Guardando…" : draft.id ? "Guardar cambios" : "Crear campaña"}
            </button>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                setDraft(emptyDraft());
                setError(null);
              }}
              className="rounded-control border border-line px-4 py-2 text-sm text-muted hover:text-ink"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        {loading && <p className="text-sm text-muted">Cargando campañas…</p>}
        {!loading && visible.length === 0 && (
          <p className="rounded-card border border-line bg-surface px-4 py-8 text-center text-sm text-muted sm:col-span-2">
            {campaigns.length === 0
              ? "Todavía no hay campañas. Creá la primera con el botón de arriba."
              : "No hay campañas con ese estado."}
          </p>
        )}
        {visible.map((c) => {
          const Icon = PLATFORM_ICON[c.platform as Platform] ?? InstagramLogo;
          return (
            <article key={c.id} className="flex flex-col rounded-card border border-line bg-surface p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-start gap-3">
                  <span className="rounded-control bg-bg p-2 text-primary">
                    <Icon size={18} />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate font-medium text-ink">{c.title}</p>
                    <p className="text-xs text-muted">
                      {PLATFORM_LABEL[c.platform] ?? c.platform} ·{" "}
                      {CAMPAIGN_STATUS_LABEL[c.status] ?? c.status}
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    onClick={() => copy(c)}
                    aria-label="Copiar texto"
                    className="rounded-control p-1.5 text-muted hover:text-primary"
                  >
                    {copied === c.id ? <Check size={16} /> : <Copy size={16} />}
                  </button>
                  <button
                    onClick={() => startEdit(c)}
                    aria-label="Editar campaña"
                    className="rounded-control p-1.5 text-muted hover:text-primary"
                  >
                    <PencilSimple size={16} />
                  </button>
                  <button
                    onClick={() => remove(c)}
                    aria-label="Eliminar"
                    className="rounded-control p-1.5 text-muted hover:text-danger"
                  >
                    <Trash size={16} />
                  </button>
                </div>
              </div>

              {c.image && (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={c.image}
                  alt=""
                  className="mt-3 h-32 w-full rounded-control object-cover"
                />
              )}

              <p className="mt-3 line-clamp-6 whitespace-pre-wrap text-sm leading-relaxed text-ink">
                {c.message}
              </p>

              {c.link && (
                <a
                  href={c.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-block truncate text-xs text-primary hover:underline"
                >
                  {c.link}
                </a>
              )}

              <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted">
                {c.scheduledAt && (
                  <span className="inline-flex items-center gap-1">
                    <CalendarBlank size={12} /> {fmtDate(c.scheduledAt)}
                  </span>
                )}
                <span className="inline-flex items-center gap-1">
                  <Clock size={12} /> creada el {fmtDate(c.createdAt)}
                </span>
              </div>

              <div className="mt-auto flex flex-wrap gap-1.5 pt-4">
                {(["DRAFT", "SCHEDULED", "PUBLISHED"] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => setCampaignStatus(c, s)}
                    className={`rounded-full border px-2.5 py-1 text-[11px] transition-colors ${
                      c.status === s
                        ? "border-primary text-primary"
                        : "border-line text-muted hover:text-ink"
                    }`}
                  >
                    {CAMPAIGN_STATUS_LABEL[s]}
                  </button>
                ))}
                {c.status !== "PUBLISHED" && (
                  <button
                    onClick={() => setCampaignStatus(c, "PUBLISHED")}
                    className="ml-auto inline-flex items-center gap-1 rounded-full border border-line px-2.5 py-1 text-[11px] text-muted hover:border-primary hover:text-primary"
                  >
                    <PaperPlaneTilt size={12} /> Marcar publicada
                  </button>
                )}
              </div>
            </article>
          );
        })}
      </div>

      {!loading && campaigns.length === 0 && (
        <p className="flex items-center justify-center gap-1.5 text-xs text-muted">
          <ImageSquare size={13} /> Podés adjuntar una imagen subiéndola desde tu equipo.
        </p>
      )}
    </div>
  );
}
