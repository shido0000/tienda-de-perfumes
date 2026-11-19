"use client";

import { useState } from "react";
import { Eye, EyeSlash } from "@phosphor-icons/react/dist/ssr";

/**
 * Campo de contraseña con el ojo para mostrar/ocultar lo escrito.
 *
 * Se usa en login, registro y cambio de contraseña, para que el usuario pueda
 * revisar lo que tecleó antes de enviar (en el móvil es donde más se agradece).
 *
 * `required` es opcional y por defecto vale `false`: en formularios donde la
 * contraseña es solo una parte (por ejemplo "Mi perfil", donde se pueden
 * cambiar nombre y teléfono sin tocarla) el navegador NO debe bloquear el
 * guardado pidiendo este campo.
 */
export function PasswordField({
  id,
  label,
  value,
  onChange,
  autoComplete,
  minLength,
  hint,
  className,
  required = false,
  disabled = false,
  placeholder,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete?: string;
  minLength?: number;
  hint?: string;
  className?: string;
  required?: boolean;
  disabled?: boolean;
  placeholder?: string;
}) {
  const [visible, setVisible] = useState(false);

  return (
    <label className="mt-4 block" htmlFor={id}>
      <span className="text-xs uppercase tracking-[0.14em] text-muted">{label}</span>
      <div className="relative mt-1.5">
        <input
          id={id}
          type={visible ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete={autoComplete}
          minLength={minLength}
          required={required}
          disabled={disabled}
          placeholder={placeholder}
          className={`${className ?? ""} pr-11`}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? "Ocultar contraseña" : "Mostrar contraseña"}
          aria-pressed={visible}
          tabIndex={-1}
          className="absolute right-1 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-control text-muted transition-colors hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
        >
          {visible ? <EyeSlash size={18} /> : <Eye size={18} />}
        </button>
      </div>
      {hint && <span className="mt-1 block text-xs text-muted">{hint}</span>}
    </label>
  );
}
