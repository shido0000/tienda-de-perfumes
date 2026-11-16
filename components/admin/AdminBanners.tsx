"use client";

import { useState } from "react";
import { Plus, Trash, PencilSimple, X, Megaphone } from "@phosphor-icons/react/dist/ssr";
import type { BannerDTO } from "@/lib/types";
import { useToast } from "@/components/ui/ToastProvider";
import { useConfirm } from "@/components/ui/ConfirmProvider";
import { ImageField } from "./ImageField";

type Draft = {
  title: string;
  subtitle: string;
  image: string;
  ctaLabel: string;
  ctaUrl: string;
  background: string;
  textColor: string;
  placement: "HOME" | "CATALOG" | "BOTH";
  visible: boolean;
  order: string;
  endsAt: string;
};

const emptyDraft: Draft = {
  title: "",
  subtitle: "",
  image: "",
  ctaLabel: "",
  ctaUrl: "",
  background: "#1b1a17",
  textColor: "#f6f1e6",
  placement: "HOME",
  visible: true,
  order: "0",
  endsAt: "",
};

const inputClass =
  "w-full rounded-control border border-line bg-bg px-3 py-2 text-sm text-ink placeholder:text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40";

/**
 * BANNERS promocionales. Totalmente configurables: texto, subtítulo, imagen o
 * color de fondo, botón (enlace interno o a otra web) y en qué página salen.
 */
