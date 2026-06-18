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
        <section className="panel panel-grid relative overflow-hidden p-10 sm:p-12">
          <div aria-hidden="true" className="absolute inset-0 bg-[linear-gradient(135deg,rgba(32,95,70,0.10),transparent_58%,rgba(191,109,52,0.08))]" />
          <div className="relative space-y-6">
            <span className="badge-tonal">
              <CheckCircle2 className="h-4 w-4" />
              One last step before entering your workspace
            </span>
            <div className="space-y-4">
              <h1 className="font-display text-5xl leading-tight tracking-tight text-slate-950 dark:text-white">
                Choose your department
              </h1>
              <p className="max-w-2xl text-lg text-[rgb(var(--muted-strong))]">
                Your department shapes approval routing, budget visibility, and the work queue you see after sign-in. You can be reassigned later
                by your organization owner.
              </p>
            </div>
          </div>
        </section>

        <section className="panel p-8 sm:p-10">
          <div className="mb-6">
            <p className="section-kicker">Onboarding</p>
            <h2 className="mt-2 font-display text-3xl tracking-tight">Department selection</h2>
            <p className="mt-3 text-sm text-[rgb(var(--muted-strong))]">
              Signed in as {profile?.user.display_name}. Your role remains <strong>{profile?.effective_role}</strong>.
            </p>
          </div>

          <form className="space-y-4" onSubmit={handleSubmit}>
            {departments.map((department) => {
              const active = department.id === selectedDepartmentId;
              return (
                <label
                  key={department.id}
                  className={`block cursor-pointer rounded-[26px] border p-5 transition ${
                    active
                      ? "border-[rgba(var(--primary),0.22)] bg-[rgb(var(--primary-soft))] shadow-[0_16px_36px_rgba(32,95,70,0.10)]"
                      : "bg-[rgba(var(--panel),0.86)]"
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
                    <div className="rounded-2xl bg-[rgba(var(--primary),0.12)] p-3 text-[rgb(var(--primary-strong))]">
                      <Building2 className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="font-medium text-slate-950 dark:text-white">{department.name}</div>
                      <div className="mt-1 text-sm text-[rgb(var(--muted-strong))]">
                        {department.description || "Department workspace"}
                      </div>
                    </div>
                  </div>
                </label>
              );
            })}

            {error ? (
              <div className="rounded-[22px] border border-[rgba(var(--danger),0.25)] bg-[rgba(var(--danger-soft),0.92)] px-4 py-3 text-sm text-[rgb(var(--danger))]">
                {error}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={!selectedDepartmentId || submitting}
              className="btn-primary w-full"
            >
              {submitting ? "Saving department..." : "Continue to workspace"}
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}
