"use client";

import { useRef, useState } from "react";
import { Upload, Trash, FloppyDisk } from "@phosphor-icons/react/dist/ssr";
import { useToast } from "@/components/ui/ToastProvider";
import { SITE_TEXT_FIELDS } from "@/lib/site-texts";

const MAX_BYTES = 900_000;

export type ContentForm = {
  logoUrl: string | null;
  termsText: string;
  privacyText: string;
  cookiesText: string;
  reservationsText: string;
  catalogTitle: string;
  catalogIntro: string;
  heroTitle: string;
  heroSubtitle: string;
  seoTitle: string;
  seoDescription: string;
  seoKeywords: string;
  siteUrl: string;
  googleSiteVerification: string;
  siteTexts: Record<string, string>;
};

const inputClass =
  "w-full rounded-control border border-line bg-bg px-3 py-2 text-sm text-ink placeholder:text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40";

const LEGAL_TABS = [
  { key: "termsText", label: "Términos" },
  { key: "privacyText", label: "Privacidad" },
  { key: "cookiesText", label: "Cookies" },
  { key: "reservationsText", label: "Reservas y pagos" },
] as const;

/**
 * Contenido editable de la tienda: logo, textos legales, textos del catálogo y
 * datos para Google. Todo lo que se guarda acá se ve en la web pública de
 * inmediato, sin tocar código.
 */
