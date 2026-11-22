// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ["@prisma/client", ".prisma/client"],
  // ... aquí va el resto de tu configuración actual (si tienes alguna)
};

module.exports = nextConfig;