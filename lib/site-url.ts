export function getSiteUrl(requestUrl?: URL) {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();

  if (configured) {
    return configured.replace(/\/$/, "");
  }

  if (requestUrl) {
    return requestUrl.origin;
  }

  return "http://localhost:3000";
}
