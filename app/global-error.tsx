"use client";

import "./globals.css";

/**
 * Último recurso: si falla el propio layout raíz (por ejemplo al hidratar),
 * Next muestra una pantalla en blanco. Acá dibujamos algo legible con los
 * estilos de la marca.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="es">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#f6f1e9",
          color: "#221b18",
          fontFamily: "ui-sans-serif, system-ui, sans-serif",
          padding: "24px",
        }}
      >
        <div style={{ maxWidth: 520 }}>
          <p
            style={{
              fontSize: 11,
              letterSpacing: "0.28em",
              textTransform: "uppercase",
              opacity: 0.6,
              margin: 0,
            }}
          >
            Mist &amp; Mood
          </p>
          <h1 style={{ fontSize: 28, margin: "12px 0 0", lineHeight: 1.2 }}>
            No pudimos cargar la tienda
          </h1>
          <p style={{ fontSize: 15, lineHeight: 1.6, opacity: 0.75 }}>
            Es un problema momentáneo de la página. Recargá o volvé en un rato:
            tus reservas y tus datos no se pierden.
          </p>
          <button
            type="button"
            onClick={reset}
            style={{
              marginTop: 20,
              border: 0,
              borderRadius: 10,
              padding: "10px 20px",
              fontSize: 14,
              background: "#7a2b3a",
              color: "#fdf9f4",
              cursor: "pointer",
            }}
          >
            Reintentar
          </button>
          <p style={{ marginTop: 16, fontSize: 12, opacity: 0.5 }}>
            {error?.message ?? "Error desconocido"}
          </p>
        </div>
      </body>
    </html>
  );
}
