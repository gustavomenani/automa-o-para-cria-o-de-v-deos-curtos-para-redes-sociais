import { toPublicFileUrl } from "@/lib/paths";

function stripTrailingSlash(value: string) {
  return value.replace(/\/+$/, "");
}

function isLocalHost(hostname: string) {
  return (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "::1" ||
    hostname.endsWith(".local")
  );
}

export function isPublicInternetBaseUrl(value: string) {
  try {
    const url = new URL(value);
    return (url.protocol === "https:" || url.protocol === "http:") && !isLocalHost(url.hostname);
  } catch {
    return false;
  }
}

export function getExternalMediaBaseUrl() {
  const configuredBaseUrl =
    process.env.PUBLIC_MEDIA_BASE_URL?.trim() || process.env.APP_BASE_URL?.trim() || "";

  if (!configuredBaseUrl || !isPublicInternetBaseUrl(configuredBaseUrl)) {
    throw new Error(
      "PUBLIC_MEDIA_BASE_URL precisa apontar para uma URL publica para Instagram e TikTok acessarem o video.",
    );
  }

  return stripTrailingSlash(configuredBaseUrl);
}

export function getExternallyReachableFileUrl(filePath: string) {
  const baseUrl = getExternalMediaBaseUrl();
  return `${baseUrl}${toPublicFileUrl(filePath)}`;
}
