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
  alert_threshold_percent: number;
  department?: { id: string; name: string } | null;
  category?: { id: string; name: string } | null;
};

type Department = {
  id: string;
  name: string;
};

type Category = {
  id: string;
  name: string;
};

export default function BudgetsPage() {
  const { token, profile } = useAuth();
  const [items, setItems] = useState<BudgetItem[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    scope: "company",
    department_id: "",
    category_id: "",
    currency: "INR",
    amount: "",
    month: String(new Date().getMonth() + 1),
    year: String(new Date().getFullYear()),
    alert_threshold_percent: "80",
  });

  const isOwner = profile?.effective_role === "org_owner";

  function load() {
    if (!token) return;
    setLoading(true);
    Promise.all([
      apiFetch<BudgetItem[]>("/api/finance/budgets", { token }),
      isOwner ? apiFetch<Department[]>("/api/admin/departments", { token }).catch(() => []) : Promise.resolve([]),
      apiFetch<Category[]>("/api/finance/categories", { token }).catch(() => []),
    ])
      .then(([nextItems, nextDepartments, nextCategories]) => {
        setItems(nextItems);
        setDepartments(nextDepartments);
        setCategories(nextCategories);
      })
      .catch((err) => setError(getApiError(err)))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, [token, isOwner]);

  const totals = useMemo(() => {
    const budgeted = items.reduce((sum, item) => sum + Number(item.amount), 0);
    const consumed = items.reduce((sum, item) => sum + Number(item.spent_amount), 0);
    const remaining = items.reduce((sum, item) => sum + Number(item.remaining_amount), 0);
    return { budgeted, consumed, remaining };
  }, [items]);

  async function createBudget(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) return;

    setSaving(true);
    setError(null);
    try {
      await apiFetch("/api/finance/budgets", {
        method: "POST",
        token,
        body: JSON.stringify({
          name: form.name,
          scope: form.scope,
          department_id: form.scope === "department" ? form.department_id || null : null,
          category_id: form.category_id || null,
          currency: form.currency,
          amount: form.amount,
          month: Number(form.month),
          year: Number(form.year),
          alert_threshold_percent: Number(form.alert_threshold_percent),
        }),
      });
      setForm({
        name: "",
        scope: "company",
        department_id: "",
        category_id: "",
        currency: "INR",
        amount: "",
        month: String(new Date().getMonth() + 1),
        year: String(new Date().getFullYear()),
        alert_threshold_percent: "80",
      });
      load();
    } catch (nextError) {
      setError(getApiError(nextError));
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <LoadingState label="Loading budgets..." />;
  if (error) return <ErrorState label={error} />;

  const title = isOwner ? "Budgets" : `${profile?.membership.department?.name || "Department"} Budget`;
  const description = isOwner
    ? "Create company or department budgets, then track used and remaining amounts over the current period."
    : "Your department budget visibility for the current tenant.";

  return (
    <AppShell>
      <div className="space-y-6">
        <PageHeader title={title} description={description} />

        {isOwner ? (
          <form onSubmit={createBudget} className="panel grid gap-4 p-6 lg:grid-cols-2 xl:grid-cols-4">
            <div className="xl:col-span-2">
              <label className="mb-2 block text-xs font-medium uppercase tracking-[0.22em] text-[rgb(var(--muted))]">
                Budget name
              </label>
              <input
                value={form.name}
                onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                placeholder="IT July Budget"
                required
              />
            </div>
            <div>
              <label className="mb-2 block text-xs font-medium uppercase tracking-[0.22em] text-[rgb(var(--muted))]">
                Scope
              </label>
              <select
                value={form.scope}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    scope: event.target.value,
                    department_id: event.target.value === "company" ? "" : current.department_id,
                  }))
                }
              >
                <option value="company">Company</option>
                <option value="department">Department</option>
              </select>
            </div>
            <div>
              <label className="mb-2 block text-xs font-medium uppercase tracking-[0.22em] text-[rgb(var(--muted))]">
                Department
              </label>
              <select
                value={form.department_id}
                disabled={form.scope !== "department"}
                onChange={(event) => setForm((current) => ({ ...current, department_id: event.target.value }))}
              >
                <option value="">Select department</option>
                {departments.map((department) => (
                  <option key={department.id} value={department.id}>
                    {department.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-2 block text-xs font-medium uppercase tracking-[0.22em] text-[rgb(var(--muted))]">
                Category
              </label>
              <select
                value={form.category_id}
                onChange={(event) => setForm((current) => ({ ...current, category_id: event.target.value }))}
              >
                <option value="">All categories</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-2 block text-xs font-medium uppercase tracking-[0.22em] text-[rgb(var(--muted))]">
                Amount
              </label>
              <input
                value={form.amount}
                onChange={(event) => setForm((current) => ({ ...current, amount: event.target.value }))}
                placeholder="50000.00"
                inputMode="decimal"
                required
              />
            </div>
            <div>
              <label className="mb-2 block text-xs font-medium uppercase tracking-[0.22em] text-[rgb(var(--muted))]">
                Currency
              </label>
              <input
                value={form.currency}
                onChange={(event) => setForm((current) => ({ ...current, currency: event.target.value.toUpperCase() }))}
                maxLength={10}
                required
              />
            </div>
            <div>
              <label className="mb-2 block text-xs font-medium uppercase tracking-[0.22em] text-[rgb(var(--muted))]">
                Month
              </label>
              <input
                value={form.month}
                onChange={(event) => setForm((current) => ({ ...current, month: event.target.value }))}
                inputMode="numeric"
                required
              />
            </div>
            <div>
              <label className="mb-2 block text-xs font-medium uppercase tracking-[0.22em] text-[rgb(var(--muted))]">
                Year
              </label>
              <input
                value={form.year}
                onChange={(event) => setForm((current) => ({ ...current, year: event.target.value }))}
                inputMode="numeric"
                required
              />
            </div>
            <div>
              <label className="mb-2 block text-xs font-medium uppercase tracking-[0.22em] text-[rgb(var(--muted))]">
                Alert threshold %
              </label>
              <input
                value={form.alert_threshold_percent}
                onChange={(event) => setForm((current) => ({ ...current, alert_threshold_percent: event.target.value }))}
                inputMode="numeric"
                required
              />
            </div>
            <div className="xl:col-span-4 flex items-end justify-end">
              <button className="btn-primary min-w-44" disabled={saving}>
                {saving ? "Saving budget..." : "Create budget"}
              </button>
            </div>
          </form>
        ) : null}

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

        {!items.length ? (
          <EmptyState
            title="No budgets configured"
            description={isOwner ? "Create your first company or department budget to start tracking planned spend." : "No budgets are visible for your current workspace yet."}
          />
        ) : (
          <div className="grid gap-4">
            {items.map((item) => (
              <div key={item.id} className="panel p-6">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="font-display text-2xl">{item.name}</div>
                    <div className="mt-2 text-sm text-slate-500">
                      {item.scope} {item.department ? `• ${item.department.name}` : ""} {item.category ? `• ${item.category.name}` : ""}{" "}
                      {item.month && item.year ? `• ${item.month}/${item.year}` : ""}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-display text-2xl">
                      {item.currency} {Number(item.spent_amount).toFixed(2)} / {Number(item.amount).toFixed(2)}
                    </div>
                    <div className="mt-2 text-sm text-slate-500">
                      Remaining {item.currency} {Number(item.remaining_amount).toFixed(2)} • Alert at {item.alert_threshold_percent}%
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
