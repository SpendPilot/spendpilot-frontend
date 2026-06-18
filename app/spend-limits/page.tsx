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
  recurring_creation_restricted: boolean;
  variable_requires_org_owner: boolean;
  allowed_categories: string[];
  department?: { id: string; name: string } | null;
  user_id?: string | null;
};

type Department = {
  id: string;
  name: string;
};

type SpendLimitForm = {
  department_id: string;
  user_id: string;
  category: string;
  max_single_expense_amount: string;
  monthly_limit: string;
  requires_approval_above_amount: string;
  allowed_categories: string;
  recurring_creation_restricted: boolean;
  variable_requires_org_owner: boolean;
  active: boolean;
};

const emptyForm: SpendLimitForm = {
  department_id: "",
  user_id: "",
  category: "",
  max_single_expense_amount: "",
  monthly_limit: "",
  requires_approval_above_amount: "",
  allowed_categories: "",
  recurring_creation_restricted: false,
  variable_requires_org_owner: false,
  active: true,
};

function toForm(item?: SpendLimit): SpendLimitForm {
  if (!item) return emptyForm;
  return {
    department_id: item.department?.id || "",
    user_id: item.user_id || "",
    category: item.category || "",
    max_single_expense_amount: item.max_single_expense_amount != null ? String(item.max_single_expense_amount) : "",
    monthly_limit: item.monthly_limit != null ? String(item.monthly_limit) : "",
    requires_approval_above_amount:
      item.requires_approval_above_amount != null ? String(item.requires_approval_above_amount) : "",
    allowed_categories: item.allowed_categories.join(", "),
    recurring_creation_restricted: item.recurring_creation_restricted,
    variable_requires_org_owner: item.variable_requires_org_owner,
    active: item.active,
  };
}

