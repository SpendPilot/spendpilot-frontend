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
};

type Department = {
  id: string;
  name: string;
};

type BudgetForm = {
  name: string;
  scope: "company" | "department";
  department_id: string;
  currency: string;
  amount: string;
  month: string;
  year: string;
  alert_threshold_percent: string;
};

const emptyForm = (): BudgetForm => ({
  name: "",
  scope: "company",
  department_id: "",
  currency: "INR",
  amount: "",
  month: String(new Date().getMonth() + 1),
  year: String(new Date().getFullYear()),
  alert_threshold_percent: "80",
});

function periodKey(item: Pick<BudgetItem, "currency" | "month" | "year">) {
  return `${item.currency}-${item.month}-${item.year}`;
}

function toForm(item: BudgetItem): BudgetForm {
  return {
    name: item.name,
    scope: item.scope === "department" ? "department" : "company",
    department_id: item.department?.id || "",
    currency: item.currency,
    amount: String(item.amount),
    month: String(item.month ?? ""),
    year: String(item.year ?? ""),
    alert_threshold_percent: String(item.alert_threshold_percent),
  };
}

export default function BudgetsPage() {
  const { token, profile } = useAuth();
  const [items, setItems] = useState<BudgetItem[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<BudgetForm>(emptyForm());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<BudgetForm>(emptyForm());

  const isOwner = profile?.effective_role === "org_owner";

  function load() {
    if (!token) return;
    setLoading(true);
    Promise.all([
      apiFetch<BudgetItem[]>("/api/finance/budgets", { token }),
      isOwner ? apiFetch<Department[]>("/api/admin/departments", { token }).catch(() => []) : Promise.resolve([]),
    ])
      .then(([nextItems, nextDepartments]) => {
        setItems(nextItems);
        setDepartments(nextDepartments);
      })
      .catch((err) => setError(getApiError(err)))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, [token, isOwner]);

  const totals = useMemo(() => {
    const companyBudgets = items.filter((item) => item.scope === "company");
    const departmentBudgets = items.filter((item) => item.scope === "department");
    const companyBudgeted = companyBudgets.reduce((sum, item) => sum + Number(item.amount), 0);
    const departmentAssigned = departmentBudgets.reduce((sum, item) => sum + Number(item.amount), 0);
    return {
      companyBudgeted,
      departmentAssigned,
      unallocated: companyBudgeted - departmentAssigned,
    };
  }, [items]);

  const departmentTotalsByPeriod = useMemo(() => {
    const totalsMap = new Map<string, number>();
    for (const item of items) {
      if (item.scope !== "department") continue;
      const key = periodKey(item);
      totalsMap.set(key, (totalsMap.get(key) || 0) + Number(item.amount));
    }
    return totalsMap;
  }, [items]);

  function buildPayload(nextForm: BudgetForm) {
    return {
      name: nextForm.name,
      scope: nextForm.scope,
      department_id: nextForm.scope === "department" ? nextForm.department_id || null : null,
      currency: nextForm.currency,
      amount: nextForm.amount,
      month: Number(nextForm.month),
      year: Number(nextForm.year),
      alert_threshold_percent: Number(nextForm.alert_threshold_percent),
    };
  }

  async function createBudget(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) return;

    setSaving(true);
    setError(null);
    try {
      await apiFetch("/api/finance/budgets", {
        method: "POST",
        token,
        body: JSON.stringify(buildPayload(form)),
      });
      setForm(emptyForm());
      load();
    } catch (nextError) {
      setError(getApiError(nextError));
    } finally {
      setSaving(false);
    }
  }

  async function saveBudget(budgetId: string) {
    if (!token) return;

    setSaving(true);
    setError(null);
    try {
      await apiFetch(`/api/finance/budgets/${budgetId}`, {
        method: "PATCH",
        token,
        body: JSON.stringify(buildPayload(editForm)),
      });
      setEditingId(null);
      setEditForm(emptyForm());
      load();
    } catch (nextError) {
      setError(getApiError(nextError));
    } finally {
      setSaving(false);
    }
  }

  async function deleteBudget(budgetId: string, budgetName: string) {
    if (!token) return;
    if (!window.confirm(`Delete budget "${budgetName}"?`)) return;

    setSaving(true);
    setError(null);
    try {
      await apiFetch(`/api/finance/budgets/${budgetId}`, {
        method: "DELETE",
        token,
      });
      if (editingId === budgetId) {
        setEditingId(null);
        setEditForm(emptyForm());
      }
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
    ? "Set one company budget for a month, then carve department budgets out from that same company budget without exceeding it."
    : "Your department can see the company budget layer plus the budget assigned to your team.";

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
                placeholder={form.scope === "company" ? "August 2026 Company Budget" : "IT August 2026 Budget"}
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
                    scope: event.target.value as "company" | "department",
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
            <div className="xl:col-span-4 rounded-[24px] border border-[rgba(var(--line),0.84)] bg-[rgba(var(--panel-muted),0.62)] px-4 py-3 text-sm text-[rgb(var(--muted-strong))]">
              Company budgets act as the cap for that month and currency. Department budgets must fit inside that cap.
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
            <div className="text-sm uppercase tracking-[0.25em] text-slate-400">Company Budgeted</div>
            <div className="mt-3 font-display text-4xl">INR {totals.companyBudgeted.toFixed(2)}</div>
          </div>
          <div className="panel p-6">
            <div className="text-sm uppercase tracking-[0.25em] text-slate-400">Department Assigned</div>
            <div className="mt-3 font-display text-4xl">INR {totals.departmentAssigned.toFixed(2)}</div>
          </div>
          <div className="panel p-6">
            <div className="text-sm uppercase tracking-[0.25em] text-slate-400">Still Unallocated</div>
            <div className="mt-3 font-display text-4xl">INR {totals.unallocated.toFixed(2)}</div>
          </div>
        </div>

        {!items.length ? (
          <EmptyState
            title="No budgets configured"
            description={isOwner ? "Create the company budget first, then assign department budgets from it." : "No budgets are visible for your current workspace yet."}
          />
        ) : (
          <div className="grid gap-4">
            {items.map((item) => {
              const editing = editingId === item.id;
              const assignedAmount = item.scope === "company" ? departmentTotalsByPeriod.get(periodKey(item)) || 0 : null;
              const companyRemaining = item.scope === "company" && assignedAmount != null ? Number(item.amount) - assignedAmount : null;

              return (
                <div key={item.id} className="panel p-6">
                  <div className="flex flex-col gap-4">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div>
                        <div className="font-display text-2xl">{item.name}</div>
                        <div className="mt-2 text-sm text-slate-500">
                          {item.scope} {item.department ? `- ${item.department.name}` : ""}{" "}
                          {item.month && item.year ? `- ${item.month}/${item.year}` : ""}
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-3">
                        {isOwner ? (
                          <>
                            {editing ? (
                              <>
                                <button
                                  className="btn-secondary"
                                  disabled={saving}
                                  onClick={() => {
                                    setEditingId(null);
                                    setEditForm(emptyForm());
                                  }}
                                >
                                  Cancel
                                </button>
                                <button className="btn-primary" disabled={saving} onClick={() => void saveBudget(item.id)}>
                                  {saving ? "Saving..." : "Save budget"}
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  className="btn-secondary"
                                  onClick={() => {
                                    setEditingId(item.id);
                                    setEditForm(toForm(item));
                                  }}
                                >
                                  Edit budget
                                </button>
                                <button className="btn-secondary" disabled={saving} onClick={() => void deleteBudget(item.id, item.name)}>
                                  Delete budget
                                </button>
                              </>
                            )}
                          </>
                        ) : null}
                      </div>
                    </div>

                    {editing ? (
                      <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
                        <div className="xl:col-span-2">
                          <label className="mb-2 block text-xs font-medium uppercase tracking-[0.22em] text-[rgb(var(--muted))]">Budget name</label>
                          <input
                            value={editForm.name}
                            onChange={(event) => setEditForm((current) => ({ ...current, name: event.target.value }))}
                            required
                          />
                        </div>
                        <div>
                          <label className="mb-2 block text-xs font-medium uppercase tracking-[0.22em] text-[rgb(var(--muted))]">Scope</label>
                          <select
                            value={editForm.scope}
                            onChange={(event) =>
                              setEditForm((current) => ({
                                ...current,
                                scope: event.target.value as "company" | "department",
                                department_id: event.target.value === "company" ? "" : current.department_id,
                              }))
                            }
                          >
                            <option value="company">Company</option>
                            <option value="department">Department</option>
                          </select>
                        </div>
                        <div>
                          <label className="mb-2 block text-xs font-medium uppercase tracking-[0.22em] text-[rgb(var(--muted))]">Department</label>
                          <select
                            value={editForm.department_id}
                            disabled={editForm.scope !== "department"}
                            onChange={(event) => setEditForm((current) => ({ ...current, department_id: event.target.value }))}
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
                          <label className="mb-2 block text-xs font-medium uppercase tracking-[0.22em] text-[rgb(var(--muted))]">Amount</label>
                          <input
                            value={editForm.amount}
                            onChange={(event) => setEditForm((current) => ({ ...current, amount: event.target.value }))}
                            inputMode="decimal"
                          />
                        </div>
                        <div>
                          <label className="mb-2 block text-xs font-medium uppercase tracking-[0.22em] text-[rgb(var(--muted))]">Currency</label>
                          <input
                            value={editForm.currency}
                            onChange={(event) => setEditForm((current) => ({ ...current, currency: event.target.value.toUpperCase() }))}
                          />
                        </div>
                        <div>
                          <label className="mb-2 block text-xs font-medium uppercase tracking-[0.22em] text-[rgb(var(--muted))]">Month</label>
                          <input
                            value={editForm.month}
                            onChange={(event) => setEditForm((current) => ({ ...current, month: event.target.value }))}
                            inputMode="numeric"
                          />
                        </div>
                        <div>
                          <label className="mb-2 block text-xs font-medium uppercase tracking-[0.22em] text-[rgb(var(--muted))]">Year</label>
                          <input
                            value={editForm.year}
                            onChange={(event) => setEditForm((current) => ({ ...current, year: event.target.value }))}
                            inputMode="numeric"
                          />
                        </div>
                        <div>
                          <label className="mb-2 block text-xs font-medium uppercase tracking-[0.22em] text-[rgb(var(--muted))]">Alert threshold %</label>
                          <input
                            value={editForm.alert_threshold_percent}
                            onChange={(event) => setEditForm((current) => ({ ...current, alert_threshold_percent: event.target.value }))}
                            inputMode="numeric"
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="grid gap-2 text-sm text-slate-600 dark:text-slate-300">
                        <div>
                          {item.currency} {Number(item.spent_amount).toFixed(2)} used out of {item.currency} {Number(item.amount).toFixed(2)}
                        </div>
                        <div>
                          Remaining {item.currency} {Number(item.remaining_amount).toFixed(2)} - Alert at {item.alert_threshold_percent}%
                        </div>
                        {item.scope === "company" && assignedAmount != null && companyRemaining != null ? (
                          <>
                            <div>
                              Assigned to departments: {item.currency} {assignedAmount.toFixed(2)}
                            </div>
                            <div>
                              Still available for department assignment: {item.currency} {companyRemaining.toFixed(2)}
                            </div>
                          </>
                        ) : null}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AppShell>
  );
}
