"use client";

import { useEffect, useState } from "react";

import { AppShell } from "@/components/app-shell";
import { useAuth } from "@/components/auth-provider";
import { ErrorState, LoadingState, PageHeader } from "@/components/ui";
import { apiFetch, getApiError } from "@/lib/api";

type Member = {
  id: string;
  role: string;
  status: string;
  department?: { id: string; name: string } | null;
  user?: { email: string; display_name: string } | null;
};

type Department = {
  id: string;
  name: string;
  description?: string | null;
};

export default function SettingsPage() {
  const { profile, token } = useAuth();
  const [members, setMembers] = useState<Member[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function load() {
    if (!token) return;
    setLoading(true);
    Promise.all([
      apiFetch<Member[]>("/api/admin/members", { token }).catch(() => []),
      apiFetch<Department[]>("/api/admin/departments", { token }).catch(() => []),
    ])
      .then(([nextMembers, nextDepartments]) => {
        setMembers(nextMembers);
        setDepartments(nextDepartments);
      })
      .catch((nextError) => setError(getApiError(nextError)))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    Promise.all([
      apiFetch<Member[]>("/api/admin/members", { token }).catch(() => []),
      apiFetch<Department[]>("/api/admin/departments", { token }).catch(() => []),
    ])
      .then(([nextMembers, nextDepartments]) => {
        setMembers(nextMembers);
        setDepartments(nextDepartments);
      })
      .catch((nextError) => setError(getApiError(nextError)))
      .finally(() => setLoading(false));
  }, [token]);

  async function updateMember(memberId: string, payload: Record<string, unknown>) {
    if (!token) return;
    setSaving(true);
    setError(null);
    try {
      await apiFetch(`/api/admin/members/${memberId}`, {
        method: "PATCH",
        token,
        body: JSON.stringify(payload),
      });
      load();
    } catch (nextError) {
      setError(getApiError(nextError));
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <LoadingState label="Loading departments and users..." />;
  if (error) return <ErrorState label={error} />;

  if (profile?.effective_role !== "org_owner") {
    return (
      <AppShell>
        <div className="space-y-6">
          <PageHeader
            title="Department Profile"
            description="Your department assignment, role, and current workspace access."
          />
          <div className="panel p-6">
            <div className="font-display text-2xl">{profile?.membership.department?.name || "Department not assigned"}</div>
            <div className="mt-3 text-sm text-slate-600 dark:text-slate-300">
              {profile?.user.display_name} - {profile?.effective_role}
            </div>
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="space-y-6">
        <PageHeader
          title="Manage Departments & Users"
          description="Promote department heads, move users between departments, and deactivate memberships."
        />
        <div className="grid gap-4 md:grid-cols-3">
          {departments.map((department) => {
            const deptMembers = members.filter((member) => member.department?.id === department.id);
            const head = deptMembers.find((member) => member.role === "dept_head" && member.status === "active");
            return (
              <div key={department.id} className="panel p-6">
                <div className="font-display text-2xl">{department.name}</div>
                <div className="mt-2 text-sm text-slate-500">{department.description}</div>
                <div className="mt-4 text-sm">Head: {head?.user?.display_name || "Unassigned"}</div>
                <div className="mt-2 text-sm">Members: {deptMembers.length}</div>
              </div>
            );
          })}
        </div>
        <div className="grid gap-4">
          {members.map((member) => (
            <div key={member.id} className="panel p-6">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="font-display text-2xl">{member.user?.display_name || member.user?.email}</div>
                  <div className="mt-2 text-sm text-slate-500">
                    {member.user?.email} - {member.department?.name || "No department"} - {member.role} - {member.status}
                  </div>
                  {member.role !== "org_owner" ? (
                    <div className="mt-4 flex flex-col gap-2 sm:max-w-xs">
                      <label className="text-xs uppercase tracking-[0.2em] text-slate-400">Department</label>
                      <select
                        className="rounded-2xl border px-4 py-3 text-sm"
                        value={member.department?.id || ""}
                        disabled={saving}
                        onChange={(event) => void updateMember(member.id, { department_id: event.target.value || null })}
                      >
                        <option value="">Unassigned</option>
                        {departments.map((department) => (
                          <option key={department.id} value={department.id}>
                            {department.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : null}
                </div>
                <div className="flex flex-wrap gap-3">
                  {member.role !== "org_owner" ? (
                    <>
                      {member.role === "employee" ? (
                        <button
                          className="rounded-2xl bg-sky-600 px-4 py-3 text-sm text-white"
                          disabled={saving || !member.department?.id}
                          onClick={() => void updateMember(member.id, { role: "dept_head" })}
                        >
                          Promote to dept head
                        </button>
                      ) : (
                        <button
                          className="rounded-2xl border border-slate-300 px-4 py-3 text-sm"
                          disabled={saving}
                          onClick={() => void updateMember(member.id, { role: "employee" })}
                        >
                          Demote to employee
                        </button>
                      )}
                      <button
                        className="rounded-2xl border border-rose-300 px-4 py-3 text-sm text-rose-700"
                        disabled={saving}
                        onClick={() => void updateMember(member.id, { status: member.status === "active" ? "inactive" : "active" })}
                      >
                        {member.status === "active" ? "Deactivate" : "Reactivate"}
                      </button>
                    </>
                  ) : (
                    <div className="rounded-2xl bg-slate-100 px-4 py-3 text-sm dark:bg-slate-800">Bootstrap org owner</div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
