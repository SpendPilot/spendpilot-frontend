"use client";

import { useEffect, useState } from "react";

import { AppShell } from "@/components/app-shell";
import { ChartPanel, MetricStrip } from "@/components/charts";
import { EmptyState, ErrorState, LoadingState, PageHeader } from "@/components/ui";
import { useAuth } from "@/components/auth-provider";
import { apiFetch, getApiError } from "@/lib/api";

type DashboardOut = {
  organization_name: string;
  role: string;
  total_spend_this_month: number;
  recurring_spend_this_month: number;
  variable_spend_this_month: number;
  pending_approvals: number;
  approved_expenses: number;
  rejected_expenses: number;
  company_budget_used: number;
  company_budget_remaining: number;
  upcoming_payment_count: number;
  cash_outflow_this_week: number;
  cash_outflow_this_month: number;
  budgets: { id: string; name: string; scope: string; amount: number; spent_amount: number; remaining_amount: number }[];
  category_breakdown: { category: string; amount: number }[];
  department_breakdown: { department: string; amount: number }[];
  payment_priorities: { id: string; label: string; amount: number; priority: string; reason: string }[];
};

export default function DashboardPage() {
  const { token, profile } = useAuth();
  const [dashboard, setDashboard] = useState<DashboardOut | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    apiFetch<DashboardOut>("/api/finance/dashboard", { token })
      .then(setDashboard)
      .catch((err) => setError(getApiError(err)))
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) return <LoadingState label="Loading dashboard..." />;
  if (error) return <ErrorState label={error} />;
  if (!dashboard) {
    return (
      <AppShell>
        <EmptyState title="No spend data yet" description="Create budgets, upload bills, or submit expenses to start the workspace." />
      </AppShell>
    );
  }

  const ownerMetrics = [
    { label: "Total Spend", value: Number(dashboard.total_spend_this_month) },
    { label: "Recurring", value: Number(dashboard.recurring_spend_this_month) },
    { label: "Variable", value: Number(dashboard.variable_spend_this_month) },
    { label: "Pending", value: dashboard.pending_approvals },
    { label: "Cash This Week", value: Number(dashboard.cash_outflow_this_week) },
    { label: "Cash This Month", value: Number(dashboard.cash_outflow_this_month) },
  ];
  const deptMetrics = [
    { label: "Pending", value: dashboard.pending_approvals },
    { label: "Approved", value: dashboard.approved_expenses },
    { label: "Rejected", value: dashboard.rejected_expenses },
    { label: "Upcoming", value: dashboard.upcoming_payment_count },
  ];
  const title =
    profile?.effective_role === "org_owner"
      ? `${dashboard.organization_name} payment operations`
      : profile?.effective_role === "dept_head"
        ? `${profile.membership.department?.name || "Department"} dashboard`
        : `${profile?.membership.department?.name || "Department"} budget view`;
  const description =
    profile?.effective_role === "org_owner"
      ? "See current spending, approval load, budget pressure, and upcoming payment work across the organization."
      : profile?.effective_role === "dept_head"
        ? "Track department requests, watch budget usage, and stay ahead of upcoming spend."
        : "Stay focused on your department budget, pending requests, and the work that needs your attention.";

  return (
    <AppShell>
      <div className="space-y-6">
        <PageHeader title={title} description={description} />
        <MetricStrip metrics={profile?.effective_role === "org_owner" ? ownerMetrics : deptMetrics} />
        <div className="grid gap-6 xl:grid-cols-2">
          <ChartPanel
            title={profile?.effective_role === "org_owner" ? "Department-wise spend" : "Budget usage"}
            kind="bar"
            data={
              profile?.effective_role === "org_owner"
                ? dashboard.department_breakdown.map((item) => ({ category: item.department, total: Number(item.amount) }))
                : dashboard.budgets.map((item) => ({ category: item.name, total: Number(item.spent_amount) }))
            }
            xKey="category"
            yKey="total"
          />
          <ChartPanel
            title={profile?.effective_role === "org_owner" ? "Category-wise spend" : "Payment pressure"}
            kind="bar"
            data={
              profile?.effective_role === "org_owner"
                ? dashboard.category_breakdown.map((item) => ({ category: item.category, total: Number(item.amount) }))
                : dashboard.payment_priorities.map((item) => ({ category: item.priority, total: Number(item.amount) }))
            }
            xKey="category"
            yKey="total"
          />
        </div>
        <div className="grid gap-4">
          {dashboard.payment_priorities.slice(0, 5).map((item) => (
            <div key={item.id} className="panel p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="font-medium">{item.label}</div>
                  <div className="mt-1 text-sm text-[rgb(var(--muted-strong))]">{item.reason}</div>
                </div>
                <div className="badge-tonal">{item.priority}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
