import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: [
    "@prisma/client",
    ".prisma/client",
    "@prisma/adapter-d1",
    "jose",
    "pdfkit",
    "fontkit",
    "web-push",
  ],
  images: {
    unoptimized: true,
  },
  outputFileTracingRoot: process.cwd(),
};

if (process.env.NODE_ENV !== "production") {
  initOpenNextCloudflareForDev();
}

export default nextConfig;
