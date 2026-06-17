"use client";

import { useEffect } from "react";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";

import { useAuth } from "@/components/auth-provider";
import { getRuntimeConfig } from "@/lib/runtime-config";

function buildAdminConsentUrl(error: string) {
  const tenantMatch = error.match(/organization '([^']+)'/i);
  const tenant = tenantMatch?.[1];
  if (!tenant) return null;

  const runtimeConfig = getRuntimeConfig();
  const clientId = runtimeConfig.entraFrontendClientId;
  const scope = runtimeConfig.entraBackendAudience ? `${runtimeConfig.entraBackendAudience}/.default` : "";
  if (!clientId || !scope || typeof window === "undefined") return null;

  const redirectUri = `${window.location.origin}/login`;
  return `https://login.microsoftonline.com/${encodeURIComponent(tenant)}/v2.0/adminconsent?client_id=${encodeURIComponent(clientId)}&scope=${encodeURIComponent(scope)}&redirect_uri=${encodeURIComponent(redirectUri)}`;
}

export default function LoginPage() {
  const router = useRouter();
  const { authMode, error, login, devLogin, profile, ready, token } = useAuth();
  const adminConsentUrl = error?.includes("AADSTS650052") ? buildAdminConsentUrl(error) : null;

  useEffect(() => {
    if (ready && token) {
      const needsOnboarding = profile?.effective_role === "employee" && !profile.membership.onboarding_completed;
      router.push(needsOnboarding ? "/onboarding" : "/dashboard");
    }
  }, [profile, ready, token, router]);

  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-12">
      <div className="grid w-full max-w-6xl gap-8 lg:grid-cols-[1.15fr_0.85fr]">
        <section className="panel panel-grid relative overflow-hidden p-10">
          <div className="absolute inset-0 bg-gradient-to-br from-sky-500/10 via-transparent to-orange-500/10" />
          <div className="relative space-y-6">
            <span className="inline-flex items-center gap-2 rounded-full border border-sky-400/30 bg-sky-500/10 px-4 py-2 text-sm font-medium text-sky-700 dark:text-sky-200">
              <ShieldCheck className="h-4 w-4" />
              Microsoft Entra ID with Azure finance workflows and AI document extraction
            </span>
            <div className="space-y-4">
              <h1 className="font-display text-5xl leading-tight text-slate-950 dark:text-white">
                Spend Control Platform
              </h1>
              <p className="max-w-2xl text-lg text-slate-600 dark:text-slate-300">
                One finance workspace for budgets, expenses, approvals, and invoice intelligence without backend sprawl.
              </p>
            </div>
          </div>
        </section>
        <section className="panel p-8">
          <div className="mb-8">
            <p className="text-sm uppercase tracking-[0.3em] text-slate-400">Access</p>
            <h2 className="mt-2 font-display text-3xl">
              {authMode === "dev-local" ? "Enter local development mode" : "Sign in with Microsoft"}
            </h2>
          </div>

          <div className="space-y-4">
            <button
              type="button"
              onClick={() => void login("workforce")}
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 font-medium text-white transition hover:bg-sky-600 dark:bg-white dark:text-slate-950"
            >
              {authMode === "dev-local" ? "Use local developer profile" : "Continue with Work Account"}
              <ArrowRight className="h-4 w-4" />
            </button>

            {authMode !== "dev-local" ? (
              <button
                type="button"
                onClick={() => void login("personal")}
                className="inline-flex w-full items-center justify-center rounded-2xl border border-slate-300 px-4 py-3 text-sm font-medium dark:border-slate-700"
              >
                Continue with Personal Microsoft Account
              </button>
            ) : null}

            {authMode === "dev-local" ? (
              <button
                type="button"
                onClick={() =>
                  void devLogin({
                    email: "reviewer@local.test",
                    display_name: "Local Reviewer",
                    role: "org_owner",
                  }).then(() => router.push("/dashboard"))
                }
                className="inline-flex w-full items-center justify-center rounded-2xl border border-slate-300 px-4 py-3 text-sm font-medium dark:border-slate-700"
              >
                  Seed an organization owner session
              </button>
            ) : null}
          </div>

          {error ? (
            <div className="mt-6 rounded-2xl border border-rose-300 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200">
              {error}
              {adminConsentUrl ? (
                <div className="mt-3 text-xs text-rose-800 dark:text-rose-100">
                  This tenant has not finished onboarding the app yet. A tenant admin can complete consent here:{" "}
                  <a className="underline" href={adminConsentUrl}>
                    grant tenant consent
                  </a>
                </div>
              ) : null}
            </div>
          ) : null}

          <div className="mt-8 rounded-2xl bg-slate-100 p-4 text-sm text-slate-600 dark:bg-slate-800/70 dark:text-slate-300">
            Auth mode:
            <div className="mt-2 font-medium">{authMode}</div>
            {authMode !== "dev-local" ? (
              <div className="mt-3 text-xs text-slate-500 dark:text-slate-400">
                Use the work-account flow for company workspace onboarding. The personal-account flow is only for intentional personal workspace access.
              </div>
            ) : null}
          </div>
        </section>
      </div>
    </main>
  );
}
