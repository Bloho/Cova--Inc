export function getSiteUrl(requestUrl?: URL) {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  const requestOrigin = requestUrl?.origin;

  if (requestOrigin && !isLocalhost(requestOrigin)) {
    return requestOrigin.replace(/\/$/, "");
  }

  if (configured) {
    return configured.replace(/\/$/, "");
  }

  if (requestOrigin) {
    return requestOrigin;
  }

  return "http://localhost:3000";
}

function isLocalhost(url: string) {
  return url.includes("localhost") || url.includes("127.0.0.1") || url.includes("[::1]");
}
