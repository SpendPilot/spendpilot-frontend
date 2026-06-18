"use client";

import { useEffect, useState } from "react";

import { AppShell } from "@/components/app-shell";
import { EmptyState, ErrorState, LoadingState, PageHeader } from "@/components/ui";
import { useAuth } from "@/components/auth-provider";
import { apiFetch, getApiError } from "@/lib/api";

type Workspace = {
  recurring_expenses: {
    id: string;
    name: string;
    category: string;
    amount: number;
    currency: string;
    billing_cycle: string;
    priority: string;
    status: string;
    vendor?: { name: string } | null;
    next_due_date?: string | null;
  }[];
  recurring_requests: {
    id: string;
    name: string;
    vendor_name: string;
    category: string;
    estimated_amount: number;
    currency: string;
    status: string;
  }[];
  variable_expenses: {
    id: string;
    title: string;
    vendor_name?: string | null;
    amount: number;
    currency: string;
    status: string;
    expense_date: string;
    rejection_reason?: string | null;
  }[];
};

type Category = { id: string; name: string };

export default function ExpensesPage() {
  const { token, profile } = useAuth();
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [employeeForm, setEmployeeForm] = useState({
    title: "",
    vendor_name: "",
    amount: "",
    expense_date: "",
    category_id: "",
    description: "",
  });
  const [requestForm, setRequestForm] = useState({
    name: "",
    vendor_name: "",
    category: "",
    estimated_amount: "",
    billing_cycle: "monthly",
    reason: "",
  });
  const [recurringForm, setRecurringForm] = useState({
    name: "",
    vendor_name: "",
    category: "",
    amount: "",
    billing_cycle: "monthly",
    priority: "pay_this_week",
  });
  const [employeeFile, setEmployeeFile] = useState<File | null>(null);
  const [requestFile, setRequestFile] = useState<File | null>(null);
  const [recurringFile, setRecurringFile] = useState<File | null>(null);

  const isOwner = profile?.effective_role === "org_owner";
  const isDeptHead = profile?.effective_role === "dept_head";
  const isEmployee = !isOwner && !isDeptHead;

  function load() {
    if (!token) return;
    setLoading(true);
    Promise.all([
      apiFetch<Workspace>("/api/finance/expenses", { token }),
      apiFetch<Category[]>("/api/finance/categories", { token }).catch(() => []),
    ])
      .then(([nextWorkspace, nextCategories]) => {
        setWorkspace(nextWorkspace);
        setCategories(nextCategories);
        if (nextCategories[0]) {
          setEmployeeForm((current) => (current.category_id ? current : { ...current, category_id: nextCategories[0].id }));
        }
      })
      .catch((err) => setError(getApiError(err)))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    Promise.all([
      apiFetch<Workspace>("/api/finance/expenses", { token }),
      apiFetch<Category[]>("/api/finance/categories", { token }).catch(() => []),
    ])
      .then(([nextWorkspace, nextCategories]) => {
        setWorkspace(nextWorkspace);
        setCategories(nextCategories);
        if (nextCategories[0]) {
          setEmployeeForm((current) => (current.category_id ? current : { ...current, category_id: nextCategories[0].id }));
        }
      })
      .catch((err) => setError(getApiError(err)))
      .finally(() => setLoading(false));
  }, [token]);

  async function submitEmployeeExpense(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) return;
    setSaving(true);
    setError(null);
    try {
      const documentId = employeeFile ? await uploadDocument(employeeFile) : null;
      await apiFetch("/api/finance/expenses/variable", {
        method: "POST",
        token,
        body: JSON.stringify({
          ...employeeForm,
          amount: employeeForm.amount,
          document_id: documentId,
        }),
      });
      setEmployeeForm({ title: "", vendor_name: "", amount: "", expense_date: "", category_id: categories[0]?.id || "", description: "" });
      setEmployeeFile(null);
      load();
    } catch (nextError) {
      setError(getApiError(nextError));
    } finally {
      setSaving(false);
    }
  }

  async function submitRecurringRequest(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) return;
    setSaving(true);
    setError(null);
    try {
      const documentId = requestFile ? await uploadDocument(requestFile) : null;
      await apiFetch("/api/finance/recurring-expense-requests", {
        method: "POST",
        token,
        body: JSON.stringify({ ...requestForm, bill_document_id: documentId }),
      });
      setRequestForm({ name: "", vendor_name: "", category: "", estimated_amount: "", billing_cycle: "monthly", reason: "" });
      setRequestFile(null);
      load();
    } catch (nextError) {
      setError(getApiError(nextError));
    } finally {
      setSaving(false);
    }
  }

  async function submitRecurringExpense(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) return;
    setSaving(true);
    setError(null);
    try {
      const documentId = recurringFile ? await uploadDocument(recurringFile) : null;
      await apiFetch("/api/finance/recurring-expenses", {
        method: "POST",
        token,
        body: JSON.stringify({ ...recurringForm, bill_document_id: documentId }),
      });
      setRecurringForm({ name: "", vendor_name: "", category: "", amount: "", billing_cycle: "monthly", priority: "pay_this_week" });
      setRecurringFile(null);
      load();
    } catch (nextError) {
      setError(getApiError(nextError));
    } finally {
      setSaving(false);
    }
  }

  async function actOnRecurringRequest(id: string, approved: boolean) {
    if (!token) return;
    setSaving(true);
    setError(null);
    try {
      await apiFetch(`/api/finance/recurring-expense-requests/${id}/decision`, {
        method: "POST",
        token,
        body: JSON.stringify({ approved }),
      });
      load();
    } catch (nextError) {
      setError(getApiError(nextError));
    } finally {
      setSaving(false);
    }
  }

  async function cancelRecurringExpense(id: string, name: string) {
    if (!token) return;
    const confirmed = window.confirm(`Cancel recurring expense "${name}"? This will stop it from staying active.`);
    if (!confirmed) return;
    setSaving(true);
    setError(null);
    try {
      await apiFetch(`/api/finance/recurring-expenses/${id}/cancel`, {
        method: "POST",
        token,
        body: JSON.stringify({ comment: `Cancelled recurring expense ${name}` }),
      });
      load();
    } catch (nextError) {
      setError(getApiError(nextError));
    } finally {
      setSaving(false);
    }
  }

  async function uploadDocument(file: File): Promise<string> {
    if (!token) {
      throw new Error("Authentication is required before uploading a bill.");
    }
    const body = new FormData();
    body.append("file", file);
    const uploaded = await apiFetch<{ document: { id: string } }>("/api/documents/upload", {
      method: "POST",
      token,
      body,
    });
    return uploaded.document.id;
  }

  if (loading) return <LoadingState label="Loading expense workspace..." />;
  if (error) return <ErrorState label={error} />;
  if (!workspace) {
    return (
      <AppShell>
        <EmptyState title="Expense workspace unavailable" description="No expense data is available yet." />
      </AppShell>
    );
  }

  if (isOwner) {
    return (
      <AppShell>
        <div className="space-y-6">
          <PageHeader
            title="Recurring Expenses"
            description="Manage active recurring company spend here. Variable expense reviews stay in the dedicated approvals workspace."
          />

          <div className="panel p-6">
            <div className="font-display text-2xl">Create recurring expense</div>
            <form className="mt-4 grid gap-3 md:grid-cols-2" onSubmit={submitRecurringExpense}>
              <input className="rounded-2xl border px-4 py-3" placeholder="Name" value={recurringForm.name} onChange={(e) => setRecurringForm({ ...recurringForm, name: e.target.value })} />
              <input className="rounded-2xl border px-4 py-3" placeholder="Vendor" value={recurringForm.vendor_name} onChange={(e) => setRecurringForm({ ...recurringForm, vendor_name: e.target.value })} />
              <input className="rounded-2xl border px-4 py-3" placeholder="Category" value={recurringForm.category} onChange={(e) => setRecurringForm({ ...recurringForm, category: e.target.value })} />
              <input className="rounded-2xl border px-4 py-3" placeholder="Amount" value={recurringForm.amount} onChange={(e) => setRecurringForm({ ...recurringForm, amount: e.target.value })} />
              <select className="rounded-2xl border px-4 py-3" value={recurringForm.billing_cycle} onChange={(e) => setRecurringForm({ ...recurringForm, billing_cycle: e.target.value })}>
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
                <option value="yearly">Yearly</option>
              </select>
              <select className="rounded-2xl border px-4 py-3" value={recurringForm.priority} onChange={(e) => setRecurringForm({ ...recurringForm, priority: e.target.value })}>
                <option value="pay_now">Pay now</option>
                <option value="pay_this_week">Pay this week</option>
                <option value="can_wait">Can wait</option>
              </select>
              <input className="rounded-2xl border px-4 py-3 md:col-span-2" type="file" accept=".pdf,image/*" onChange={(e) => setRecurringFile(e.target.files?.[0] || null)} />
              <button className="rounded-2xl bg-slate-950 px-4 py-3 text-white md:col-span-2" disabled={saving}>
                {saving ? "Saving..." : "Create recurring expense"}
              </button>
            </form>
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            <section className="space-y-4">
              <div className="font-display text-2xl">Active and past recurring expenses</div>
              {workspace.recurring_expenses.map((item) => (
                <div key={item.id} className="panel p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-medium">{item.name}</div>
                      <div className="mt-1 text-sm text-slate-500">
                        {item.vendor?.name || "Vendor pending"} - {item.billing_cycle}
                      </div>
                      <div className="mt-2 text-sm text-slate-500">
                        {item.currency} {Number(item.amount).toFixed(2)} - {item.priority} {item.next_due_date ? `- due ${new Date(item.next_due_date).toLocaleDateString()}` : ""}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-3">
                      <div className="text-right text-sm uppercase tracking-[0.2em] text-slate-500">{item.status}</div>
                      {item.status === "active" ? (
                        <button className="rounded-2xl border border-rose-300 px-4 py-2 text-sm text-rose-700" disabled={saving} onClick={() => void cancelRecurringExpense(item.id, item.name)}>
                          Cancel recurring expense
                        </button>
                      ) : null}
                    </div>
                  </div>
                </div>
              ))}
              {!workspace.recurring_expenses.length ? (
                <EmptyState title="No recurring expenses yet" description="Create the first recurring expense to start the owner-managed schedule." />
              ) : null}
            </section>

            <section className="space-y-4">
              <div className="font-display text-2xl">Recurring expense requests</div>
              {workspace.recurring_requests.map((item) => (
                <div key={item.id} className="panel p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-medium">{item.name}</div>
                      <div className="mt-1 text-sm text-slate-500">{item.vendor_name} - {item.category}</div>
                    </div>
                    <div className="text-right text-sm uppercase tracking-[0.2em] text-slate-500">{item.status}</div>
                  </div>
                  <div className="mt-3 text-sm">
                    {item.currency} {Number(item.estimated_amount).toFixed(2)}
                  </div>
                  {item.status === "pending" ? (
                    <div className="mt-4 flex gap-3">
                      <button className="rounded-2xl bg-emerald-600 px-4 py-2 text-sm text-white" onClick={() => void actOnRecurringRequest(item.id, true)}>
                        Approve
                      </button>
                      <button className="rounded-2xl border border-rose-300 px-4 py-2 text-sm text-rose-700" onClick={() => void actOnRecurringRequest(item.id, false)}>
                        Reject
                      </button>
                    </div>
                  ) : null}
                </div>
              ))}
              {!workspace.recurring_requests.length ? (
                <EmptyState title="No recurring requests waiting" description="Department recurring requests will appear here for owner decision." />
              ) : null}
            </section>
          </div>
        </div>
      </AppShell>
    );
  }

  if (isDeptHead) {
    return (
      <AppShell>
        <div className="space-y-6">
          <PageHeader
            title="Recurring Requests"
            description="Create recurring spend requests for your department here. Variable expense reviews live in the dedicated approvals workspace."
          />

          <div className="panel p-6">
            <div className="font-display text-2xl">Create recurring request</div>
            <form className="mt-4 grid gap-3 md:grid-cols-2" onSubmit={submitRecurringRequest}>
              <input className="rounded-2xl border px-4 py-3" placeholder="Name" value={requestForm.name} onChange={(e) => setRequestForm({ ...requestForm, name: e.target.value })} />
              <input className="rounded-2xl border px-4 py-3" placeholder="Vendor" value={requestForm.vendor_name} onChange={(e) => setRequestForm({ ...requestForm, vendor_name: e.target.value })} />
              <input className="rounded-2xl border px-4 py-3" placeholder="Category" value={requestForm.category} onChange={(e) => setRequestForm({ ...requestForm, category: e.target.value })} />
              <input className="rounded-2xl border px-4 py-3" placeholder="Estimated amount" value={requestForm.estimated_amount} onChange={(e) => setRequestForm({ ...requestForm, estimated_amount: e.target.value })} />
              <select className="rounded-2xl border px-4 py-3" value={requestForm.billing_cycle} onChange={(e) => setRequestForm({ ...requestForm, billing_cycle: e.target.value })}>
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
                <option value="yearly">Yearly</option>
              </select>
              <input className="rounded-2xl border px-4 py-3 md:col-span-2" placeholder="Reason" value={requestForm.reason} onChange={(e) => setRequestForm({ ...requestForm, reason: e.target.value })} />
              <input className="rounded-2xl border px-4 py-3 md:col-span-2" type="file" accept=".pdf,image/*" onChange={(e) => setRequestFile(e.target.files?.[0] || null)} />
              <button className="rounded-2xl bg-slate-950 px-4 py-3 text-white md:col-span-2" disabled={saving}>
                {saving ? "Saving..." : "Send request to org owner"}
              </button>
            </form>
          </div>

          <section className="space-y-4">
            <div className="font-display text-2xl">Recurring request history</div>
            {workspace.recurring_requests.map((item) => (
              <div key={item.id} className="panel p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-medium">{item.name}</div>
                    <div className="mt-1 text-sm text-slate-500">{item.vendor_name} - {item.category}</div>
                  </div>
                  <div className="text-right text-sm uppercase tracking-[0.2em] text-slate-500">{item.status}</div>
                </div>
                <div className="mt-3 text-sm">
                  {item.currency} {Number(item.estimated_amount).toFixed(2)}
                </div>
              </div>
            ))}
            {!workspace.recurring_requests.length ? (
              <EmptyState title="No recurring requests yet" description="Your submitted recurring requests will appear here after you send them." />
            ) : null}
          </section>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="space-y-6">
        <PageHeader
          title="Variable Expense Tracking"
          description="Submit one-off expenses here and follow their approval status. Recurring expenses are hidden from the employee workflow."
        />

        <div className="panel p-6">
          <div className="font-display text-2xl">Submit variable expense</div>
          <form className="mt-4 grid gap-3 md:grid-cols-2" onSubmit={submitEmployeeExpense}>
            <input className="rounded-2xl border px-4 py-3" placeholder="Title" value={employeeForm.title} onChange={(e) => setEmployeeForm({ ...employeeForm, title: e.target.value })} />
            <input className="rounded-2xl border px-4 py-3" placeholder="Vendor" value={employeeForm.vendor_name} onChange={(e) => setEmployeeForm({ ...employeeForm, vendor_name: e.target.value })} />
            <input className="rounded-2xl border px-4 py-3" placeholder="Amount" value={employeeForm.amount} onChange={(e) => setEmployeeForm({ ...employeeForm, amount: e.target.value })} />
            <input className="rounded-2xl border px-4 py-3" type="date" value={employeeForm.expense_date} onChange={(e) => setEmployeeForm({ ...employeeForm, expense_date: e.target.value })} />
            <select className="rounded-2xl border px-4 py-3" value={employeeForm.category_id} onChange={(e) => setEmployeeForm({ ...employeeForm, category_id: e.target.value })}>
              {categories.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
            <input className="rounded-2xl border px-4 py-3" placeholder="Reason" value={employeeForm.description} onChange={(e) => setEmployeeForm({ ...employeeForm, description: e.target.value })} />
            <input className="rounded-2xl border px-4 py-3 md:col-span-2" type="file" accept=".pdf,image/*" onChange={(e) => setEmployeeFile(e.target.files?.[0] || null)} />
            <button className="rounded-2xl bg-slate-950 px-4 py-3 text-white md:col-span-2" disabled={saving}>
              {saving ? "Saving..." : "Submit expense"}
            </button>
          </form>
        </div>

        <section className="space-y-4">
          <div className="font-display text-2xl">Your submitted expenses</div>
          {workspace.variable_expenses.map((item) => (
            <div key={item.id} className="panel p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-medium">{item.title}</div>
                  <div className="mt-1 text-sm text-slate-500">
                    {item.vendor_name || "Vendor pending"} - {new Date(item.expense_date).toLocaleDateString()}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-medium">
                    {item.currency} {Number(item.amount).toFixed(2)}
                  </div>
                  <div className="mt-1 text-sm uppercase tracking-[0.2em] text-slate-500">{item.status}</div>
                </div>
              </div>
              {item.rejection_reason ? <div className="mt-3 text-sm text-rose-700 dark:text-rose-200">Reason: {item.rejection_reason}</div> : null}
            </div>
          ))}
          {!workspace.variable_expenses.length ? (
            <EmptyState title="No submitted expenses yet" description="Your expense history will appear here once you start uploading bills." />
          ) : null}
        </section>
      </div>
    </AppShell>
  );
}
