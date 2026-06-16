"use client";

import { useEffect, useState } from "react";

import { AppShell } from "@/components/app-shell";
import { EmptyState, ErrorState, LoadingState, PageHeader } from "@/components/ui";
import { useAuth } from "@/components/auth-provider";
import { apiFetch, getApiError } from "@/lib/api";

type SpendLimit = {
  id: string;
  category?: string | null;
  max_single_expense_amount?: number | null;
  monthly_limit?: number | null;
  requires_approval_above_amount?: number | null;
  active: boolean;
  department?: { name: string } | null;
};

export default function SpendLimitsPage() {
  const { token, profile } = useAuth();
  const [items, setItems] = useState<SpendLimit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    apiFetch<SpendLimit[]>("/api/finance/spend-limits", { token })
      .then(setItems)
      .catch((err) => setError(getApiError(err)))
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) return <LoadingState label="Loading spend limits..." />;
  if (error) return <ErrorState label={error} />;
  if (profile?.effective_role !== "org_owner") {
    return (
      <AppShell>
        <EmptyState title="Spend limits are owner-managed" description="Your current role can view spend behavior through budgets and approvals." />
      </AppShell>
    );
  }
  if (!items.length) {
    return (
      <AppShell>
        <EmptyState title="No spend limits yet" description="Add per-category, per-department, or per-employee limits through the finance API." />
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="space-y-6">
        <PageHeader title="Spend Limits" description="Business-friendly limits for employees, departments, and categories." />
        <div className="grid gap-4">
          {items.map((item) => (
            <div key={item.id} className="panel p-6">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="font-display text-2xl">{item.category || item.department?.name || "Company-wide rule"}</div>
                  <div className="mt-2 text-sm text-slate-500">{item.active ? "Active" : "Inactive"}</div>
                </div>
                <div className="text-sm text-slate-600 dark:text-slate-300">
                  Max single: {item.max_single_expense_amount ?? "-"} • Monthly: {item.monthly_limit ?? "-"} • Approval above: {item.requires_approval_above_amount ?? "-"}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
