"use client";

import { useRef, useState } from "react";
import { Upload, X, ImageSquare } from "@phosphor-icons/react/dist/ssr";

const MAX_BYTES = 900_000; // ~900 KB (viaja como data URL dentro del registro)

/**
 * Campo de imagen para el panel: permite SUBIR un archivo (se guarda como data
 * URL) o pegar un enlace. No hay almacenamiento de archivos en este entorno, así
 * que la imagen vive en el propio registro (banner, combo…), igual que el
 * comprobante de las reservas.
 */
export function ImageField({
  label,
  value,
  onChange,
  hint,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  hint?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [reading, setReading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFile = async (file: File | undefined) => {
    setError(null);
    if (!file) return;
    if (!/^image\/(png|jpe?g|webp|gif|avif)$/i.test(file.type)) {
      setError("El archivo debe ser una imagen (JPG, PNG, WEBP, AVIF o GIF).");
      return;
    }
    if (file.size > MAX_BYTES) {
      setError("La imagen no puede superar ~900 KB. Comprimila o pegá un enlace.");
      return;
    }
    setReading(true);
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(new Error("No pudimos leer la imagen."));
        reader.readAsDataURL(file);
      });
      onChange(dataUrl);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No pudimos leer la imagen.");
    } finally {
      setReading(false);
    }
  };

  const preview = value.startsWith("data:image/") || /^https?:\/\//i.test(value);

  return (
    <div className="block">
      <span className="text-xs font-medium text-muted">{label}</span>

      <div className="mt-1.5 flex flex-wrap items-start gap-3">
        <div className="flex h-20 w-28 shrink-0 items-center justify-center overflow-hidden rounded-control border border-line bg-bg">
          {preview ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={value} alt="Vista previa" className="h-full w-full object-cover" />
          ) : (
            <ImageSquare size={22} weight="duotone" className="text-muted" />
          )}
        </div>

        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <input
              ref={inputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/avif,image/gif"
              className="sr-only"
              onChange={(e) => handleFile(e.target.files?.[0])}
            />
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={reading}
              className="inline-flex items-center gap-2 rounded-control border border-line px-3 py-2 text-sm text-ink transition-colors hover:border-primary hover:text-primary disabled:opacity-50"
            >
              <Upload size={16} weight="duotone" />
              {reading ? "Leyendo…" : "Subir archivo"}
            </button>
            {value && (
              <button
                type="button"
                onClick={() => {
                  onChange("");
                  setError(null);
                  if (inputRef.current) inputRef.current.value = "";
                }}
                className="inline-flex items-center gap-1.5 rounded-control border border-line px-3 py-2 text-sm text-muted transition-colors hover:border-danger hover:text-danger"
              >
                <X size={14} /> Quitar
              </button>
            )}
          </div>

          <input
            value={value.startsWith("data:") ? "" : value}
            onChange={(e) => {
              setError(null);
              onChange(e.target.value.trim());
            }}
            placeholder="…o pegá un enlace https://…"
            className="w-full rounded-control border border-line bg-bg px-3 py-2 text-sm text-ink placeholder:text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
          />
          {value.startsWith("data:") && (
            <p className="text-[11px] text-muted">Imagen subida desde tu equipo.</p>
          )}
        </div>
      </div>

      {(error || hint) && (
        <p className={`mt-1.5 text-[11px] ${error ? "text-danger" : "text-muted"}`}>
          {error ?? hint}
        </p>
      )}
    </div>
  );
}
