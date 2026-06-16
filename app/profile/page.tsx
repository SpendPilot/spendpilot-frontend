"use client";

import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/ui";
import { useAuth } from "@/components/auth-provider";

export default function ProfilePage() {
  const { profile } = useAuth();

  return (
    <AppShell>
      <div className="space-y-6">
        <PageHeader
          title="Profile"
          description="Your current role, organization, department, and workspace identity."
        />
        <div className="panel p-6">
          <div className="grid gap-3 text-sm text-slate-600 dark:text-slate-300">
            <div>Name: {profile?.user.display_name}</div>
            <div>Email: {profile?.user.email}</div>
            <div>Organization: {profile?.organization.name}</div>
            <div>Role: {profile?.effective_role}</div>
            <div>Department: {profile?.membership.department?.name || "Not assigned"}</div>
            <div>Onboarding complete: {profile?.membership.onboarding_completed ? "Yes" : "No"}</div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
