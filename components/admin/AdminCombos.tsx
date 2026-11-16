"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Plus,
  Trash,
  PencilSimple,
  Eye,
  EyeSlash,
  X,
  Package,
} from "@phosphor-icons/react/dist/ssr";
import type { ComboDTO, ProductDTO } from "@/lib/types";
import type { Currency } from "@/lib/currency";
import { formatMoney, convert } from "@/lib/currency";
import { useToast } from "@/components/ui/ToastProvider";
import { useConfirm } from "@/components/ui/ConfirmProvider";
import { ImageField } from "./ImageField";

type Row = ComboDTO & {
  items: {
    productId: string;
    quantity: number;
    name?: string;
    brand?: string;
    stock?: number | null;
  }[];
};

type DraftItem = { productId: string; quantity: number };

type Draft = {
  title: string;
  description: string;
  image: string;
  price: string;
  compareAtPrice: string;
  visible: boolean;
  order: string;
  items: DraftItem[];
};

const emptyDraft: Draft = {
  title: "",
  description: "",
  image: "",
  price: "",
  compareAtPrice: "",
  visible: true,
  order: "0",
  items: [{ productId: "", quantity: 1 }],
};

/** Base sin ancho: en una fila flex el ancho lo decide flex-1 / w-16. */
const fieldBase =
  "rounded-control border border-line bg-bg px-3 py-2 text-sm text-ink placeholder:text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40";

const inputClass = `w-full ${fieldBase}`;

/**
 * OFERTAS (combos): se elige una cantidad de cada producto y un precio total.
 * Al venderse, el servidor descuenta el stock de CADA producto del combo.
 */
