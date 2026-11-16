"use client";

import { useEffect, useRef, useState } from "react";
import {
  Plus,
  Eye,
  EyeSlash,
  PencilSimple,
  Trash,
  Upload,
  X,
  Table,
  SquaresFour,
  Copy,
} from "@phosphor-icons/react/dist/ssr";

import type { CategoryDTO, ProductDTO } from "@/lib/types";
import type { Currency } from "@/lib/currency";
import { useConfirm } from "@/components/ui/ConfirmProvider";
import { useToast } from "@/components/ui/ToastProvider";

const MAX_BYTES = 1_500_000;

type Draft = {
  name: string;
  brand: string;
  description: string;
  categoryId: string;
  notes: string;
  /** Precio de venta en CUP (moneda base de la tienda; se guarda en CUP). */
  price: string;
  costUsd: string;
  image: string;
  stock: string;
  duration: string;
  occasion: string;
  /** Para quién es: HOMBRE | MUJER | UNISEX. */
  gender: string;
  /** Preguntas frecuentes de este perfume. Se cargan una por una. */
  faqs: { q: string; a: string }[];
  visible: boolean;
};

const emptyDraft: Draft = {
  name: "",
  brand: "",
  description: "",
  categoryId: "",
  notes: "",
  price: "",
  costUsd: "",
  image: "",
  stock: "",
  duration: "",
  occasion: "",
  gender: "UNISEX",
  faqs: [],
  visible: true,
};

/**
 * Convierte a CUP el precio guardado de un producto, que es como el dueño lo
 * escribe en el formulario. CUP es la moneda base: en CUP el precio no se
 * toca; si el producto quedó guardado en otra moneda se pasa usando las tasas
 * que la tienda define en Ajustes.
 */
function toCup(amount: number, from: string, currencies: Currency[]): number {
  if (from.toUpperCase() === "CUP") return amount;
  const src = currencies.find((c) => c.code.toUpperCase() === from.toUpperCase());
  if (!src) return amount;
  // rate = cuántas unidades de CUP vale 1 unidad de la moneda.
  return Math.round(amount * src.rate * 100) / 100;
}

/** Muestra un importe en CUP con el símbolo de la tienda. */
function cupLabel(amount: number): string {
  const n = Math.round(Number(amount) * 100) / 100;
  const body = n.toFixed(0) === String(n).split(".")[0] ? String(Math.round(n)) : n.toFixed(2);
  return `$ ${body}`;
}

/**
 * Equivalente del precio en la moneda que el visitante ve (la primera moneda
 * distinta de CUP que la tienda tenga configurada), sólo para referencia del
 * panel. Si no hay otra moneda se muestra igual el precio en CUP.
 */
function otherPrice(amountCup: number, currencies: Currency[]): string {
  const other = currencies.find((c) => c.code.toUpperCase() !== "CUP");
  if (!other || !other.rate) return cupLabel(amountCup);
  const value = Math.round((amountCup / other.rate) * 100) / 100;
  return `${other.symbol} ${value.toFixed(2)}`;
}

