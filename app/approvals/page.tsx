"use client";

import { useEffect, useMemo, useState } from "react";

import { AppShell } from "@/components/app-shell";
import { EmptyState, ErrorState, LoadingState, PageHeader } from "@/components/ui";
import { useAuth } from "@/components/auth-provider";
import { apiFetch, getApiError } from "@/lib/api";

type ExpenseItem = {
  id: string;
  title: string;
  vendor_name?: string | null;
  amount: number;
  currency: string;
  expense_date: string;
  status: string;
};

export default function ApprovalsPage() {
  const { token, profile } = useAuth();
  const [items, setItems] = useState<ExpenseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actioning, setActioning] = useState<string | null>(null);

  function load() {
    if (!token) return;
    setLoading(true);
    apiFetch<ExpenseItem[]>("/api/finance/expenses/variable", { token })
      .then(setItems)
      .catch((err) => setError(getApiError(err)))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    apiFetch<ExpenseItem[]>("/api/finance/expenses/variable", { token })
      .then(setItems)
      .catch((err) => setError(getApiError(err)))
      .finally(() => setLoading(false));
  }, [token]);

  const pending = useMemo(
    () => items.filter((item) => item.status.includes("pending") || item.status.includes("forwarded")),
    [items],
  );

  async function handleAction(expenseId: string, action: "approve" | "reject") {
    if (!token) return;
    setActioning(expenseId);
    setError(null);
    try {
      await apiFetch(`/api/finance/expenses/${expenseId}/${action}`, {
        method: "POST",
        token,
        body: JSON.stringify({ comment: `${action}d from the approvals workspace.` }),
      });
      load();
    } catch (nextError) {
      setError(getApiError(nextError));
    } finally {
      setActioning(null);
    }
  }

  if (loading) return <LoadingState label="Loading approval queue..." />;
  if (error) return <ErrorState label={error} />;
  if (!pending.length) {
    return (
      <AppShell>
        <EmptyState title="Approval queue is clear" description={`Nothing is waiting for ${profile?.effective_role || "your"} review right now.`} />
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="space-y-6">
        <PageHeader title="Approvals" description="Variable expenses that still need a department head or organization owner decision." />
        <div className="grid gap-4">
          {pending.map((item) => (
            <div key={item.id} className="panel p-6">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <div className="font-display text-2xl">{item.title}</div>
                  <div className="mt-2 text-sm text-slate-500">
                    {item.vendor_name || "Vendor pending"} • {new Date(item.expense_date).toLocaleDateString()}
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <div className="font-display text-2xl">
                    {item.currency} {Number(item.amount).toFixed(2)}
                  </div>
                  <button
                    type="button"
                    onClick={() => void handleAction(item.id, "approve")}
                    disabled={actioning === item.id}
                    className="rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-medium text-white"
                  >
                    {actioning === item.id ? "Working..." : "Approve"}
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleAction(item.id, "reject")}
                    disabled={actioning === item.id}
                    className="rounded-2xl border border-rose-300 px-4 py-3 text-sm font-medium text-rose-700 dark:border-rose-900 dark:text-rose-200"
                  >
                    Reject
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
