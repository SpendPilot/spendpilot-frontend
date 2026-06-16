import { NextResponse } from "next/server";

function escapeScriptValue(value: string) {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e");
}

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const runtimeConfig = {
    apiBaseUrl: process.env.NEXT_PUBLIC_API_BASE_URL || "/api",
    authMode: process.env.NEXT_PUBLIC_AUTH_MODE || "entra",
    entraFrontendClientId: process.env.NEXT_PUBLIC_ENTRA_FRONTEND_CLIENT_ID || "",
    entraBackendClientId: process.env.NEXT_PUBLIC_ENTRA_BACKEND_CLIENT_ID || "",
    entraBackendAudience: process.env.NEXT_PUBLIC_ENTRA_BACKEND_AUDIENCE || "",
    entraApiScope: process.env.NEXT_PUBLIC_ENTRA_API_SCOPE || "",
    entraAuthority: process.env.NEXT_PUBLIC_ENTRA_AUTHORITY || "",
  };

  const body = `window.__APP_CONFIG__ = ${JSON.stringify(runtimeConfig, (_key, value) =>
    typeof value === "string" ? escapeScriptValue(value) : value,
  )};`;

  return new NextResponse(body, {
    headers: {
      "Content-Type": "application/javascript; charset=utf-8",
      "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
      Pragma: "no-cache",
      Expires: "0",
    },
  });
}