export function AdminCombos({
  initialCombos,
  products,
  currencies,
}: {
  initialCombos: Row[];
  products: ProductDTO[];
  currencies: Currency[];
}) {
  const [combos, setCombos] = useState<Row[]>(initialCombos);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [editId, setEditId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();
  const confirm = useConfirm();

  // Las ofertas se cargan y se guardan en USD: es la referencia con la que la
  // tienda fija el precio del combo. En la web se muestra convertido a la
  // moneda que el cliente eligió (ComboCard usa usePrice para eso).
  const cur = currencies.find((c) => c.code === "USD") ?? currencies[0];

  // Suma "de lista" de los productos elegidos: sirve para sugerir el precio
  // anterior (lo que costaría sin la oferta).
  const listPrice = useMemo(() => {
    return draft.items.reduce((sum, it) => {
      const p = products.find((x) => x.id === it.productId);
      if (!p) return sum;
      const inBase = convert(p.price, p.currency, cur.code, currencies);
      return sum + inBase * it.quantity;
    }, 0);
  }, [draft.items, products, currencies, cur.code]);

  const startEdit = (c: Row) => {
    setEditId(c.id);
    // El precio guardado está en la moneda del combo (CUP); el formulario
    // trabaja en USD, así que se convierte al abrirlo.
    const from: Currency = currencies.find((x) => x.code === c.currency) ?? currencies[0];
    const priceUsd = convert(Number(c.price), from.code, cur.code, currencies);
    const compareUsd =
      c.compareAtPrice === null
        ? ""
        : String(convert(Number(c.compareAtPrice), from.code, cur.code, currencies));
    setDraft({
      title: c.title,
      description: c.description,
      image: c.image ?? "",
      price: String(priceUsd),
      compareAtPrice: compareUsd,
      visible: c.visible,
      order: String(c.order),
      items:
        c.items.length > 0
          ? c.items.map((i) => ({ productId: i.productId, quantity: i.quantity }))
          : [{ productId: "", quantity: 1 }],
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

    const items = draft.items.filter((i) => i.productId);
    if (!draft.title.trim()) return setError("Poné un título a la oferta.");
    if (items.length === 0) return setError("Elegí al menos un producto para el combo.");
    const priceNum = Number(draft.price);
    if (!Number.isFinite(priceNum) || priceNum <= 0)
      return setError("El precio de la oferta debe ser mayor que cero.");
    const compareNum = draft.compareAtPrice.trim() === "" ? null : Number(draft.compareAtPrice);
    if (compareNum !== null && (!Number.isFinite(compareNum) || compareNum <= 0))
      return setError("El precio anterior debe ser un número mayor que cero.");

    setBusy(true);
    try {
      const payload = {
        title: draft.title.trim(),
        description: draft.description.trim(),
        image: draft.image.trim() || null,
        price: priceNum,
        compareAtPrice: compareNum,
        currency: cur.code,
        visible: draft.visible,
        order: Number(draft.order) || 0,
        items,
      };
      const res = await fetch(
        editId ? `/api/admin/combos/${editId}` : "/api/admin/combos",
        {
          method: editId ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "No se pudo guardar la oferta.");

      const saved: Row = {
        ...(data.combo as ComboDTO),
        items: (data.combo.items ?? []).map((i: { productId: string; quantity: number }) => {
          const p = products.find((x) => x.id === i.productId);
          return { productId: i.productId, quantity: i.quantity, name: p?.name, brand: p?.brand };
        }),
      };
      setCombos((list) =>
        editId ? list.map((c) => (c.id === editId ? saved : c)) : [saved, ...list],
      );
      toast.success(editId ? "Oferta actualizada" : "Oferta creada", "Ya se ve en la web.");
      reset();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error de red");
    } finally {
      setBusy(false);
    }
  };

  const toggleVisible = async (c: Row) => {
    const res = await fetch(`/api/admin/combos/${c.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ visible: !c.visible }),
    });
    if (!res.ok) {
      toast.error("No se pudo cambiar", "Probá de nuevo.");
      return;
    }
    setCombos((list) =>
      list.map((x) => (x.id === c.id ? { ...x, visible: !x.visible } : x)),
    );
  };

  const remove = async (c: Row) => {
    const ok = await confirm({
      title: `¿Eliminar la oferta "${c.title}"?`,
      description: "Dejará de verse en la web. Los productos no se borran.",
      confirmLabel: "Eliminar",
      tone: "danger",
    });
    if (!ok) return;
    const res = await fetch(`/api/admin/combos/${c.id}`, { method: "DELETE" });
    if (!res.ok) {
      toast.error("No se pudo eliminar", "Probá de nuevo.");
      return;
    }
    setCombos((list) => list.filter((x) => x.id !== c.id));
    toast.success("Oferta eliminada");
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-h3">Ofertas y combos</h2>
          <p className="mt-1 max-w-2xl text-sm text-muted">
            Agrupá varios productos y poneles un precio especial. Al venderse un
            combo se descuenta del stock de cada producto que lo compone.
          </p>
        </div>
        <button
          type="button"
          onClick={() => (open ? reset() : setOpen(true))}
          className="inline-flex items-center gap-1.5 rounded-control bg-primary px-4 py-2 text-sm font-medium text-on-primary"
        >
          {open ? <X size={16} /> : <Plus size={16} weight="bold" />}
          {open ? "Cerrar" : "Nueva oferta"}
        </button>
      </div>

      {open && (
        <form onSubmit={save} className="space-y-4 rounded-card border border-line bg-surface p-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block sm:col-span-2">
              <span className="text-xs font-medium text-muted">Título de la oferta</span>
              <input
                value={draft.title}
                onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
                className={`${inputClass} mt-1.5`}
                placeholder="Pack descubre tu aroma"
                required
              />
            </label>
            <label className="block sm:col-span-2">
              <span className="text-xs font-medium text-muted">Descripción</span>
              <textarea
                value={draft.description}
                onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
                rows={2}
                className={`${inputClass} mt-1.5 resize-y`}
              />
            </label>
            <div className="sm:col-span-2">
              <ImageField
                label="Imagen de la oferta"
                value={draft.image}
                onChange={(image) => setDraft((d) => ({ ...d, image }))}
                hint="Subí una foto del combo o pegá un enlace."
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted">Productos del combo</span>
              <button
                type="button"
                onClick={() => setDraft((d) => ({ ...d, items: [...d.items, { productId: "", quantity: 1 }] }))}
                className="inline-flex items-center gap-1 text-xs text-primary"
              >
                <Plus size={13} /> Agregar producto
              </button>
            </div>
            <div className="mt-2 space-y-2">
              {draft.items.map((item, idx) => (
                <div
                  key={idx}
                  className="grid grid-cols-[minmax(0,1fr)_4rem_2.25rem] items-center gap-2"
                >
                  <select
                    value={item.productId}
                    onChange={(e) =>
                      setDraft((d) => ({
                        ...d,
                        items: d.items.map((x, i) =>
                          i === idx ? { ...x, productId: e.target.value } : x,
                        ),
                      }))
                    }
                    aria-label="Producto del combo"
                    className={`${fieldBase} min-w-0 w-full truncate`}
                  >
                    <option value="">Elegí un producto…</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} — {p.brand}
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    min={1}
                    max={99}
                    value={item.quantity}
                    onChange={(e) =>
                      setDraft((d) => ({
                        ...d,
                        items: d.items.map((x, i) =>
                          i === idx ? { ...x, quantity: Math.max(1, Number(e.target.value) || 1) } : x,
                        ),
                      }))
                    }
                    aria-label="Cantidad"
                    title="Cantidad"
                    className={`${fieldBase} w-full px-1 text-center tabular-nums`}
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setDraft((d) => ({
                        ...d,
                        items: d.items.filter((_, i) => i !== idx),
                      }))
                    }
                    aria-label="Quitar producto"
                    className="rounded-control p-2 text-muted hover:text-primary"
                  >
                    <Trash size={16} />
                  </button>
                </div>
              ))}
            </div>
            {listPrice > 0 && (
              <p className="mt-2 text-xs text-muted">
                Precio de lista de los productos elegidos:{" "}
                <span className="tabular-nums text-ink">{formatMoney(listPrice, cur)}</span>
              </p>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <label className="block">
              <span className="text-xs font-medium text-muted">Precio de la oferta ({cur.code})</span>
              <input
                type="number"
                step="0.01"
                min="0"
                value={draft.price}
                onChange={(e) => setDraft((d) => ({ ...d, price: e.target.value }))}
                className={`${inputClass} mt-1.5 tabular-nums`}
                required
              />
            </label>
            <label className="block">
              <span className="text-xs font-medium text-muted">Precio anterior ({cur.code}, opcional)</span>
              <input
                type="number"
                step="0.01"
                min="0"
                value={draft.compareAtPrice}
                onChange={(e) => setDraft((d) => ({ ...d, compareAtPrice: e.target.value }))}
                className={`${inputClass} mt-1.5 tabular-nums`}
                placeholder={listPrice > 0 ? listPrice.toFixed(2) : ""}
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
              {busy ? "Guardando…" : editId ? "Guardar cambios" : "Crear oferta"}
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

      {combos.length === 0 ? (
        <div className="rounded-card border border-line bg-surface p-10 text-center">
          <Package size={32} className="mx-auto text-muted" weight="light" />
          <p className="mt-3 text-sm text-muted">
            Todavía no hay ofertas. Creá la primera con “Nueva oferta”.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {combos.map((c) => (
            <li
              key={c.id}
              className="flex flex-wrap items-center gap-4 rounded-card border border-line bg-surface p-4"
            >
              <div className="min-w-0 flex-1">
                <p className="font-medium text-ink">{c.title}</p>
                <p className="mt-0.5 text-xs text-muted">
                  {c.items.map((i) => `${i.quantity}× ${i.name ?? i.productId}`).join(" · ")}
                </p>
              </div>
              <div className="text-right text-sm tabular-nums">
                <p className="text-ink">
                  {formatMoney(convert(Number(c.price), c.currency, cur.code, currencies), cur)}
                </p>
                {c.compareAtPrice && (
                  <p className="text-xs text-muted line-through">
                    {formatMoney(
                      convert(Number(c.compareAtPrice), c.currency, cur.code, currencies),
                      cur,
                    )}
                  </p>
                )}
              </div>
              <button
                onClick={() => toggleVisible(c)}
                aria-label={c.visible ? "Ocultar oferta" : "Mostrar oferta"}
                className="rounded-control p-2 text-muted hover:text-primary"
              >
                {c.visible ? <Eye size={16} /> : <EyeSlash size={16} />}
              </button>
              <button
                onClick={() => startEdit(c)}
                aria-label={`Editar ${c.title}`}
                className="rounded-control p-2 text-muted hover:text-primary"
              >
                <PencilSimple size={16} />
              </button>
              <button
                onClick={() => remove(c)}
                aria-label={`Eliminar ${c.title}`}
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
