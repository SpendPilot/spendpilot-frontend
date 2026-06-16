export type RuntimeConfig = {
  apiBaseUrl: string;
  authMode: "entra" | "dev-local";
  entraFrontendClientId: string;
  entraBackendClientId: string;
  entraBackendAudience: string;
  entraApiScope: string;
  entraAuthority: string;
};

declare global {
  interface Window {
    __APP_CONFIG__?: RuntimeConfig;
  }
}

export function getRuntimeConfig(): RuntimeConfig {
  if (typeof window !== "undefined" && window.__APP_CONFIG__) {
    return window.__APP_CONFIG__;
  }

  return {
    apiBaseUrl: process.env.NEXT_PUBLIC_API_BASE_URL?.trim() || "/api",
    authMode: (process.env.NEXT_PUBLIC_AUTH_MODE?.trim() || "entra") as "entra" | "dev-local",
    entraFrontendClientId: process.env.NEXT_PUBLIC_ENTRA_FRONTEND_CLIENT_ID?.trim() || "",
    entraBackendClientId: process.env.NEXT_PUBLIC_ENTRA_BACKEND_CLIENT_ID?.trim() || "",
    entraBackendAudience: process.env.NEXT_PUBLIC_ENTRA_BACKEND_AUDIENCE?.trim() || "",
    entraApiScope: process.env.NEXT_PUBLIC_ENTRA_API_SCOPE?.trim() || "",
    entraAuthority: process.env.NEXT_PUBLIC_ENTRA_AUTHORITY?.trim() || "",
  };
}
