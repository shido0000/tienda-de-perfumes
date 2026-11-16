"use client";

import { useRef, useState } from "react";
import { Upload, X, CheckCircle } from "@phosphor-icons/react/dist/ssr";

const MAX_BYTES = 2 * 1024 * 1024; // 2 MB

/**
 * Comprobante de la transferencia: el cliente sube la imagen del archivo o
 * pega un enlace. Se envía al servidor como data URL (o URL) dentro de la
 * reserva — no hay almacenamiento de archivos en este entorno, así que la
 * imagen vive con la reserva.
 */
export function TransferProofField({
  value,
  onChange,
  error,
}: {
  value: string;
  onChange: (value: string) => void;
  error?: string | null;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [reading, setReading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const handleFile = async (file: File | undefined) => {
    setLocalError(null);
    if (!file) return;
    if (!/^image\/(png|jpe?g|webp|gif)$/i.test(file.type)) {
      setLocalError("El comprobante debe ser una imagen (JPG, PNG, WEBP o GIF).");
      return;
    }
    if (file.size > MAX_BYTES) {
      setLocalError("La imagen no puede superar 2 MB. Comprimila o pegá un enlace.");
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
      setLocalError(e instanceof Error ? e.message : "No pudimos leer la imagen.");
    } finally {
      setReading(false);
    }
  };

  const shown = localError ?? error ?? null;
  const isImage = value.startsWith("data:image/") || /^https?:\/\//i.test(value);

  return (
    <div className="mt-4 rounded-card border border-line bg-surface p-4">
      <p className="text-xs uppercase tracking-[0.14em] text-muted">
        Comprobante de la transferencia · obligatorio
      </p>
      <p className="mt-1.5 text-xs leading-relaxed text-muted">
        Hacé la transferencia con los datos de arriba y adjuntá la imagen del
        comprobante. Sin él la reserva no se registra.
      </p>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          className="sr-only"
          onChange={(e) => handleFile(e.target.files?.[0])}
        />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={reading}
          className="flex items-center gap-2 rounded-control border border-line px-3 py-2 text-sm text-ink transition-colors hover:border-primary hover:text-primary disabled:opacity-50"
        >
          <Upload size={16} weight="duotone" />
          {reading ? "Leyendo…" : "Subir imagen"}
        </button>
        {value && (
          <button
            type="button"
            onClick={() => {
              onChange("");
              setLocalError(null);
              if (inputRef.current) inputRef.current.value = "";
            }}
            className="flex items-center gap-1.5 rounded-control border border-line px-3 py-2 text-sm text-muted transition-colors hover:border-danger hover:text-danger"
          >
            <X size={14} /> Quitar
          </button>
        )}
      </div>

      <details className="mt-3">
        <summary className="cursor-pointer text-xs text-muted hover:text-ink">
          O pegá un enlace a la imagen
        </summary>
        <input
          value={value.startsWith("data:") ? "" : value}
          onChange={(e) => {
            setLocalError(null);
            onChange(e.target.value.trim());
          }}
          placeholder="https://…/comprobante.jpg"
          className="mt-2 w-full rounded-control border border-line bg-bg px-3 py-2 text-sm text-ink placeholder:text-muted focus-visible:outline-none"
        />
      </details>

      {isImage && value && (
        <div className="mt-3 flex items-center gap-3 rounded-control border border-line bg-bg p-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={value}
            alt="Vista previa del comprobante"
            className="h-16 w-16 rounded object-cover"
          />
          <span className="flex items-center gap-1.5 text-xs text-ink">
            <CheckCircle size={16} weight="fill" className="text-primary" />
            Comprobante adjunto
          </span>
        </div>
      )}

      {shown && (
        <p role="alert" className="mt-2 text-xs text-danger">
          {shown}
        </p>
      )}
    </div>
  );
}
