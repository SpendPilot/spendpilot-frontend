"use client";

import { useEffect, useMemo, useState } from "react";

import { AppShell } from "@/components/app-shell";
import { EmptyState, ErrorState, LoadingState, PageHeader } from "@/components/ui";
import { useAuth } from "@/components/auth-provider";
import { apiFetch, getApiError } from "@/lib/api";

type BudgetItem = {
  id: string;
  name: string;
  scope: string;
  amount: number;
  currency: string;
  month?: number | null;
  year?: number | null;
  spent_amount: number;
  remaining_amount: number;
  department?: { name: string } | null;
};

export default function BudgetsPage() {
  const { token, profile } = useAuth();
  const [items, setItems] = useState<BudgetItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    apiFetch<BudgetItem[]>("/api/finance/budgets", { token })
      .then(setItems)
      .catch((err) => setError(getApiError(err)))
      .finally(() => setLoading(false));
  }, [token]);

  const totals = useMemo(() => {
    const budgeted = items.reduce((sum, item) => sum + Number(item.amount), 0);
    const consumed = items.reduce((sum, item) => sum + Number(item.spent_amount), 0);
    const remaining = items.reduce((sum, item) => sum + Number(item.remaining_amount), 0);
    return { budgeted, consumed, remaining };
  }, [items]);

  if (loading) return <LoadingState label="Loading budgets..." />;
  if (error) return <ErrorState label={error} />;
  if (!items.length) {
    return (
      <AppShell>
        <EmptyState title="No budgets configured" description="Create company or department budgets to start spend tracking." />
      </AppShell>
    );
  }

  const title = profile?.effective_role === "org_owner" ? "Budgets" : `${profile?.membership.department?.name || "Department"} Budget`;
  const description =
    profile?.effective_role === "org_owner"
      ? "Company and department monthly budgets with used and remaining amounts."
      : "Your department budget visibility for the current tenant.";

  return (
    <AppShell>
      <div className="space-y-6">
        <PageHeader title={title} description={description} />
        <div className="grid gap-4 md:grid-cols-3">
          <div className="panel p-6">
            <div className="text-sm uppercase tracking-[0.25em] text-slate-400">Budgeted</div>
            <div className="mt-3 font-display text-4xl">INR {totals.budgeted.toFixed(2)}</div>
          </div>
          <div className="panel p-6">
            <div className="text-sm uppercase tracking-[0.25em] text-slate-400">Used</div>
            <div className="mt-3 font-display text-4xl">INR {totals.consumed.toFixed(2)}</div>
          </div>
          <div className="panel p-6">
            <div className="text-sm uppercase tracking-[0.25em] text-slate-400">Remaining</div>
            <div className="mt-3 font-display text-4xl">INR {totals.remaining.toFixed(2)}</div>
          </div>
        </div>
        <div className="grid gap-4">
          {items.map((item) => (
            <div key={item.id} className="panel p-6">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="font-display text-2xl">{item.name}</div>
                  <div className="mt-2 text-sm text-slate-500">
                    {item.scope} {item.department ? `• ${item.department.name}` : ""} {item.month && item.year ? `• ${item.month}/${item.year}` : ""}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-display text-2xl">
                    {item.currency} {Number(item.spent_amount).toFixed(2)} / {Number(item.amount).toFixed(2)}
                  </div>
                  <div className="mt-2 text-sm text-slate-500">Remaining {item.currency} {Number(item.remaining_amount).toFixed(2)}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
