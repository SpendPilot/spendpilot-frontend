"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { ArrowUp, Bot, MessageSquarePlus, Sparkles, User2 } from "lucide-react";

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
type PendingMessage = { id: string; role: "user" | "assistant"; content: string; pending?: boolean };

const EXAMPLE_PROMPTS = [
  "How is our cash flow this month?",
  "Show me pending approvals I should review.",
  "Which department is spending the most right now?",
  "Summarize upcoming recurring payments.",
];

const THINKING_COPY = "Thinking through your tenant-scoped finance data...";

function buildPendingMessages(message: string): PendingMessage[] {
  const stamp = Date.now().toString();
  return [
    { id: `pending-user-${stamp}`, role: "user", content: message, pending: true },
    { id: `pending-assistant-${stamp}`, role: "assistant", content: THINKING_COPY, pending: true },
  ];
}

function sessionPreview(session: ChatSession) {
  const lastAssistant = [...session.messages].reverse().find((item) => item.role === "assistant");
  if (lastAssistant?.content) return lastAssistant.content;
  return `${session.messages.length} message${session.messages.length === 1 ? "" : "s"}`;
}

export default function AIInsightsPage() {
  const { token, profile } = useAuth();
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingMessages, setPendingMessages] = useState<PendingMessage[]>([]);
  const [composerHint, setComposerHint] = useState("Ask about budgets, approvals, spend trends, urgent payments, or documents.");
  const transcriptRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const load = useCallback(async (preferredSessionId?: string | null) => {
    if (!token) return;
    setError(null);
    const nextSessions = await apiFetch<ChatSession[]>("/api/ai/sessions", { token });
    setSessions(nextSessions);
    setSelectedSessionId((current) => {
      if (preferredSessionId === null) return nextSessions[0]?.id || null;
      if (preferredSessionId) return nextSessions.find((item) => item.id === preferredSessionId)?.id || nextSessions[0]?.id || null;
      if (current && nextSessions.some((item) => item.id === current)) return current;
      return nextSessions[0]?.id || null;
    });
  }, [token]);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    load()
      .catch((err) => setError(getApiError(err)))
      .finally(() => setLoading(false));
  }, [load, token]);

  const activeSession = sessions.find((item) => item.id === selectedSessionId) || sessions[0] || null;
  const latestAssistantMessage = [...(activeSession?.messages || [])].reverse().find((item) => item.role === "assistant");
  const renderedMessages = activeSession ? [...activeSession.messages, ...pendingMessages] : pendingMessages;

  useEffect(() => {
    const container = transcriptRef.current;
    if (!container) return;
    container.scrollTo({ top: container.scrollHeight, behavior: "smooth" });
  }, [selectedSessionId, sessions, pendingMessages, sending]);

  useEffect(() => {
    if (sending) return;
    textareaRef.current?.focus();
  }, [selectedSessionId, sending]);

  async function ask(event?: React.FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    const nextMessage = message.trim();
    if (!token || !nextMessage || sending) return;

    setSending(true);
    setError(null);
    setPendingMessages(buildPendingMessages(nextMessage));

    const requestedSessionId = selectedSessionId;

    try {
      await apiFetch("/api/ai/chat", {
        method: "POST",
        token,
        body: JSON.stringify({ message: nextMessage, session_id: requestedSessionId }),
      });
      setMessage("");
      setComposerHint("Follow up naturally, ask for detail, or switch to another finance question.");
      await load(requestedSessionId);
      setPendingMessages([]);
    } catch (nextError) {
      setPendingMessages([]);
      setError(getApiError(nextError));
    } finally {
      setSending(false);
    }
  }

  function handlePrompt(prompt: string) {
    setMessage(prompt);
    setComposerHint("Press Enter to send. Use Shift+Enter for a new line.");
    textareaRef.current?.focus();
  }

  function handleNewChat() {
    setSelectedSessionId(null);
    setPendingMessages([]);
    setMessage("");
    setError(null);
    setComposerHint("Start a fresh conversation. The first message will create a new session.");
    textareaRef.current?.focus();
  }

  function handleTextareaKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void ask();
    }
  }

  if (loading) return <LoadingState label="Loading AI insights..." />;
  if (error && sessions.length === 0) return <ErrorState label={error} />;

  return (
    <AppShell>
      <div className="space-y-6">
        <PageHeader
          title="AI Insights"
          description={
            profile?.effective_role === "org_owner"
              ? "A tenant-scoped finance copilot for budgets, approvals, spend signals, and documents."
              : "A tenant-scoped finance copilot limited to the data visible for your current role."
          }
        />
        <div className="grid gap-6 xl:grid-cols-[280px_minmax(0,1fr)]">
          <aside className="panel flex h-[calc(100vh-12.5rem)] flex-col overflow-hidden">
            <div className="border-b border-[rgba(var(--line),0.84)] px-4 py-4">
              <button
                type="button"
                onClick={handleNewChat}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[rgb(var(--ink))] px-4 py-3 text-sm font-medium text-white transition hover:opacity-95"
              >
                <MessageSquarePlus className="h-4 w-4" />
                New chat
              </button>
            </div>
            <div className="flex-1 space-y-2 overflow-y-auto px-3 py-3">
              {sessions.length === 0 ? (
                <div className="rounded-[24px] border border-dashed border-[rgba(var(--line),0.84)] bg-[rgba(var(--panel-muted),0.45)] px-4 py-5 text-sm text-[rgb(var(--muted-strong))]">
                  Start your first conversation to create a saved session.
                </div>
              ) : (
                sessions.map((session) => {
                  const active = session.id === activeSession?.id;
                  return (
                    <button
                      key={session.id}
                      type="button"
                      onClick={() => {
                        setSelectedSessionId(session.id);
                        setPendingMessages([]);
                        setError(null);
                      }}
                      className={`w-full rounded-[24px] border px-4 py-3 text-left transition ${
                        active
                          ? "border-[rgba(var(--ink),0.95)] bg-[rgb(var(--ink))] text-white shadow-lg"
                          : "border-[rgba(var(--line),0.84)] bg-[rgba(var(--panel-muted),0.45)] text-[rgb(var(--foreground))] hover:bg-[rgba(var(--panel-muted),0.82)]"
                      }`}
                    >
                      <div className="truncate text-sm font-semibold">{session.title}</div>
                      <div className={`mt-2 line-clamp-2 text-xs leading-5 ${active ? "text-white/70" : "text-[rgb(var(--muted-strong))]"}`}>
                        {sessionPreview(session)}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
            <div className="border-t border-[rgba(var(--line),0.84)] px-4 py-4">
              <div className="rounded-[24px] bg-[rgba(var(--panel-muted),0.6)] px-4 py-4 text-sm text-[rgb(var(--muted-strong))]">
                <div className="flex items-center gap-2 font-medium text-[rgb(var(--foreground))]">
                  <Sparkles className="h-4 w-4" />
                  Grounded responses
                </div>
                <div className="mt-2 leading-6">Replies stay scoped to your visible tenant data and compact SpendPilot knowledge.</div>
              </div>
            </div>
          </aside>

          <section className="panel flex h-[calc(100vh-12.5rem)] flex-col overflow-hidden">
            <div className="border-b border-[rgba(var(--line),0.84)] px-5 py-4 sm:px-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-sm font-semibold text-[rgb(var(--foreground))]">
                    {activeSession?.title || "New conversation"}
                  </div>
                  <div className="mt-1 text-sm text-[rgb(var(--muted-strong))]">
                    Ask naturally. The assistant should feel conversational while staying finance-grounded.
                  </div>
                </div>
                <div className="rounded-full bg-[rgba(var(--panel-muted),0.72)] px-3 py-1 text-xs font-medium text-[rgb(var(--muted-strong))]">
                  {sending ? "Responding..." : "Ready"}
                </div>
              </div>
            </div>

            <div
              ref={transcriptRef}
              className="flex-1 overflow-y-auto bg-[linear-gradient(180deg,rgba(var(--panel-muted),0.3),rgba(var(--panel),0.1))] px-4 py-6 sm:px-6"
            >
              {renderedMessages.length === 0 ? (
                <div className="mx-auto flex max-w-3xl flex-col items-center gap-6 py-12 text-center">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[rgb(var(--ink))] text-white shadow-lg">
                    <Sparkles className="h-6 w-6" />
                  </div>
                  <div>
                    <div className="text-2xl font-semibold text-[rgb(var(--foreground))]">How can I help with SpendPilot today?</div>
                    <div className="mt-3 max-w-2xl text-sm leading-7 text-[rgb(var(--muted-strong))]">
                      Ask for cash-flow interpretation, approval queues, department spend breakdowns, recurring payment summaries, or relevant
                      document context.
                    </div>
                  </div>
                  <div className="grid w-full gap-3 sm:grid-cols-2">
                    {EXAMPLE_PROMPTS.map((prompt) => (
                      <button
                        key={prompt}
                        type="button"
                        onClick={() => handlePrompt(prompt)}
                        className="rounded-[24px] border border-[rgba(var(--line),0.84)] bg-[rgba(var(--panel),0.92)] px-4 py-4 text-left text-sm text-[rgb(var(--foreground))] transition hover:-translate-y-0.5 hover:bg-[rgba(var(--panel),1)]"
                      >
                        {prompt}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="mx-auto max-w-4xl space-y-6">
                  {renderedMessages.map((item) => {
                    const assistant = item.role === "assistant";
                    return (
                      <div key={item.id} className={`flex gap-4 ${assistant ? "items-start" : "justify-end"}`}>
                        {assistant ? (
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[rgb(var(--ink))] text-white shadow-md">
                            <Bot className="h-5 w-5" />
                          </div>
                        ) : null}
                        <div className={`${assistant ? "max-w-3xl" : "max-w-2xl"}`}>
                          <div className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.18em] text-[rgb(var(--muted-strong))]">
                            {assistant ? "Assistant" : "You"}
                            {"pending" in item && item.pending ? <span className="normal-case tracking-normal">typing...</span> : null}
                          </div>
                          <div
                            className={`rounded-[28px] px-5 py-4 text-sm leading-7 shadow-sm ${
                              assistant
                                ? "border border-[rgba(var(--line),0.84)] bg-[rgba(var(--panel),0.98)] text-[rgb(var(--foreground))]"
                                : "bg-[rgb(var(--ink))] text-white"
                            }`}
                          >
                            <div className="whitespace-pre-wrap">{item.content}</div>
                            {"sources" in item && item.sources && item.sources.length > 0 ? (
                              <div className="mt-4 flex flex-wrap gap-2">
                                {item.sources.map((source, index) => (
                                  <span
                                    key={`${item.id}-${source.label}-${index}`}
                                    className="rounded-full border border-[rgba(var(--line),0.84)] bg-[rgba(var(--panel-muted),0.65)] px-2.5 py-1 text-[11px] font-medium text-[rgb(var(--muted-strong))]"
                                  >
                                    {source.label}
                                  </span>
                                ))}
                              </div>
                            ) : null}
                            {"grounded_context" in item && item.grounded_context ? (
                              <div className="mt-4 flex flex-wrap gap-2 text-xs text-[rgb(var(--muted-strong))]">
                                {item.grounded_context.confidence ? (
                                  <span className="rounded-full bg-[rgba(var(--panel-muted),0.72)] px-2.5 py-1">
                                    Confidence: {item.grounded_context.confidence}
                                  </span>
                                ) : null}
                                {item.grounded_context.fallback_used ? (
                                  <span className="rounded-full bg-[rgba(var(--panel-muted),0.72)] px-2.5 py-1">Fallback response</span>
                                ) : null}
                              </div>
                            ) : null}
                          </div>
                        </div>
                        {!assistant ? (
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[rgba(var(--panel-muted),0.84)] text-[rgb(var(--foreground))] shadow-sm">
                            <User2 className="h-5 w-5" />
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="border-t border-[rgba(var(--line),0.84)] bg-[rgba(var(--panel),0.96)] px-4 py-4 backdrop-blur sm:px-6">
              {error ? (
                <div className="mb-4">
                  <ErrorState label={error} />
                </div>
              ) : null}

              {latestAssistantMessage?.suggested_followups?.length ? (
                <div className="mb-4 flex flex-wrap gap-2">
                  {latestAssistantMessage.suggested_followups.map((prompt) => (
                    <button
                      key={prompt}
                      type="button"
                      onClick={() => handlePrompt(prompt)}
                      className="rounded-full border border-[rgba(var(--line),0.84)] bg-[rgba(var(--panel-muted),0.55)] px-3 py-2 text-sm text-[rgb(var(--foreground))] transition hover:bg-[rgba(var(--panel-muted),0.82)]"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              ) : null}

              <form onSubmit={ask} className="mx-auto max-w-4xl">
                <div className="rounded-[30px] border border-[rgba(var(--line),0.9)] bg-[rgba(var(--panel),0.98)] p-3 shadow-lg">
                  <textarea
                    ref={textareaRef}
                    className="min-h-[88px] w-full resize-none bg-transparent px-3 py-2 text-sm leading-7 text-[rgb(var(--foreground))] outline-none placeholder:text-[rgb(var(--muted-strong))]"
                    value={message}
                    onChange={(event) => setMessage(event.target.value)}
                    onKeyDown={handleTextareaKeyDown}
                    placeholder="Message SpendPilot AI about cash flow, approvals, budgets, documents, or payment priorities..."
                  />
                  <div className="mt-3 flex flex-col gap-3 border-t border-[rgba(var(--line),0.68)] px-3 pt-3 sm:flex-row sm:items-end sm:justify-between">
                    <div className="space-y-2">
                      <div className="text-xs text-[rgb(var(--muted-strong))]">{composerHint}</div>
                      {!activeSession && !sending ? (
                        <div className="text-xs text-[rgb(var(--muted-strong))]">This message will start a new chat session.</div>
                      ) : null}
                    </div>
                    <div className="flex items-center gap-2 self-end">
                      <button
                        type="button"
                        onClick={() => handlePrompt(EXAMPLE_PROMPTS[0])}
                        className="rounded-full border border-[rgba(var(--line),0.84)] px-3 py-2 text-xs font-medium text-[rgb(var(--muted-strong))] transition hover:bg-[rgba(var(--panel-muted),0.72)]"
                      >
                        Use example
                      </button>
                      <button
                        type="submit"
                        disabled={sending || !message.trim()}
                        className="flex h-11 w-11 items-center justify-center rounded-full bg-[rgb(var(--ink))] text-white transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-45"
                        aria-label={sending ? "Sending message" : "Send message"}
                      >
                        <ArrowUp className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                </div>
              </form>
            </div>
          </section>
        </div>
      </div>
    </AppShell>
  );
}
