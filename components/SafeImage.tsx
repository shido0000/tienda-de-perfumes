"use client";

import { useEffect, useState } from "react";
import type { ImgHTMLAttributes } from "react";

/**
 * Resuelve una ruta propia de la app (`/api/img/...`, `/api/logo`, `/icons/...`)
 * contra la base real bajo la que se está sirviendo el documento.
 *
 * - En producción (dominio raíz) la base es "" y la ruta queda tal cual.
 * - Detrás del proxy de vista previa, la página vive en algo como
 *   `/api/v1/workspaces/<ws>/preview/3000/producto/xxx`. Ahí una ruta que
 *   empieza con "/" se resolvería contra el dominio raíz y daría 404. Recortamos
 *   la parte de la ruta que corresponde a la URL de la página para obtener el
 *   prefijo y lo anteponemos.
 *
 * La función es segura en el servidor (SSR): si no hay `window`, devuelve la
 * ruta intacta, que es lo que el proxy ya reescribe en el HTML del servidor.
 */
export function resolveAssetUrl(src: string | undefined | null): string {
  if (!src) return "";
  // Ya es absoluta (http/https/data/blob) o no es una ruta propia: no tocar.
  if (/^(?:[a-z]+:)?\/\//i.test(src) || src.startsWith("data:") || src.startsWith("blob:")) {
    return src;
  }
  if (typeof window === "undefined" || !src.startsWith("/")) {
    return src;
  }

  const path = window.location.pathname;
  // Busca la parte "/.../preview/<puerto>/" del proxy y toma todo hasta el puerto.
  const m = path.match(/^(.*?preview\/\d+)\//i);
  if (m) {
    return `${m[1]}${src}`;
  }
  // Sin prefijo de proxy: dominio raíz.
  return src;
}

type SafeImageProps = ImgHTMLAttributes<HTMLImageElement> & { src: string };

/**
 * <img> que resuelve las rutas propias de la app contra la base correcta y
 * reintenta una vez si la primera carga falla (útil durante la hidratación).
 */
export function SafeImage({ src, alt = "", onError, ...rest }: SafeImageProps) {
  const [resolved, setResolved] = useState(src);

  useEffect(() => {
    setResolved(resolveAssetUrl(src));
  }, [src]);

  return (
    <img
      {...rest}
      src={resolved || src}
      alt={alt}
      onError={(e) => {
        // Un segundo intento por si la base cambió entre SSR e hidratación.
        const retry = resolveAssetUrl(src);
        if (retry && e.currentTarget.src !== retry) {
          e.currentTarget.src = retry;
        }
        onError?.(e);
      }}
    />
  );
}
