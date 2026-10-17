export function siteOriginFromEnv(): string | null {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (!configured) return null;
  return configured.replace(/\/$/, "");
}

export function siteOriginInBrowser(): string {
  if (typeof window !== "undefined") {
    return window.location.origin;
  }
  return siteOriginFromEnv() ?? "http://localhost:3000";
}