export function AdminProducts({
  initialProducts,
  categories: initialCategories,
  currencies,
}: {
  initialProducts: ProductDTO[];
  categories: CategoryDTO[];
  currencies: Currency[];
}) {
  const confirm = useConfirm();
  const toast = useToast();
  const [products, setProducts] = useState(initialProducts);
  const [categories, setCategories] = useState(initialCategories);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [view, setView] = useState<"table" | "cards">("cards");
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (initialCategories.length) {
      setCategories(initialCategories);
      return;
    }
    fetch("/api/categories")
      .then((r) => r.json())
      .then((d) => setCategories(d.categories ?? []))
      .catch(() => {});
  }, [initialCategories]);

  const reset = () => {
    setDraft(emptyDraft);
    setEditingId(null);
    setError(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  const startEdit = (p: ProductDTO) => {
    setEditingId(p.id);
    setDraft({
      name: p.name,
      brand: p.brand,
      description: p.description,
      categoryId: p.categoryId ?? categories.find((c) => c.name === p.category)?.id ?? "",
      notes: p.notes ?? "",
      price: String(toCup(p.price, p.currency, currencies)),
      costUsd: p.costUsd === null || p.costUsd === undefined ? "" : String(p.costUsd),
      image: p.images[0] ?? "",
      stock: p.stock === null ? "" : String(p.stock),
      duration: p.duration ?? "",
      occasion: p.occasion ?? "",
      gender: p.gender ?? "UNISEX",
      faqs: p.faqs ?? [],
      visible: p.visible,
    });
    setError(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  /**
   * Duplicar: abre el formulario de alta con todo lo del perfume copiado
   * (misma marca, notas, precio, categoría) para cargar solo otro nombre y sus
   * notas. El stock arranca en 0 porque todavía no hay unidades reales.
   */
  const duplicate = (p: ProductDTO) => {
    setEditingId(null);
    setDraft({
      name: `${p.name} (copia)`,
      brand: p.brand,
      description: p.description,
      categoryId: p.categoryId ?? categories.find((c) => c.name === p.category)?.id ?? "",
      notes: p.notes ?? "",
      price: String(toCup(p.price, p.currency, currencies)),
      costUsd: p.costUsd === null || p.costUsd === undefined ? "" : String(p.costUsd),
      image: p.images[0] ?? "",
      stock: "0",
      duration: p.duration ?? "",
      occasion: p.occasion ?? "",
      gender: p.gender ?? "UNISEX",
      faqs: p.faqs ?? [],
      visible: false,
    });
    setError(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const pickFile = async (file: File | undefined) => {
    if (!file) return;
    if (!/^image\//i.test(file.type)) {
      setError("El archivo debe ser una imagen.");
      return;
    }
    if (file.size > MAX_BYTES) {
      setError("La imagen no puede superar 1,5 MB. Usá una URL para fotos grandes.");
      return;
    }
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error("No pudimos leer el archivo."));
      reader.readAsDataURL(file);
    }).catch(() => "");
    if (dataUrl) setDraft((d) => ({ ...d, image: dataUrl }));
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const price = Number(draft.price);
    const costUsd = draft.costUsd.trim() === "" ? null : Number(draft.costUsd);
    const stock = draft.stock.trim() === "" ? null : Number(draft.stock);

    if (!draft.name.trim() || !draft.brand.trim() || !draft.description.trim()) {
      setError("Nombre, marca y descripción son obligatorios.");
      return;
    }
    if (!Number.isFinite(price) || price <= 0) {
      setError("El precio debe ser un número mayor a cero.");
      return;
    }
    if (costUsd !== null && (!Number.isFinite(costUsd) || costUsd < 0)) {
      setError("El costo en USD debe ser un número mayor o igual a cero.");
      return;
    }
    if (stock !== null && (!Number.isInteger(stock) || stock < 0)) {
      setError("El stock debe ser un número entero mayor o igual a cero.");
      return;
    }
    const category = categories.find((c) => c.id === draft.categoryId);
    if (!category) {
      setError("Elegí una categoría para el producto.");
      return;
    }

    setBusy(true);
    const payload = {
      name: draft.name.trim(),
      brand: draft.brand.trim(),
      description: draft.description.trim(),
      category: category.name,
      categoryId: category.id,
      notes: draft.notes.trim() || null,
      price,
      currency: "CUP",
      costUsd,
      images: draft.image.trim() ? [draft.image.trim()] : [],
      visible: draft.visible,
      stock,
      duration: draft.duration.trim() || null,
      occasion: (draft.occasion as "DIA" | "NOCHE" | "AMBAS") || null,
      gender: (draft.gender as "HOMBRE" | "MUJER" | "UNISEX") || "UNISEX",
      faqs: draft.faqs.filter((f) => f.q.trim() && f.a.trim()),
    };

    const res = await fetch(
      editingId ? `/api/products/${editingId}` : "/api/products",
      {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      },
    ).catch(() => null);
    setBusy(false);

    if (!res || !res.ok) {
      const data = await res?.json().catch(() => ({}));
      setError(data?.error ?? "No pudimos guardar el producto.");
      return;
    }
    const data = await res.json();
    const saved: ProductDTO = data.product;
    setProducts((prev) =>
      editingId ? prev.map((p) => (p.id === editingId ? saved : p)) : [saved, ...prev],
    );
    toast.success(
      editingId ? "Producto actualizado" : "Producto creado",
      `“${saved.name}” ya está en el catálogo.`,
    );
    reset();
  };

  const toggleVisible = async (p: ProductDTO) => {
    const res = await fetch(`/api/products/${p.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ visible: !p.visible }),
    }).catch(() => null);
    if (res?.ok) {
      setProducts((prev) =>
        prev.map((x) => (x.id === p.id ? { ...x, visible: !x.visible } : x)),
      );
      toast.info(
        p.visible ? "Producto oculto" : "Producto visible",
        p.visible
          ? `“${p.name}” ya no se muestra en la tienda.`
          : `“${p.name}” vuelve a estar en la tienda.`,
      );
    }
  };

  const remove = async (p: ProductDTO) => {
    const ok = await confirm({
      title: `¿Eliminar "${p.name}"?`,
      description:
        "Se quitará del catálogo y de la lista de deseos de los clientes. Esta acción no se puede deshacer.",
      confirmLabel: "Eliminar",
      tone: "danger",
    });
    if (!ok) return;
    const res = await fetch(`/api/products/${p.id}`, { method: "DELETE" }).catch(() => null);
    if (res?.ok) {
      setProducts((prev) => prev.filter((x) => x.id !== p.id));
      toast.success("Producto eliminado", `“${p.name}” ya no aparece en el catálogo.`);
    }
  };

  const inputClass =
    "w-full rounded-control border border-line bg-bg px-3 py-2 text-sm text-ink placeholder:text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40";

  /** Precio en CUP del producto, ya normalizado. */
  const priceCup = (p: ProductDTO) =>
    toCup(p.price, p.currency, currencies);

  /** Precio en la moneda de referencia del visitante, sólo informativo. */
  const priceOther = (p: ProductDTO) => otherPrice(priceCup(p), currencies);

  const stockBadge = (p: ProductDTO) => {
    if (p.stock === null) return <span className="text-muted">Sin control</span>;
    if (p.stock === 0) return <span className="font-medium text-danger">Agotado</span>;
    if (p.stock <= 3) return <span className="font-medium text-danger">{p.stock} unidades</span>;
    return <span className="tabular-nums text-ink">{p.stock} unidades</span>;
  };

  const actions = (p: ProductDTO) => (
    <div className="flex items-center gap-1">
      <button
        onClick={() => toggleVisible(p)}
        aria-label={p.visible ? "Ocultar del catálogo" : "Mostrar en el catálogo"}
        className="rounded-control p-2 text-muted transition-colors hover:text-primary"
      >
        {p.visible ? <Eye size={16} /> : <EyeSlash size={16} />}
      </button>
      <button
        onClick={() => duplicate(p)}
        aria-label={`Duplicar ${p.name} como base de un perfume nuevo`}
        title="Duplicar como base de un perfume nuevo"
        className="rounded-control p-2 text-muted transition-colors hover:text-primary"
      >
        <Copy size={16} />
      </button>
      <button
        onClick={() => startEdit(p)}
        aria-label={`Editar ${p.name}`}
        className="rounded-control p-2 text-muted transition-colors hover:text-primary"
      >
        <PencilSimple size={16} />
      </button>
      <button
        onClick={() => remove(p)}
        aria-label={`Eliminar ${p.name}`}
        className="rounded-control p-2 text-muted transition-colors hover:text-danger"
      >
        <Trash size={16} />
      </button>
    </div>
  );

  return (
    <div className="space-y-8">
      <form onSubmit={save} className="rounded-card border border-line bg-surface p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-h3">{editingId ? "Editar producto" : "Nuevo producto"}</h2>
          {editingId && (
            <button
              type="button"
              onClick={reset}
              className="flex items-center gap-1 text-xs text-muted hover:text-ink"
            >
              <X size={14} /> Cancelar edición
            </button>
          )}
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="text-xs font-medium text-muted">Nombre</span>
            <input
              value={draft.name}
              onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
              className={`${inputClass} mt-1.5`}
              placeholder="Noir de Author"
            />
          </label>
          <label className="block">
            <span className="text-xs font-medium text-muted">Marca</span>
            <input
              value={draft.brand}
              onChange={(e) => setDraft((d) => ({ ...d, brand: e.target.value }))}
              className={`${inputClass} mt-1.5`}
              placeholder="Mist & Mood"
            />
          </label>
        </div>

        <label className="mt-4 block">
          <span className="text-xs font-medium text-muted">Descripción</span>
          <textarea
            value={draft.description}
            onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
            rows={3}
            className={`${inputClass} mt-1.5`}
          />
        </label>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="text-xs font-medium text-muted">Categoría</span>
            <select
              value={draft.categoryId}
              onChange={(e) => setDraft((d) => ({ ...d, categoryId: e.target.value }))}
              className={`${inputClass} mt-1.5`}
            >
              <option value="">Elegí una categoría…</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-xs font-medium text-muted">Notas olfativas</span>
            <input
              value={draft.notes}
              onChange={(e) => setDraft((d) => ({ ...d, notes: e.target.value }))}
              className={`${inputClass} mt-1.5`}
              placeholder="Bergamota, cuero, ámbar"
            />
          </label>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <label className="block">
            <span className="text-xs font-medium text-muted">Precio de venta (CUP)</span>
            <input
              type="number"
              step="0.01"
              min="0"
              value={draft.price}
              onChange={(e) => setDraft((d) => ({ ...d, price: e.target.value }))}
              className={`${inputClass} mt-1.5 tabular-nums`}
              placeholder="25.00"
            />
            <span className="mt-1 block text-[11px] text-muted">
              Escribí el precio en pesos cubanos. Las demás monedas se calculan
              solas con las tasas de Administración → Ajustes.
            </span>
          </label>
          <label className="block">
            <span className="text-xs font-medium text-muted">Costo (USD) · solo admin</span>
            <input
              type="number"
              step="0.01"
              min="0"
              value={draft.costUsd}
              onChange={(e) => setDraft((d) => ({ ...d, costUsd: e.target.value }))}
              className={`${inputClass} mt-1.5 tabular-nums`}
              placeholder="Opcional"
            />
          </label>
          <label className="block">
            <span className="text-xs font-medium text-muted">Stock</span>
            <input
              type="number"
              step="1"
              min="0"
              value={draft.stock}
              onChange={(e) => setDraft((d) => ({ ...d, stock: e.target.value }))}
              className={`${inputClass} mt-1.5 tabular-nums`}
              placeholder="Vacío = sin control"
            />
          </label>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="text-xs font-medium text-muted">Duración en la piel</span>
            <input
              value={draft.duration}
              onChange={(e) => setDraft((d) => ({ ...d, duration: e.target.value }))}
              className={`${inputClass} mt-1.5`}
              placeholder="6-8 h"
            />
          </label>
          <label className="block">
            <span className="text-xs font-medium text-muted">Ocasión</span>
            <select
              value={draft.occasion}
              onChange={(e) => setDraft((d) => ({ ...d, occasion: e.target.value }))}
              className={`${inputClass} mt-1.5`}
            >
              <option value="">Sin especificar</option>
              <option value="DIA">Día</option>
              <option value="NOCHE">Noche</option>
              <option value="AMBAS">Día y noche</option>
            </select>
          </label>
          <label className="block">
            <span className="text-xs font-medium text-muted">Para quién</span>
            <select
              value={draft.gender}
              onChange={(e) => setDraft((d) => ({ ...d, gender: e.target.value }))}
              className={`${inputClass} mt-1.5`}
            >
              <option value="UNISEX">Unisex (ambos)</option>
              <option value="MUJER">Mujer</option>
              <option value="HOMBRE">Hombre</option>
            </select>
          </label>
        </div>

        <fieldset className="mt-4 rounded-control border border-line bg-bg p-3">
          <legend className="px-1 text-xs font-medium text-muted">
            Preguntas frecuentes de este perfume
          </legend>
          <p className="text-[11px] text-muted">
            Se muestran en la ficha del producto y Google puede mostrarlas en los resultados.
            Ejemplos: «¿Es original?», «¿Cuánto dura?».
          </p>

          {draft.faqs.length === 0 && (
            <p className="mt-2 text-xs text-muted">Todavía no cargaste preguntas.</p>
          )}

          <div className="mt-2 space-y-2">
            {draft.faqs.map((faq, i) => (
              <div key={i} className="rounded-control border border-line bg-surface p-2">
                <div className="flex items-start gap-2">
                  <div className="flex-1 space-y-2">
                    <input
                      value={faq.q}
                      aria-label={`Pregunta ${i + 1}`}
                      onChange={(e) =>
                        setDraft((d) => ({
                          ...d,
                          faqs: d.faqs.map((f, j) => (j === i ? { ...f, q: e.target.value } : f)),
                        }))
                      }
                      className={inputClass}
                      placeholder="¿Es original?"
                    />
                    <textarea
                      value={faq.a}
                      aria-label={`Respuesta ${i + 1}`}
                      rows={2}
                      onChange={(e) =>
                        setDraft((d) => ({
                          ...d,
                          faqs: d.faqs.map((f, j) => (j === i ? { ...f, a: e.target.value } : f)),
                        }))
                      }
                      className={inputClass}
                      placeholder="Sí. Todos los frascos son originales y vienen sellados."
                    />
                  </div>
                  <button
                    type="button"
                    aria-label={`Quitar la pregunta ${i + 1}`}
                    onClick={() =>
                      setDraft((d) => ({ ...d, faqs: d.faqs.filter((_, j) => j !== i) }))
                    }
                    className="rounded-control p-2 text-muted transition-colors hover:text-danger"
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {draft.faqs.length < 15 && (
            <button
              type="button"
              onClick={() =>
                setDraft((d) => ({ ...d, faqs: [...d.faqs, { q: "", a: "" }] }))
              }
              className="mt-2 flex items-center gap-1.5 rounded-control border border-line bg-surface px-3 py-1.5 text-xs font-medium text-ink transition-colors hover:border-primary hover:text-primary"
            >
              <Plus size={13} /> Agregar pregunta
            </button>
          )}
        </fieldset>

        <div className="mt-4 rounded-control border border-line bg-bg p-3">
          <span className="text-xs font-medium text-muted">Imagen del producto</span>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={(e) => pickFile(e.target.files?.[0])}
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="flex items-center gap-2 rounded-control border border-line px-3 py-2 text-xs text-ink hover:border-primary hover:text-primary"
            >
              <Upload size={14} /> Subir archivo
            </button>
            <span className="text-xs text-muted">o</span>
            <input
              value={draft.image.startsWith("data:") ? "" : draft.image}
              onChange={(e) => setDraft((d) => ({ ...d, image: e.target.value }))}
              placeholder="https://…/foto.jpg"
              className={`${inputClass} flex-1`}
            />
            {draft.image && (
              <button
                type="button"
                onClick={() => {
                  setDraft((d) => ({ ...d, image: "" }));
                  if (fileRef.current) fileRef.current.value = "";
                }}
                className="flex items-center gap-1 rounded-control border border-line px-2 py-2 text-xs text-muted hover:border-danger hover:text-danger"
              >
                <X size={12} /> Quitar
              </button>
            )}
          </div>
          {draft.image && (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={draft.image}
              alt="Vista previa"
              className="mt-3 h-24 w-24 rounded object-cover"
            />
          )}
        </div>

        <label className="mt-4 flex items-center gap-2 text-sm text-ink">
          <input
            type="checkbox"
            checked={draft.visible}
            onChange={(e) => setDraft((d) => ({ ...d, visible: e.target.checked }))}
            className="h-4 w-4 rounded border-line accent-primary"
          />
          Visible en el catálogo
        </label>

        {error && (
          <p role="alert" className="mt-3 text-sm text-danger">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={busy}
          className="mt-5 flex items-center gap-2 rounded-control bg-primary px-4 py-2.5 text-sm font-medium text-on-primary transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          <Plus size={16} weight="bold" />
          {busy ? "Guardando…" : editingId ? "Guardar cambios" : "Agregar producto"}
        </button>
      </form>

      <div>
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-h3">Productos ({products.length})</h2>
          <div
            role="group"
            aria-label="Forma de ver los productos"
            className="flex rounded-control border border-line p-0.5"
          >
            <button
              type="button"
              onClick={() => setView("cards")}
              aria-pressed={view === "cards"}
              className={`flex items-center gap-1.5 rounded px-2.5 py-1.5 text-xs transition-colors ${
                view === "cards" ? "bg-primary text-on-primary" : "text-muted hover:text-ink"
              }`}
            >
              <SquaresFour size={14} /> Tarjetas
            </button>
            <button
              type="button"
              onClick={() => setView("table")}
              aria-pressed={view === "table"}
              className={`flex items-center gap-1.5 rounded px-2.5 py-1.5 text-xs transition-colors ${
                view === "table" ? "bg-primary text-on-primary" : "text-muted hover:text-ink"
              }`}
            >
              <Table size={14} /> Tabla
            </button>
          </div>
        </div>

        {products.length === 0 && (
          <p className="rounded-card border border-line bg-surface px-4 py-10 text-center text-sm text-muted">
            Todavía no hay productos. Agregá el primero arriba.
          </p>
        )}

        {/* Tarjetas: la vista por defecto en el móvil, donde una tabla ancha no entra. */}
        {products.length > 0 && view === "cards" && (
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {products.map((p) => (
              <li
                key={p.id}
                className="flex min-w-0 gap-3 rounded-card border border-line bg-surface p-3"
              >
                <div className="h-16 w-16 shrink-0 overflow-hidden rounded-control bg-bg">
                  {p.images[0] ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={p.images[0]}
                      alt={p.name}
                      className="h-full w-full object-cover"
                    />
                  ) : null}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-ink">{p.name}</p>
                  <p className="truncate text-xs text-muted">
                    {p.brand} · {p.category}
                  </p>
                  <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                    <span className="tabular-nums font-medium text-ink">
                      {cupLabel(priceCup(p))}
                    </span>
                    <span className="tabular-nums text-muted">{priceOther(p)}</span>
                    <span className="tabular-nums text-muted">{stockBadge(p)}</span>
                    {!p.visible && (
                      <span className="rounded-full bg-danger/10 px-2 py-0.5 text-[10px] text-danger">
                        Oculto
                      </span>
                    )}
                  </div>
                </div>
                {actions(p)}
              </li>
            ))}
          </ul>
        )}

        {/* Tabla: escritorio, con desplazamiento horizontal propio en pantallas angostas. */}
        {products.length > 0 && view === "table" && (
          <div className="rounded-card border border-line bg-surface">
            <div className="w-full overflow-x-auto">
              <table className="w-full min-w-[640px] text-sm">
                <thead className="border-b border-line bg-bg/40 text-left text-xs uppercase tracking-[0.1em] text-muted">
                  <tr>
                    <th className="px-4 py-3">Producto</th>
                    <th className="px-4 py-3">Categoría</th>
                    <th className="px-4 py-3 text-right">Precio</th>
                    <th className="px-4 py-3 text-right">Costo USD</th>
                    <th className="px-4 py-3 text-right">Stock</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {products.map((p) => (
                    <tr key={p.id} className="border-b border-line/60 last:border-0">
                      <td className="px-4 py-3">
                        <span className="font-medium text-ink">{p.name}</span>
                        <span className="block text-xs text-muted">{p.brand}</span>
                        {!p.visible && (
                          <span className="mt-1 inline-block rounded-full bg-danger/10 px-2 py-0.5 text-[10px] text-danger">
                            Oculto
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-muted">{p.category}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums text-ink">
                        {cupLabel(priceCup(p))}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums text-muted">
                        {p.costUsd === null || p.costUsd === undefined
                          ? "—"
                          : `US$ ${p.costUsd.toFixed(2)}`}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums">
                        {p.stock === null ? (
                          <span className="text-muted">—</span>
                        ) : (
                          <span
                            className={
                              p.stock <= 3 ? "font-medium text-danger" : "text-ink"
                            }
                          >
                            {p.stock}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">{actions(p)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
