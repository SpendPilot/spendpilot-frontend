import { buildApiUrl } from "@/lib/contracts";

async function readErrorMessage(response: Response, fallback: string): Promise<string> {
  const contentType = response.headers.get("content-type") || "";
  const body = await response.text();

  if (contentType.includes("application/json")) {
    try {
      const payload = JSON.parse(body) as { detail?: string; message?: string };
      return payload.detail || payload.message || fallback;
    } catch {
      return fallback;
    }
  }

  if (contentType.includes("text/html")) {
    return fallback;
  }

  return body.trim() || fallback;
}

export async function apiFetch<T = any>(
  path: string,
  init?: RequestInit & { token?: string | null },
): Promise<T> {
  const isFormData = typeof FormData !== "undefined" && init?.body instanceof FormData;
  const response = await fetch(buildApiUrl(path), {
    ...init,
    headers: {
      ...(isFormData ? {} : { "Content-Type": "application/json" }),
      ...(init?.token ? { Authorization: `Bearer ${init.token}` } : {}),
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(await readErrorMessage(response, `Request failed with status ${response.status}.`));
  }

  const payload = await response.json();
  return payload.data as T;
}

export function getApiError(error: unknown): string {
  if (error instanceof Error) return error.message;
  return "Unexpected API error";
}

export { readErrorMessage };
