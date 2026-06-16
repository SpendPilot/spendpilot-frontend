"use client";

import { useEffect, useState } from "react";

import { AppShell } from "@/components/app-shell";
import { EmptyState, ErrorState, LoadingState, PageHeader } from "@/components/ui";
import { useAuth } from "@/components/auth-provider";
import { apiFetch, getApiError } from "@/lib/api";

type Priority = {
  id: string;
  label: string;
  amount: number;
  priority: string;
  reason: string;
  due_date?: string | null;
};

export default function PaymentPriorityPage() {
  const { token, profile } = useAuth();
  const [items, setItems] = useState<Priority[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    apiFetch<Priority[]>("/api/finance/payment-priorities", { token })
      .then(setItems)
      .catch((err) => setError(getApiError(err)))
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) return <LoadingState label="Calculating payment priorities..." />;
  if (error) return <ErrorState label={error} />;
  if (profile?.effective_role !== "org_owner") {
    return (
      <AppShell>
        <EmptyState title="Payment priority is owner-managed" description="Urgent payment visibility is available on your dashboard summary." />
      </AppShell>
    );
  }
  if (!items.length) {
    return (
      <AppShell>
        <EmptyState title="No payment priorities yet" description="Approved variable expenses and active recurring bills will appear here." />
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="space-y-6">
        <PageHeader title="Payment Priority / Cash Outflow" description="What should be paid now, this week, or later based on urgency and budget pressure." />
        <div className="grid gap-4">
          {items.map((item) => (
            <div key={item.id} className="panel p-6">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="font-display text-2xl">{item.label}</div>
                  <div className="mt-2 text-sm text-slate-500">{item.reason}</div>
                </div>
                <div className="text-right">
                  <div className="font-medium">INR {Number(item.amount).toFixed(2)}</div>
                  <div className="mt-2 text-sm uppercase tracking-[0.2em] text-slate-500">{item.priority}</div>
                  {item.due_date ? <div className="mt-1 text-xs text-slate-500">Due {new Date(item.due_date).toLocaleDateString()}</div> : null}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
