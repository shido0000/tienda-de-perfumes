"use client";

import { useState } from "react";
import { Eye, EyeSlash } from "@phosphor-icons/react/dist/ssr";

/**
 * Campo de contraseña con el ojo para mostrar/ocultar lo escrito.
 *
 * Se usa en login, registro y cambio de contraseña, para que el usuario pueda
 * revisar lo que tecleó antes de enviar (en el móvil es donde más se agradece).
 */
export function PasswordField({
  id,
  label,
  value,
  onChange,
  autoComplete,
  required = true,
  minLength,
  hint,
  className = "",
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete?: string;
  required?: boolean;
  minLength?: number;
  hint?: string;
  /** Clases del propio input (para que combine con el formulario que lo usa). */
  className?: string;
}) {
  const [visible, setVisible] = useState(false);

  return (
    <div>
      <label htmlFor={id} className="text-xs uppercase tracking-[0.14em] text-muted">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={visible ? "text" : "password"}
          required={required}
          minLength={minLength}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete={autoComplete}
          className={`pr-11 ${className}`}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? "Ocultar contraseña" : "Mostrar contraseña"}
          aria-pressed={visible}
          title={visible ? "Ocultar contraseña" : "Mostrar contraseña"}
          className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-muted transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
        >
          {visible ? <EyeSlash size={18} /> : <Eye size={18} />}
        </button>
      </div>
      {hint && <p className="mt-1.5 text-xs text-muted">{hint}</p>}
    </div>
  );
}
