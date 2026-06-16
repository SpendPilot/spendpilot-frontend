"use client";

import { useEffect, useState } from "react";

import { AppShell } from "@/components/app-shell";
import { ErrorState, LoadingState, PageHeader } from "@/components/ui";
import { useAuth } from "@/components/auth-provider";
import { apiFetch, getApiError } from "@/lib/api";

type ChatMessage = { id: string; role: string; content: string };
type ChatSession = { id: string; title: string; messages: ChatMessage[] };

export default function AIInsightsPage() {
  const { token, profile } = useAuth();
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [message, setMessage] = useState("How is my cash flow this month?");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function load() {
    if (!token) return;
    setLoading(true);
    apiFetch<ChatSession[]>("/api/ai/sessions", { token })
      .then(setSessions)
      .catch((err) => setError(getApiError(err)))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    apiFetch<ChatSession[]>("/api/ai/sessions", { token })
      .then(setSessions)
      .catch((err) => setError(getApiError(err)))
      .finally(() => setLoading(false));
  }, [token]);

  async function ask(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token || !message.trim()) return;
    setSending(true);
    setError(null);
    try {
      await apiFetch("/api/ai/chat", {
        method: "POST",
        token,
        body: JSON.stringify({ message, session_id: sessions[0]?.id || null }),
      });
      setMessage("");
      load();
    } catch (nextError) {
      setError(getApiError(nextError));
    } finally {
      setSending(false);
    }
  }

  if (loading) return <LoadingState label="Loading AI insights..." />;
  if (error) return <ErrorState label={error} />;

  return (
    <AppShell>
      <div className="space-y-6">
        <PageHeader
          title="AI Insights"
          description={
            profile?.effective_role === "org_owner"
              ? "Tenant-scoped finance insights across budgets, approvals, departments, and payment priorities."
              : "Tenant-scoped insights limited to the data visible for your current role."
          }
        />
        <div className="panel p-6">
          <form className="space-y-4" onSubmit={ask}>
            <textarea
              className="min-h-[120px] w-full rounded-3xl border px-4 py-3"
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              placeholder="Ask about cash flow, overspending, department usage, or urgent payments."
            />
            <button className="rounded-2xl bg-slate-950 px-4 py-3 text-white" disabled={sending}>
              {sending ? "Asking..." : "Ask AI assistant"}
            </button>
          </form>
        </div>
        <div className="grid gap-4">
          {(sessions[0]?.messages || []).map((item) => (
            <div key={item.id} className="panel p-5">
              <div className="text-xs uppercase tracking-[0.25em] text-slate-400">{item.role}</div>
              <div className="mt-3 text-sm text-slate-700 dark:text-slate-200">{item.content}</div>
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
