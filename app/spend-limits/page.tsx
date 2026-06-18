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
  department?: { id: string; name: string } | null;
};

type Department = {
  id: string;
  name: string;
};

type SpendLimitForm = {
  department_id: string;
  category: string;
  max_single_expense_amount: string;
  monthly_limit: string;
};

const emptyForm: SpendLimitForm = {
  department_id: "",
  category: "",
  max_single_expense_amount: "",
  monthly_limit: "",
};

function toForm(item?: SpendLimit): SpendLimitForm {
  if (!item) return emptyForm;
  return {
    department_id: item.department?.id || "",
    category: item.category || "",
    max_single_expense_amount: item.max_single_expense_amount != null ? String(item.max_single_expense_amount) : "",
    monthly_limit: item.monthly_limit != null ? String(item.monthly_limit) : "",
  };
}

function summarizeRule(item: SpendLimit) {
  const scope = item.department?.name ? `${item.department.name} department` : "Company-wide";
  const category = item.category ? `, ${item.category}` : "";
  return `${scope}${category}`;
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
  }, [token, profile?.effective_role]);

  function buildPayload(form: SpendLimitForm) {
    return {
      department_id: form.department_id || null,
      category: form.category || null,
      max_single_expense_amount: form.max_single_expense_amount || null,
      monthly_limit: form.monthly_limit || null,
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

  async function deleteLimit(limitId: string) {
    if (!token) return;
    if (!window.confirm("Delete this spend limit?")) return;

    setSaving(true);
    setError(null);
    try {
      await apiFetch(`/api/finance/spend-limits/${limitId}`, {
        method: "DELETE",
        token,
      });
      if (editingId === limitId) {
        setEditingId(null);
        setEditForm(emptyForm);
      }
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
        <EmptyState title="Spend limits are owner-managed" description="Your current role can follow approvals and budgets, but only the owner can change spend-limit policy." />
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="space-y-6">
        <PageHeader
          title="Spend Limits"
          description="Keep this simple: define department or company spending caps by category, then update or delete them whenever finance policy changes."
        />

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
              placeholder="Leave blank for all categories"
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
          <div className="xl:col-span-4 flex justify-end">
            <button className="btn-primary min-w-44" disabled={saving}>
              {saving ? "Saving limit..." : "Create spend limit"}
            </button>
          </div>
        </form>

        {!items.length ? (
          <EmptyState title="No spend limits yet" description="Create the first simple spend cap for a department or for the whole company." />
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
                        <div className="font-display text-2xl">{summarizeRule(item)}</div>
                      </div>
                      <div className="flex flex-wrap gap-3">
                        {editing ? (
                          <>
                            <button
                              className="btn-secondary"
                              disabled={saving}
                              onClick={() => {
                                setEditingId(null);
                                setEditForm(emptyForm);
                              }}
                            >
                              Cancel
                            </button>
                            <button className="btn-primary" disabled={saving} onClick={() => void saveEdit(item.id)}>
                              {saving ? "Saving..." : "Save changes"}
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
                              Edit limit
                            </button>
                            <button className="btn-secondary" disabled={saving} onClick={() => void deleteLimit(item.id)}>
                              Delete limit
                            </button>
                          </>
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
                            placeholder="All categories"
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
                      </div>
                    ) : (
                      <div className="grid gap-2 text-sm text-slate-600 dark:text-slate-300">
                        <div>Max single expense: {item.max_single_expense_amount ?? "-"}</div>
                        <div>Monthly limit: {item.monthly_limit ?? "-"}</div>
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
