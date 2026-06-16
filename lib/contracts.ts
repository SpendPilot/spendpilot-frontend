function normalizeBaseUrl(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";
  return trimmed === "/" ? "" : trimmed.replace(/\/+$/, "");
}

function normalizePath(value: string): string {
  if (/^https?:\/\//i.test(value)) return value;
  const withLeadingSlash = value.startsWith("/") ? value : `/${value}`;
  return withLeadingSlash.replace(/\/{2,}/g, "/");
}

export function buildApiUrl(path: string): string {
  const configuredBase =
    typeof window !== "undefined" && window.__APP_CONFIG__
      ? window.__APP_CONFIG__.apiBaseUrl
      : process.env.NEXT_PUBLIC_API_BASE_URL?.trim() || "";
  const base = normalizeBaseUrl(configuredBase);
  const normalizedPath = normalizePath(path);

  if (/^https?:\/\//i.test(normalizedPath)) {
    return normalizedPath;
  }

  if (!base) {
    return normalizedPath;
  }

  if (normalizedPath === base || normalizedPath.startsWith(`${base}/`)) {
    return normalizedPath;
  }

  return `${base}${normalizedPath}`;
}

