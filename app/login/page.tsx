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
        <section className="panel panel-grid relative overflow-hidden p-10 sm:p-12">
          <div aria-hidden="true" className="absolute inset-0 bg-[linear-gradient(140deg,rgba(32,95,70,0.10),transparent_55%,rgba(191,109,52,0.08))]" />
          <div className="relative space-y-6">
            <span className="badge-tonal">
              <ShieldCheck className="h-4 w-4" />
              Secure workspace sign-in
            </span>
            <div className="space-y-4">
              <h1 className="font-display text-5xl leading-tight tracking-tight text-slate-950 dark:text-white">
                Spend Control Platform
              </h1>
              <p className="max-w-2xl text-lg text-[rgb(var(--muted-strong))]">
                Enter the finance workspace to review budgets, submit expenses, process approvals, and continue document-led workflows.
              </p>
            </div>
          </div>
        </section>
        <section className="panel p-8 sm:p-10">
          <div className="mb-8">
            <p className="section-kicker">Access</p>
            <h2 className="mt-2 font-display text-3xl tracking-tight">
              {authMode === "dev-local" ? "Enter local development mode" : "Sign in with Microsoft"}
            </h2>
          </div>

          <div className="space-y-4">
            <button
              type="button"
              onClick={() => void login()}
              className="btn-primary w-full"
            >
              {authMode === "dev-local" ? "Use local developer profile" : "Continue with Microsoft"}
              <ArrowRight className="h-4 w-4" />
            </button>

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
                className="btn-secondary w-full"
              >
                  Seed an organization owner session
              </button>
            ) : null}
          </div>

          {error ? (
            <div className="mt-6 rounded-[22px] border border-[rgba(var(--danger),0.25)] bg-[rgba(var(--danger-soft),0.92)] px-4 py-3 text-sm text-[rgb(var(--danger))]">
              {error}
              {adminConsentUrl ? (
                <div className="mt-3 text-xs text-[rgb(var(--danger))]">
                  This tenant has not finished onboarding the app yet. A tenant admin can complete consent here:{" "}
                  <a className="underline" href={adminConsentUrl}>
                    grant tenant consent
                  </a>
                </div>
              ) : null}
            </div>
          ) : null}

          <div className="panel-soft mt-8 rounded-[24px] p-4 text-sm text-[rgb(var(--muted-strong))]">
            Auth mode:
            <div className="mt-2 font-medium">{authMode}</div>
            {authMode !== "dev-local" ? (
              <div className="mt-3 text-xs text-[rgb(var(--muted))]">
                Real organization tenants share one workspace by tenant. Guest and external users in that tenant join the same workspace. Standalone Microsoft accounts get a private workspace of their own.
              </div>
            ) : null}
          </div>
        </section>
      </div>
    </main>
  );
}
