"use client";

import { useEffect, useState } from "react";

import { AppShell } from "@/components/app-shell";
import { ErrorState, LoadingState, PageHeader } from "@/components/ui";
import { useAuth } from "@/components/auth-provider";
import { apiFetch, getApiError } from "@/lib/api";

type ChatSource = { label: string; type: string; tool_name?: string };
type GroundedContext = {
  used_tools?: string[];
  time_range?: { label?: string; date_from?: string; date_to?: string; used_default_range?: boolean } | null;
  confidence?: string;
  fallback_used?: boolean;
};
type ChatMessage = {
  id: string;
  role: string;
  content: string;
  sources?: ChatSource[];
  grounded_context?: GroundedContext | null;
  suggested_followups?: string[];
};
type ChatSession = { id: string; title: string; messages: ChatMessage[] };

const EXAMPLE_PROMPTS = [
  "How is our cash flow this month?",
  "Show me pending approvals I should review.",
  "Which department is spending the most right now?",
  "Summarize upcoming recurring payments.",
];

export default function AIInsightsPage() {
  const { token, profile } = useAuth();
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function load() {
    if (!token) return;
    setLoading(true);
    setError(null);
    apiFetch<ChatSession[]>("/api/ai/sessions", { token })
      .then((nextSessions) => {
        setSessions(nextSessions);
        setSelectedSessionId((current) => current || nextSessions[0]?.id || null);
      })
      .catch((err) => setError(getApiError(err)))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    apiFetch<ChatSession[]>("/api/ai/sessions", { token })
      .then((nextSessions) => {
        setSessions(nextSessions);
        setSelectedSessionId(nextSessions[0]?.id || null);
      })
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
        body: JSON.stringify({ message, session_id: selectedSessionId }),
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

  const activeSession = sessions.find((item) => item.id === selectedSessionId) || sessions[0] || null;
  const latestAssistantMessage = [...(activeSession?.messages || [])].reverse().find((item) => item.role === "assistant");

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
        <div className="grid gap-6 lg:grid-cols-[240px_minmax(0,1fr)]">
          <aside className="panel p-4">
            <div className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Sessions</div>
            <div className="mt-4 space-y-2">
              {sessions.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 px-3 py-4 text-sm text-slate-500">
                  Your first chat will create a session automatically.
                </div>
              ) : (
                sessions.map((session) => (
                  <button
                    key={session.id}
                    type="button"
                    onClick={() => setSelectedSessionId(session.id)}
                    className={`w-full rounded-2xl border px-3 py-3 text-left text-sm transition ${
                      session.id === activeSession?.id ? "border-slate-900 bg-slate-950 text-white" : "border-slate-200 bg-white"
                    }`}
                  >
                    <div className="truncate font-medium">{session.title}</div>
                    <div className={`mt-1 text-xs ${session.id === activeSession?.id ? "text-slate-300" : "text-slate-500"}`}>
                      {session.messages.length} messages
                    </div>
                  </button>
                ))
              )}
            </div>
          </aside>
          <div className="space-y-4">
            <div className="panel overflow-hidden">
              <div className="border-b border-slate-200 px-6 py-4">
                <div className="text-sm font-semibold text-slate-900">Grounded finance assistant</div>
                <div className="mt-1 text-sm text-slate-500">
                  Ask about budgets, approvals, spend trends, urgent payments, or relevant documents.
                </div>
              </div>
              <div className="space-y-4 bg-slate-50/70 px-6 py-6">
                {activeSession?.messages?.length ? (
                  activeSession.messages.map((item) => (
                    <div key={item.id} className={`flex ${item.role === "user" ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-3xl rounded-3xl px-4 py-3 ${item.role === "user" ? "bg-slate-950 text-white" : "bg-white text-slate-800"}`}>
                        <div className="text-[11px] uppercase tracking-[0.22em] text-slate-400">{item.role}</div>
                        <div className="mt-2 whitespace-pre-wrap text-sm leading-6">{item.content}</div>
                        {item.sources && item.sources.length > 0 ? (
                          <div className="mt-3 flex flex-wrap gap-2">
                            {item.sources.map((source, index) => (
                              <span
                                key={`${item.id}-${source.label}-${index}`}
                                className="rounded-full border border-slate-200 bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-600"
                              >
                                {source.label}
                              </span>
                            ))}
                          </div>
                        ) : null}
                        {item.grounded_context?.confidence ? (
                          <div className="mt-3 text-xs text-slate-500">
                            Confidence: {item.grounded_context.confidence}
                            {item.grounded_context.fallback_used ? " · fallback response" : ""}
                          </div>
                        ) : null}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-3xl border border-dashed border-slate-200 bg-white px-5 py-6 text-sm text-slate-600">
                    Ask a finance or document question to start a grounded conversation. The assistant will answer from your visible tenant data
                    and compact SpendPilot knowledge, not canned prompts.
                  </div>
                )}
                {sending ? (
                  <div className="flex justify-start">
                    <div className="rounded-3xl bg-white px-4 py-3 text-sm text-slate-500">Thinking through your tenant-scoped data...</div>
                  </div>
                ) : null}
              </div>
            </div>
            <div className="panel p-6">
              <form className="space-y-4" onSubmit={ask}>
                <textarea
                  className="min-h-[132px] w-full rounded-3xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-slate-400"
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  placeholder="Ask a real question, like “What should I review before approving these expenses?”"
                />
                <div className="flex flex-wrap gap-2">
                  {EXAMPLE_PROMPTS.map((prompt) => (
                    <button
                      key={prompt}
                      type="button"
                      onClick={() => setMessage(prompt)}
                      className="rounded-full border border-slate-200 px-3 py-1.5 text-xs text-slate-600 transition hover:border-slate-400 hover:text-slate-900"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
                <div className="flex items-center justify-between gap-3">
                  <div className="text-xs text-slate-500">Responses stay scoped to your visible tenant data and compact knowledge-base context.</div>
                  <button className="rounded-2xl bg-slate-950 px-4 py-3 text-sm text-white" disabled={sending || !message.trim()}>
                    {sending ? "Asking..." : "Send"}
                  </button>
                </div>
              </form>
            </div>
            {latestAssistantMessage?.suggested_followups?.length ? (
              <div className="panel p-4">
                <div className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Suggested follow-ups</div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {latestAssistantMessage.suggested_followups.map((prompt) => (
                    <button
                      key={prompt}
                      type="button"
                      onClick={() => setMessage(prompt)}
                      className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 transition hover:border-slate-400"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
