/** @type {import('next').NextConfig} */

/**
 * Cabeceras de seguridad para endurecer la web ante ataques comunes:
 * clickjacking, sniffing de tipo, fugas de referrer, permisos del navegador y
 * una CSP que permite lo que la app realmente usa (fuentes de Google, tiles de
 * mapas, imágenes por URL y datos embebidos) sin abrirla de más.
 */
const isDev = process.env.NODE_ENV !== "production";

const csp = [
  "default-src 'self'",
  // Next en dev necesita eval; en producción no.
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com data:",
  "img-src 'self' data: blob: https:",
  "connect-src 'self' https:",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-DNS-Prefetch-Control", value: "on" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(self)" },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
];

const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  images: {
    // Las fotos del catálogo, ofertas y banners se cargan por URL desde
    // administración, así que pueden venir de cualquier sitio https.
    remotePatterns: [
      { protocol: "https", hostname: "**" },
      { protocol: "http", hostname: "localhost" },
    ],
  },
  experimental: {
    // PDFKit lee sus fuentes (.afm) desde disco en tiempo de ejecución; si el
    // bundler lo empaqueta no las encuentra y el PDF falla con ENOENT.
    // Dejándolo como paquete externo se carga desde node_modules y funciona.
    serverComponentsExternalPackages: ["pdfkit"],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

module.exports = nextConfig;
