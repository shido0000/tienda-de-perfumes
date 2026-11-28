import { createHash, randomBytes } from "node:crypto";
import { getSettings } from "./settings";

export function createPasswordResetToken(): { token: string; tokenHash: string } {
  const token = randomBytes(32).toString("base64url");
  return { token, tokenHash: hashPasswordResetToken(token) };
}

export function hashPasswordResetToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function getCanonicalSiteUrl(): Promise<string> {
  const settings = await getSettings().catch(() => null);
  const raw = settings?.siteUrl?.trim() || process.env.NEXT_PUBLIC_SITE_URL?.trim() || "";
  if (!raw) return "";

  const url = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
  const local = /^(localhost|127\.0\.0\.1|\[::1\])$/i.test(url.hostname);
  if (url.protocol !== "https:" && !local) return "";
  return url.origin;
}