export default function SpendLimitsPage() {
  const { token, profile } = useAuth();
  const [items, setItems] = useState<SpendLimit[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createForm, setCreateForm] = useState<SpendLimitForm>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<SpendLimitForm>(emptyForm);

  function load() {
    if (!token) return;
    setLoading(true);
    Promise.all([
      apiFetch<SpendLimit[]>("/api/finance/spend-limits", { token }),
      apiFetch<Department[]>("/api/admin/departments", { token }).catch(() => []),
    ])
      .then(([nextItems, nextDepartments]) => {
        setItems(nextItems);
        setDepartments(nextDepartments);
      })
      .catch((err) => setError(getApiError(err)))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    if (profile?.effective_role !== "org_owner") {
      setLoading(false);
      return;
    }
    load();
  }, [token, profile?.effective_role]);

  function buildPayload(form: SpendLimitForm) {
    return {
      department_id: form.department_id || null,
      user_id: form.user_id || null,
      category: form.category || null,
      max_single_expense_amount: form.max_single_expense_amount || null,
      monthly_limit: form.monthly_limit || null,
      requires_approval_above_amount: form.requires_approval_above_amount || null,
      allowed_categories: form.allowed_categories
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
      recurring_creation_restricted: form.recurring_creation_restricted,
      variable_requires_org_owner: form.variable_requires_org_owner,
      active: form.active,
    };
  }

  async function createSpendLimit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) return;

    setSaving(true);
    setError(null);
    try {
      await apiFetch("/api/finance/spend-limits", {
        method: "POST",
        token,
        body: JSON.stringify(buildPayload(createForm)),
      });
      setCreateForm(emptyForm);
      load();
    } catch (nextError) {
      setError(getApiError(nextError));
    } finally {
      setSaving(false);
    }
  }

  async function saveEdit(limitId: string) {
    if (!token) return;

    setSaving(true);
    setError(null);
    try {
      await apiFetch(`/api/finance/spend-limits/${limitId}`, {
        method: "PATCH",
        token,
        body: JSON.stringify(buildPayload(editForm)),
      });
      setEditingId(null);
      setEditForm(emptyForm);
      load();
    } catch (nextError) {
      setError(getApiError(nextError));
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <LoadingState label="Loading spend limits..." />;
  if (error) return <ErrorState label={error} />;
  if (profile?.effective_role !== "org_owner") {
    return (
      <AppShell>
        <EmptyState title="Spend limits are owner-managed" description="Your current role can view spend behavior through budgets and approvals." />
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="space-y-6">
        <PageHeader title="Spend Limits" description="Create policy guardrails for categories, departments, and approval thresholds." />

        <form onSubmit={createSpendLimit} className="panel grid gap-4 p-6 lg:grid-cols-2 xl:grid-cols-4">
          <div>
            <label className="mb-2 block text-xs font-medium uppercase tracking-[0.22em] text-[rgb(var(--muted))]">Department</label>
            <select
              value={createForm.department_id}
              onChange={(event) => setCreateForm((current) => ({ ...current, department_id: event.target.value }))}
            >
              <option value="">Company-wide</option>
              {departments.map((department) => (
                <option key={department.id} value={department.id}>
                  {department.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-2 block text-xs font-medium uppercase tracking-[0.22em] text-[rgb(var(--muted))]">Category</label>
            <input
              value={createForm.category}
              onChange={(event) => setCreateForm((current) => ({ ...current, category: event.target.value }))}
              placeholder="Travel"
            />
          </div>
          <div>
            <label className="mb-2 block text-xs font-medium uppercase tracking-[0.22em] text-[rgb(var(--muted))]">Max single expense</label>
            <input
              value={createForm.max_single_expense_amount}
              onChange={(event) => setCreateForm((current) => ({ ...current, max_single_expense_amount: event.target.value }))}
              placeholder="5000.00"
              inputMode="decimal"
            />
          </div>
          <div>
            <label className="mb-2 block text-xs font-medium uppercase tracking-[0.22em] text-[rgb(var(--muted))]">Monthly limit</label>
            <input
              value={createForm.monthly_limit}
              onChange={(event) => setCreateForm((current) => ({ ...current, monthly_limit: event.target.value }))}
              placeholder="50000.00"
              inputMode="decimal"
            />
          </div>
          <div>
            <label className="mb-2 block text-xs font-medium uppercase tracking-[0.22em] text-[rgb(var(--muted))]">Approval above</label>
            <input
              value={createForm.requires_approval_above_amount}
              onChange={(event) => setCreateForm((current) => ({ ...current, requires_approval_above_amount: event.target.value }))}
              placeholder="2000.00"
              inputMode="decimal"
            />
          </div>
          <div className="xl:col-span-2">
            <label className="mb-2 block text-xs font-medium uppercase tracking-[0.22em] text-[rgb(var(--muted))]">Allowed categories</label>
            <input
              value={createForm.allowed_categories}
              onChange={(event) => setCreateForm((current) => ({ ...current, allowed_categories: event.target.value }))}
              placeholder="Travel, Meals, Software"
            />
          </div>
          <div className="xl:col-span-4 grid gap-3 md:grid-cols-3">
            <label className="panel-soft flex items-center gap-3 rounded-[22px] px-4 py-3 text-sm">
              <input
                type="checkbox"
                checked={createForm.recurring_creation_restricted}
                onChange={(event) =>
                  setCreateForm((current) => ({ ...current, recurring_creation_restricted: event.target.checked }))
                }
              />
              Restrict recurring creation
            </label>
            <label className="panel-soft flex items-center gap-3 rounded-[22px] px-4 py-3 text-sm">
              <input
                type="checkbox"
                checked={createForm.variable_requires_org_owner}
                onChange={(event) =>
                  setCreateForm((current) => ({ ...current, variable_requires_org_owner: event.target.checked }))
                }
              />
              Force org owner review
            </label>
            <label className="panel-soft flex items-center gap-3 rounded-[22px] px-4 py-3 text-sm">
              <input
                type="checkbox"
                checked={createForm.active}
                onChange={(event) => setCreateForm((current) => ({ ...current, active: event.target.checked }))}
              />
              Active now
            </label>
          </div>
          <div className="xl:col-span-4 flex justify-end">
            <button className="btn-primary min-w-44" disabled={saving}>
              {saving ? "Saving rule..." : "Create spend limit"}
            </button>
          </div>
        </form>

        {!items.length ? (
          <EmptyState title="No spend limits yet" description="Create the first rule to define approval thresholds, monthly caps, or category guardrails." />
        ) : (
          <div className="grid gap-4">
            {items.map((item) => {
              const editing = editingId === item.id;
              const currentForm = editing ? editForm : toForm(item);
              return (
                <div key={item.id} className="panel p-6">
                  <div className="flex flex-col gap-4">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div>
                        <div className="font-display text-2xl">{item.category || item.department?.name || "Company-wide rule"}</div>
                        <div className="mt-2 text-sm text-slate-500">
                          {item.active ? "Active" : "Inactive"} {item.department ? `• ${item.department.name}` : ""}
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-3">
                        {editing ? (
                          <>
                            <button className="btn-secondary" disabled={saving} onClick={() => { setEditingId(null); setEditForm(emptyForm); }}>
                              Cancel
                            </button>
                            <button className="btn-primary" disabled={saving} onClick={() => void saveEdit(item.id)}>
                              {saving ? "Saving..." : "Save changes"}
                            </button>
                          </>
                        ) : (
                          <button
                            className="btn-secondary"
                            onClick={() => {
                              setEditingId(item.id);
                              setEditForm(toForm(item));
                            }}
                          >
                            Edit rule
                          </button>
                        )}
                      </div>
                    </div>

                    {editing ? (
                      <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
                        <div>
                          <label className="mb-2 block text-xs font-medium uppercase tracking-[0.22em] text-[rgb(var(--muted))]">Department</label>
                          <select
                            value={currentForm.department_id}
                            onChange={(event) => setEditForm((current) => ({ ...current, department_id: event.target.value }))}
                          >
                            <option value="">Company-wide</option>
                            {departments.map((department) => (
                              <option key={department.id} value={department.id}>
                                {department.name}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="mb-2 block text-xs font-medium uppercase tracking-[0.22em] text-[rgb(var(--muted))]">Category</label>
                          <input
                            value={currentForm.category}
                            onChange={(event) => setEditForm((current) => ({ ...current, category: event.target.value }))}
                          />
                        </div>
                        <div>
                          <label className="mb-2 block text-xs font-medium uppercase tracking-[0.22em] text-[rgb(var(--muted))]">Max single expense</label>
                          <input
                            value={currentForm.max_single_expense_amount}
                            onChange={(event) =>
                              setEditForm((current) => ({ ...current, max_single_expense_amount: event.target.value }))
                            }
                            inputMode="decimal"
                          />
                        </div>
                        <div>
                          <label className="mb-2 block text-xs font-medium uppercase tracking-[0.22em] text-[rgb(var(--muted))]">Monthly limit</label>
                          <input
                            value={currentForm.monthly_limit}
                            onChange={(event) => setEditForm((current) => ({ ...current, monthly_limit: event.target.value }))}
                            inputMode="decimal"
                          />
                        </div>
                        <div>
                          <label className="mb-2 block text-xs font-medium uppercase tracking-[0.22em] text-[rgb(var(--muted))]">Approval above</label>
                          <input
                            value={currentForm.requires_approval_above_amount}
                            onChange={(event) =>
                              setEditForm((current) => ({ ...current, requires_approval_above_amount: event.target.value }))
                            }
                            inputMode="decimal"
                          />
                        </div>
                        <div className="xl:col-span-2">
                          <label className="mb-2 block text-xs font-medium uppercase tracking-[0.22em] text-[rgb(var(--muted))]">Allowed categories</label>
                          <input
                            value={currentForm.allowed_categories}
                            onChange={(event) => setEditForm((current) => ({ ...current, allowed_categories: event.target.value }))}
                          />
                        </div>
                        <div className="xl:col-span-4 grid gap-3 md:grid-cols-3">
                          <label className="panel-soft flex items-center gap-3 rounded-[22px] px-4 py-3 text-sm">
                            <input
                              type="checkbox"
                              checked={currentForm.recurring_creation_restricted}
                              onChange={(event) =>
                                setEditForm((current) => ({ ...current, recurring_creation_restricted: event.target.checked }))
                              }
                            />
                            Restrict recurring creation
                          </label>
                          <label className="panel-soft flex items-center gap-3 rounded-[22px] px-4 py-3 text-sm">
                            <input
                              type="checkbox"
                              checked={currentForm.variable_requires_org_owner}
                              onChange={(event) =>
                                setEditForm((current) => ({ ...current, variable_requires_org_owner: event.target.checked }))
                              }
                            />
                            Force org owner review
                          </label>
                          <label className="panel-soft flex items-center gap-3 rounded-[22px] px-4 py-3 text-sm">
                            <input
                              type="checkbox"
                              checked={currentForm.active}
                              onChange={(event) => setEditForm((current) => ({ ...current, active: event.target.checked }))}
                            />
                            Active now
                          </label>
                        </div>
                      </div>
                    ) : (
                      <div className="text-sm text-slate-600 dark:text-slate-300">
                        Max single: {item.max_single_expense_amount ?? "-"} • Monthly: {item.monthly_limit ?? "-"} • Approval above:{" "}
                        {item.requires_approval_above_amount ?? "-"} • Allowed categories: {item.allowed_categories.length ? item.allowed_categories.join(", ") : "Any"}
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