export function AdminContent({ initial }: { initial: ContentForm }) {
  const [form, setForm] = useState<ContentForm>(initial);
  const [legalTab, setLegalTab] = useState<(typeof LEGAL_TABS)[number]["key"]>("termsText");
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  const fileRef = useRef<HTMLInputElement>(null);

  const set = <K extends keyof ContentForm>(key: K, value: ContentForm[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const pickLogo = async (file: File | undefined) => {
    if (!file) return;
    if (!/^image\/(png|jpe?g|webp|svg\+xml|gif)$/i.test(file.type)) {
      toast.error("Formato no admitido", "Usá PNG, JPG, SVG o WebP.");
      return;
    }
    if (file.size > 8_000_000) {
      toast.error("Imagen muy grande", "El logo no puede superar 8 MB.");
      return;
    }
    try {
      // Un JPG de cámara pesa varios MB: se reduce y se re-comprime en el
      // navegador antes de guardarlo, si no el envío supera el límite del
      // servidor y "no se guarda". Un SVG (vectorial) se guarda tal cual.
      const dataUrl =
        file.type === "image/svg+xml"
          ? await readAsDataUrl(file)
          : await shrinkImage(file, 480);
      const kb = Math.round((dataUrl.length * 3) / 4 / 1024);
      if (kb > 1100) {
        toast.error(
          "Sigue siendo muy grande",
          "Probá con una imagen más chica (menos de 1100 KB una vez reducida).",
        );
        return;
      }
      set("logoUrl", dataUrl);
    } catch {
      toast.error("No se pudo leer la imagen", "Probá con otro archivo.");
    }
  };

  const readAsDataUrl = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error("No se pudo leer la imagen"));
      reader.readAsDataURL(file);
    });

  /** Reduce y recomprime una imagen raster a un data URL JPEG/PNG liviano. */
  const shrinkImage = (file: File, maxSide: number) =>
    new Promise<string>((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(img.width * scale));
        canvas.height = Math.max(1, Math.round(img.height * scale));
        const ctx = canvas.getContext("2d");
        URL.revokeObjectURL(url);
        if (!ctx) {
          reject(new Error("Sin canvas"));
          return;
        }
        // Los logos con transparencia van a PNG; las fotos, a JPEG (pesa menos).
        const hasAlpha = file.type === "image/png" || file.type === "image/webp";
        if (!hasAlpha) {
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        try {
          resolve(
            hasAlpha
              ? canvas.toDataURL("image/png")
              : canvas.toDataURL("image/jpeg", 0.82),
          );
        } catch {
          reject(new Error("No se pudo recomprimir"));
        }
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error("Imagen inválida"));
      };
      img.src = url;
    });

  const setText = (key: string, value: string) =>
    setForm((f) => ({ ...f, siteTexts: { ...f.siteTexts, [key]: value } }));

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "No se pudo guardar el contenido.");
      toast.success("Contenido guardado", "La web pública ya muestra estos cambios.");
      // La app instalada guarda en caché el logo/ícono: le pedimos al service
      // worker que borre esa caché para que tome el ícono nuevo (cambia la URL
      // con ?v= y se actualiza solo, sin reinstalar).
      if (typeof navigator !== "undefined" && navigator.serviceWorker?.controller) {
        navigator.serviceWorker.controller.postMessage({ type: "REFRESH_ICONS" });
      }
    } catch (err) {
      toast.error("No se pudo guardar", err instanceof Error ? err.message : "Error de red");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={save} className="space-y-8">
      <section className="rounded-card border border-line bg-surface p-6">
        <h2 className="text-h3">Logo de la tienda</h2>
        <p className="mt-1 text-xs text-muted">
          Reemplaza el sello de texto del encabezado y es el icono de la app instalada en el móvil.
          Ideal: PNG o SVG cuadrado, fondo transparente.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-4">
          <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-control border border-line bg-bg">
            {form.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={form.logoUrl} alt="Logo actual" className="h-full w-full object-contain" />
            ) : (
              <span className="text-xs text-muted">Sin logo</span>
            )}
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={(e) => pickLogo(e.target.files?.[0])}
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="flex items-center gap-1.5 rounded-control border border-line px-3 py-2 text-xs text-ink transition-colors hover:border-primary hover:text-primary"
          >
            <Upload size={14} /> Subir imagen
          </button>
          {form.logoUrl && (
            <button
              type="button"
              onClick={() => set("logoUrl", null)}
              className="flex items-center gap-1.5 rounded-control border border-line px-3 py-2 text-xs text-danger transition-colors hover:border-danger"
            >
              <Trash size={14} /> Quitar logo
            </button>
          )}
        </div>
      </section>

      <section className="rounded-card border border-line bg-surface p-6">
        <h2 className="text-h3">Portada y catálogo</h2>
        <p className="mt-1 text-xs text-muted">
          Si dejás el título de la portada vacío se usa el eslogan de la tienda.
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="block sm:col-span-2">
            <span className="text-xs uppercase tracking-[0.14em] text-muted">Título de la portada</span>
            <input
              value={form.heroTitle}
              onChange={(e) => set("heroTitle", e.target.value)}
              placeholder="Fragancias que se recuerdan"
              className={`${inputClass} mt-1.5`}
            />
          </label>
          <label className="block sm:col-span-2">
            <span className="text-xs uppercase tracking-[0.14em] text-muted">Bajada de la portada</span>
            <textarea
              value={form.heroSubtitle}
              onChange={(e) => set("heroSubtitle", e.target.value)}
              rows={2}
              placeholder="Armá tu pedido, reservalo y pasá a buscarlo a la tienda o coordiná el envío por kilómetro."
              className={`${inputClass} mt-1.5`}
            />
            <span className="mt-1 block text-xs text-muted">
              Si la dejás vacía, la portada usa el texto de presentación de la tienda.
            </span>
          </label>
          <label className="block">
            <span className="text-xs uppercase tracking-[0.14em] text-muted">Título del catálogo</span>
            <input
              value={form.catalogTitle}
              onChange={(e) => set("catalogTitle", e.target.value)}
              className={`${inputClass} mt-1.5`}
            />
          </label>
          <label className="block">
            <span className="text-xs uppercase tracking-[0.14em] text-muted">Texto bajo el título del catálogo</span>
            <input
              value={form.catalogIntro}
              onChange={(e) => set("catalogIntro", e.target.value)}
              className={`${inputClass} mt-1.5`}
            />
          </label>
        </div>
      </section>

      <section className="rounded-card border border-line bg-surface p-6">
        <h2 className="text-h3">Textos de la web</h2>
        <p className="mt-1 text-xs text-muted">
          Rótulos de la barra superior, títulos de las secciones de la portada y textos del pie.
          Si dejás un campo vacío, la web usa su texto por defecto.
        </p>
        <div className="mt-4 space-y-6">
          {Array.from(new Set(SITE_TEXT_FIELDS.map((f) => f.group))).map((group) => (
            <div key={group}>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">{group}</p>
              <div className="mt-3 grid gap-4 sm:grid-cols-2">
                {SITE_TEXT_FIELDS.filter((f) => f.group === group).map((field) => (
                  <label key={field.key} className={`block ${field.long ? "sm:col-span-2" : ""}`}>
                    <span className="text-xs uppercase tracking-[0.14em] text-muted">{field.label}</span>
                    {field.long ? (
                      <textarea
                        value={form.siteTexts[field.key] ?? ""}
                        onChange={(e) => setText(field.key, e.target.value)}
                        rows={2}
                        className={`${inputClass} mt-1.5`}
                      />
                    ) : (
                      <input
                        value={form.siteTexts[field.key] ?? ""}
                        onChange={(e) => setText(field.key, e.target.value)}
                        className={`${inputClass} mt-1.5`}
                      />
                    )}
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-card border border-line bg-surface p-6">
        <h2 className="text-h3">Textos legales</h2>
        <p className="mt-1 text-xs text-muted">
          Formato simple: <code>## Título</code>, párrafos, listas con <code>-</code> o{" "}
          <code>1.</code> y <strong>negrita</strong> entre dobles asteriscos.
        </p>
        <div className="mt-4 flex flex-wrap gap-1 border-b border-line">
          {LEGAL_TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setLegalTab(t.key)}
              aria-pressed={legalTab === t.key}
              className={`border-b-2 px-3 py-2 text-xs transition-colors ${
                legalTab === t.key
                  ? "border-primary text-primary"
                  : "border-transparent text-muted hover:text-ink"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <textarea
          value={form[legalTab]}
          onChange={(e) => set(legalTab, e.target.value)}
          rows={18}
          className={`${inputClass} mt-4 font-mono text-xs leading-relaxed`}
        />
      </section>

      <section className="rounded-card border border-line bg-surface p-6">
        <h2 className="text-h3">Cómo te encuentra Google</h2>
        <p className="mt-1 text-xs text-muted">
          Título y descripción que aparecen en los resultados de búsqueda, y la dirección pública
          del sitio (se usa en el mapa del sitio y en los enlaces compartidos).
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="block sm:col-span-2">
            <span className="text-xs uppercase tracking-[0.14em] text-muted">Dirección del sitio (https://…)</span>
            <input
              value={form.siteUrl}
              onChange={(e) => set("siteUrl", e.target.value)}
              placeholder="https://mistandmood.com"
              className={`${inputClass} mt-1.5`}
            />
            <span className="mt-1 block text-[11px] text-muted">
              Poné la dirección que la gente escribe en el navegador. Si la dejás vacía, la web usa
              la que le da Vercel. Importante: una dirección con <code>…-6x5vec3ke-nocoder1…</code>{" "}
              es la de UNA publicación y cambia cada vez que publicás, y Google no indexa una
              dirección que cambia. Para aparecer en Google, conectá un dominio propio (por ejemplo{" "}
              <code>mistandmood.com</code>) en Vercel y pegalo acá.
            </span>
          </label>
          <label className="block sm:col-span-2">
            <span className="text-xs uppercase tracking-[0.14em] text-muted">
              Código de Google Search Console (opcional)
            </span>
            <input
              value={form.googleSiteVerification}
              onChange={(e) => set("googleSiteVerification", e.target.value)}
              placeholder="Pega acá el código de la etiqueta google-site-verification"
              className={`${inputClass} mt-1.5 font-mono text-xs`}
            />
            <span className="mt-1 block text-[11px] text-muted">
              Sirve para confirmar que la web es tuya en Search Console y pedir que Google la
              revise. Si lo dejás vacío no se agrega la etiqueta.
            </span>
          </label>
          <label className="block sm:col-span-2">
            <span className="text-xs uppercase tracking-[0.14em] text-muted">Título para Google</span>
            <input
              value={form.seoTitle}
              onChange={(e) => set("seoTitle", e.target.value)}
              className={`${inputClass} mt-1.5`}
            />
          </label>
          <label className="block sm:col-span-2">
            <span className="text-xs uppercase tracking-[0.14em] text-muted">Descripción para Google</span>
            <textarea
              value={form.seoDescription}
              onChange={(e) => set("seoDescription", e.target.value)}
              rows={3}
              className={`${inputClass} mt-1.5`}
            />
          </label>
          <label className="block sm:col-span-2">
            <span className="text-xs uppercase tracking-[0.14em] text-muted">
              Palabras clave (separadas por coma)
            </span>
            <input
              value={form.seoKeywords}
              onChange={(e) => set("seoKeywords", e.target.value)}
              className={`${inputClass} mt-1.5`}
            />
          </label>
        </div>
        {form.siteUrl.trim() && (
          <div className="mt-5 rounded-control border border-line bg-bg p-4">
            <p className="text-xs font-medium text-ink">Para que Google te encuentre</p>
            <ol className="mt-2 list-decimal space-y-1 pl-4 text-[11px] leading-relaxed text-muted">
              <li>
                Abrí{" "}
                <a
                  href="https://search.google.com/search-console"
                  target="_blank"
                  rel="noreferrer"
                  className="text-primary underline-offset-2 hover:underline"
                >
                  Search Console
                </a>{" "}
                y agregá tu dirección como propiedad.
              </li>
              <li>Pegá arriba el código de verificación que te da y guardá.</li>
              <li>
                Dentro de Search Console, en <em>Sitemaps</em>, cargá esta dirección:{" "}
                <code className="break-all text-ink">
                  {form.siteUrl.replace(/\/+$/, "")}/sitemap.xml
                </code>
              </li>
              <li>
                Google tarda entre unos días y un par de semanas en mostrar la web en los
                resultados. No hace falta hacer nada más.
              </li>
            </ol>
          </div>
        )}
      </section>

      <button
        type="submit"
        disabled={busy}
        className="flex items-center gap-2 rounded-control bg-primary px-5 py-2.5 text-sm font-medium text-on-primary transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        <FloppyDisk size={16} weight="bold" />
        {busy ? "Guardando…" : "Guardar contenido"}
      </button>
    </form>
  );
}
