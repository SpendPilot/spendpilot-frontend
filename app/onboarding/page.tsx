"use client";

import { useEffect, useState } from "react";
import { Building2, CheckCircle2 } from "lucide-react";
import { useRouter } from "next/navigation";

import { useAuth } from "@/components/auth-provider";
import { apiFetch, getApiError } from "@/lib/api";

type Department = {
  id: string;
  name: string;
  description?: string | null;
};

export default function OnboardingPage() {
  const router = useRouter();
  const { profile, ready, refreshProfile, token } = useAuth();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (ready && !token) {
      router.push("/login");
    }
  }, [ready, router, token]);

  useEffect(() => {
    if (ready && token && profile?.membership.onboarding_completed) {
      router.push("/dashboard");
    }
  }, [profile, ready, router, token]);

  useEffect(() => {
    if (!token) return;
    apiFetch<Department[]>("/api/auth/departments", { token })
      .then((items) => {
        setDepartments(items);
        if (items[0]) {
          setSelectedDepartmentId(items[0].id);
        }
      })
      .catch((err) => setError(getApiError(err)))
      .finally(() => setLoading(false));
  }, [token]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token || !selectedDepartmentId) return;

    setSubmitting(true);
    setError(null);
    try {
      await apiFetch("/api/auth/onboarding/department", {
        method: "POST",
        token,
        body: JSON.stringify({ department_id: selectedDepartmentId }),
      });
      await refreshProfile();
      router.push("/dashboard");
    } catch (nextError) {
      setError(getApiError(nextError));
    } finally {
      setSubmitting(false);
    }
  }

  if (!ready || !token || loading) {
    return null;
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-12">
      <div className="grid w-full max-w-5xl gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="panel panel-grid relative overflow-hidden p-10">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 via-transparent to-sky-500/10" />
          <div className="relative space-y-6">
            <span className="inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-500/10 px-4 py-2 text-sm font-medium text-emerald-700 dark:text-emerald-200">
              <CheckCircle2 className="h-4 w-4" />
              One last step before entering your workspace
            </span>
            <div className="space-y-4">
              <h1 className="font-display text-5xl leading-tight text-slate-950 dark:text-white">
                Choose your department
              </h1>
              <p className="max-w-2xl text-lg text-slate-600 dark:text-slate-300">
                SpendPilot uses your department to scope approvals, budgets, and visibility. You can be reassigned later
                by your organization owner.
              </p>
            </div>
          </div>
        </section>

        <section className="panel p-8">
          <div className="mb-6">
            <p className="text-sm uppercase tracking-[0.3em] text-slate-400">Onboarding</p>
            <h2 className="mt-2 font-display text-3xl">Department selection</h2>
            <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
              Signed in as {profile?.user.display_name}. Your role remains <strong>{profile?.effective_role}</strong>.
            </p>
          </div>

          <form className="space-y-4" onSubmit={handleSubmit}>
            {departments.map((department) => {
              const active = department.id === selectedDepartmentId;
              return (
                <label
                  key={department.id}
                  className={`block cursor-pointer rounded-3xl border p-5 transition ${
                    active
                      ? "border-emerald-500 bg-emerald-500/10 shadow-lg shadow-emerald-500/10"
                      : "border-slate-200 bg-white/80 dark:border-slate-800 dark:bg-slate-900/70"
                  }`}
                >
                  <input
                    type="radio"
                    name="department"
                    value={department.id}
                    checked={active}
                    onChange={() => setSelectedDepartmentId(department.id)}
                    className="sr-only"
                  />
                  <div className="flex items-start gap-3">
                    <div className="rounded-2xl bg-slate-950/5 p-3 dark:bg-white/5">
                      <Building2 className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="font-medium text-slate-950 dark:text-white">{department.name}</div>
                      <div className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                        {department.description || "Department workspace"}
                      </div>
                    </div>
                  </div>
                </label>
              );
            })}

            {error ? (
              <div className="rounded-2xl border border-rose-300 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200">
                {error}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={!selectedDepartmentId || submitting}
              className="inline-flex w-full items-center justify-center rounded-2xl bg-slate-950 px-4 py-3 font-medium text-white transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white dark:text-slate-950"
            >
              {submitting ? "Saving department..." : "Continue to workspace"}
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}