export function AdminBanners({ initialBanners }: { initialBanners: BannerDTO[] }) {
  const [banners, setBanners] = useState<BannerDTO[]>(initialBanners);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [editId, setEditId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();
  const confirm = useConfirm();

  const startEdit = (b: BannerDTO) => {
    setEditId(b.id);
    setDraft({
      title: b.title,
      subtitle: b.subtitle,
      image: b.image ?? "",
      ctaLabel: b.ctaLabel,
      ctaUrl: b.ctaUrl,
      background: b.background,
      textColor: b.textColor,
      placement: b.placement,
      visible: b.visible,
      order: String(b.order),
      endsAt: b.endsAt ? b.endsAt.slice(0, 10) : "",
    });
    setError(null);
    setOpen(true);
  };

  const reset = () => {
    setDraft(emptyDraft);
    setEditId(null);
    setError(null);
    setOpen(false);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!draft.title.trim()) return setError("Poné un título al banner.");

    setBusy(true);
    try {
      const payload = {
        title: draft.title.trim(),
        subtitle: draft.subtitle.trim(),
        image: draft.image.trim() || null,
        ctaLabel: draft.ctaLabel.trim(),
        ctaUrl: draft.ctaUrl.trim(),
        background: draft.background,
        textColor: draft.textColor,
        placement: draft.placement,
        visible: draft.visible,
        order: Number(draft.order) || 0,
        endsAt: draft.endsAt ? new Date(`${draft.endsAt}T23:59:59`).toISOString() : null,
      };
      const res = await fetch(
        editId ? `/api/admin/banners/${editId}` : "/api/admin/banners",
        {
          method: editId ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "No se pudo guardar el banner.");

      const saved = data.banner as BannerDTO;
      setBanners((list) =>
        editId ? list.map((b) => (b.id === editId ? saved : b)) : [saved, ...list],
      );
      toast.success(editId ? "Banner actualizado" : "Banner creado", "Ya se ve en la web.");
      reset();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error de red");
    } finally {
      setBusy(false);
    }
  };

  const toggleVisible = async (b: BannerDTO) => {
    const res = await fetch(`/api/admin/banners/${b.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ visible: !b.visible }),
    });
    if (!res.ok) {
      toast.error("No se pudo cambiar", "Probá de nuevo.");
      return;
    }
    setBanners((list) => list.map((x) => (x.id === b.id ? { ...x, visible: !x.visible } : x)));
  };

  const remove = async (b: BannerDTO) => {
    const ok = await confirm({
      title: `¿Eliminar el banner "${b.title}"?`,
      description: "Dejará de mostrarse en la web.",
      confirmLabel: "Eliminar",
      tone: "danger",
    });
    if (!ok) return;
    const res = await fetch(`/api/admin/banners/${b.id}`, { method: "DELETE" });
    if (!res.ok) {
      toast.error("No se pudo eliminar", "Probá de nuevo.");
      return;
    }
    setBanners((list) => list.filter((x) => x.id !== b.id));
    toast.success("Banner eliminado");
  };

  const placementLabel: Record<string, string> = {
    HOME: "Portada",
    CATALOG: "Catálogo",
    BOTH: "Portada y catálogo",
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-h3">Banners promocionales</h2>
          <p className="mt-1 max-w-2xl text-sm text-muted">
            Franjas de promoción en la web. Podés destacar tus propias ofertas o
            enlazar a otra web.
          </p>
        </div>
        <button
          type="button"
          onClick={() => (open ? reset() : setOpen(true))}
          className="inline-flex items-center gap-1.5 rounded-control bg-primary px-4 py-2 text-sm font-medium text-on-primary"
        >
          {open ? <X size={16} /> : <Plus size={16} weight="bold" />}
          {open ? "Cerrar" : "Nuevo banner"}
        </button>
      </div>

      {open && (
        <form onSubmit={save} className="space-y-4 rounded-card border border-line bg-surface p-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block sm:col-span-2">
              <span className="text-xs font-medium text-muted">Título</span>
              <input
                value={draft.title}
                onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
                className={`${inputClass} mt-1.5`}
                placeholder="Envío gratis en compras mayores"
                required
              />
            </label>
            <label className="block sm:col-span-2">
              <span className="text-xs font-medium text-muted">Subtítulo</span>
              <textarea
                value={draft.subtitle}
                onChange={(e) => setDraft((d) => ({ ...d, subtitle: e.target.value }))}
                rows={2}
                className={`${inputClass} mt-1.5 resize-y`}
              />
            </label>
            <div className="sm:col-span-2">
              <ImageField
                label="Imagen de fondo"
                value={draft.image}
                onChange={(image) => setDraft((d) => ({ ...d, image }))}
                hint="Subí una foto desde tu equipo o pegá un enlace."
              />
            </div>
            <label className="block">
              <span className="text-xs font-medium text-muted">Texto del botón</span>
              <input
                value={draft.ctaLabel}
                onChange={(e) => setDraft((d) => ({ ...d, ctaLabel: e.target.value }))}
                className={`${inputClass} mt-1.5`}
                placeholder="Ver ofertas"
              />
            </label>
            <label className="block">
              <span className="text-xs font-medium text-muted">Destino del botón</span>
              <input
                value={draft.ctaUrl}
                onChange={(e) => setDraft((d) => ({ ...d, ctaUrl: e.target.value }))}
                className={`${inputClass} mt-1.5`}
                placeholder="/ofertas  o  https://otra-web.com"
              />
            </label>
            <label className="block">
              <span className="text-xs font-medium text-muted">Color de fondo</span>
              <div className="mt-1.5 flex gap-2">
                <input
                  type="color"
                  value={draft.background}
                  onChange={(e) => setDraft((d) => ({ ...d, background: e.target.value }))}
                  className="h-9 w-12 rounded border border-line"
                  aria-label="Color de fondo"
                />
                <input
                  value={draft.background}
                  onChange={(e) => setDraft((d) => ({ ...d, background: e.target.value }))}
                  className={inputClass}
                />
              </div>
            </label>
            <label className="block">
              <span className="text-xs font-medium text-muted">Color del texto</span>
              <div className="mt-1.5 flex gap-2">
                <input
                  type="color"
                  value={draft.textColor}
                  onChange={(e) => setDraft((d) => ({ ...d, textColor: e.target.value }))}
                  className="h-9 w-12 rounded border border-line"
                  aria-label="Color del texto"
                />
                <input
                  value={draft.textColor}
                  onChange={(e) => setDraft((d) => ({ ...d, textColor: e.target.value }))}
                  className={inputClass}
                />
              </div>
            </label>
            <label className="block">
              <span className="text-xs font-medium text-muted">Dónde se muestra</span>
              <select
                value={draft.placement}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, placement: e.target.value as Draft["placement"] }))
                }
                className={`${inputClass} mt-1.5`}
              >
                <option value="HOME">Portada</option>
                <option value="CATALOG">Catálogo</option>
                <option value="BOTH">Portada y catálogo</option>
              </select>
            </label>
            <label className="block">
              <span className="text-xs font-medium text-muted">Termina el (opcional)</span>
              <input
                type="date"
                value={draft.endsAt}
                onChange={(e) => setDraft((d) => ({ ...d, endsAt: e.target.value }))}
                className={`${inputClass} mt-1.5`}
              />
            </label>
            <label className="block">
              <span className="text-xs font-medium text-muted">Orden</span>
              <input
                type="number"
                min={0}
                value={draft.order}
                onChange={(e) => setDraft((d) => ({ ...d, order: e.target.value }))}
                className={`${inputClass} mt-1.5 tabular-nums`}
              />
            </label>
          </div>

          <label className="flex items-center gap-2 text-sm text-ink">
            <input
              type="checkbox"
              checked={draft.visible}
              onChange={(e) => setDraft((d) => ({ ...d, visible: e.target.checked }))}
              className="h-4 w-4 rounded border-line accent-primary"
            />
            Visible en la web
          </label>

          {error && (
            <p className="rounded-control border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">
              {error}
            </p>
          )}

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={busy}
              className="rounded-control bg-primary px-4 py-2 text-sm font-medium text-on-primary disabled:opacity-60"
            >
              {busy ? "Guardando…" : editId ? "Guardar cambios" : "Crear banner"}
            </button>
            <button
              type="button"
              onClick={reset}
              className="rounded-control border border-line px-4 py-2 text-sm text-ink"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}

      {banners.length === 0 ? (
        <div className="rounded-card border border-line bg-surface p-10 text-center">
          <Megaphone size={32} className="mx-auto text-muted" weight="light" />
          <p className="mt-3 text-sm text-muted">
            Todavía no hay banners. Creá el primero con “Nuevo banner”.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {banners.map((b) => (
            <li
              key={b.id}
              className="flex flex-wrap items-center gap-4 rounded-card border border-line bg-surface p-4"
            >
              <div
                className="flex h-12 w-24 shrink-0 items-center justify-center rounded-control text-[10px] font-medium"
                style={{
                  backgroundColor: b.background,
                  color: b.textColor,
                  backgroundImage: b.image ? `url("${b.image}")` : undefined,
                  backgroundSize: "cover",
                }}
              >
                {b.image ? "" : "Banner"}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-medium text-ink">{b.title}</p>
                <p className="mt-0.5 text-xs text-muted">
                  {placementLabel[b.placement] ?? b.placement}
                  {b.ctaUrl ? ` · ${b.ctaUrl}` : ""}
                  {!b.visible ? " · Oculto" : ""}
                </p>
              </div>
              <button
                onClick={() => toggleVisible(b)}
                className="rounded-control border border-line px-3 py-1.5 text-xs text-ink"
              >
                {b.visible ? "Ocultar" : "Mostrar"}
              </button>
              <button
                onClick={() => startEdit(b)}
                aria-label={`Editar ${b.title}`}
                className="rounded-control p-2 text-muted hover:text-primary"
              >
                <PencilSimple size={16} />
              </button>
              <button
                onClick={() => remove(b)}
                aria-label={`Eliminar ${b.title}`}
                className="rounded-control p-2 text-muted hover:text-danger"
              >
                <Trash size={16} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
