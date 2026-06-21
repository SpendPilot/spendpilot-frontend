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
  const [composerExpanded, setComposerExpanded] = useState(false);
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

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = "0px";
    const nextHeight = Math.min(textarea.scrollHeight, composerExpanded ? 168 : 88);
    textarea.style.height = `${Math.max(nextHeight, composerExpanded ? 72 : 38)}px`;
  }, [message, composerExpanded]);

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
    setComposerExpanded(true);
    textareaRef.current?.focus();
  }

  function handleNewChat() {
    setSelectedSessionId(null);
    setPendingMessages([]);
    setMessage("");
    setError(null);
    setComposerExpanded(false);
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
      <div className="space-y-3">
        <div className="rounded-[24px] border border-[rgba(var(--line),0.72)] bg-[rgba(var(--panel),0.82)] px-4 py-3 text-sm text-[rgb(var(--muted-strong))] shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-base font-semibold text-[rgb(var(--foreground))]">AI Insights</div>
              <div className="mt-1 text-xs sm:text-sm">
                {profile?.effective_role === "org_owner"
                  ? "Tenant-scoped finance copilot for budgets, approvals, spend signals, and documents."
                  : "Tenant-scoped finance copilot limited to the data visible for your current role."}
              </div>
            </div>
            <div className="hidden rounded-full bg-[rgba(var(--primary-soft),0.82)] px-3 py-1 text-xs font-medium text-[rgb(var(--primary-strong))] sm:block">
              Finance chat
            </div>
          </div>
        </div>
        <div className="grid gap-3 lg:grid-cols-[232px_minmax(0,1fr)] xl:grid-cols-[252px_minmax(0,1fr)]">
          <aside className="panel flex overflow-hidden bg-[linear-gradient(180deg,rgba(var(--panel),0.98),rgba(var(--primary-soft),0.38))] lg:h-[calc(100vh-10rem)] lg:flex-col">
            <div className="border-b border-[rgba(var(--line),0.84)] px-3 py-3">
              <button
                type="button"
                onClick={handleNewChat}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[rgb(var(--primary))] px-3 py-2.5 text-sm font-medium text-white shadow-[0_10px_24px_rgba(var(--primary),0.2)] transition hover:bg-[rgb(var(--primary-strong))]"
              >
                <MessageSquarePlus className="h-4 w-4" />
                New chat
              </button>
            </div>
            <div className="flex-1 overflow-x-auto px-2.5 py-2.5 lg:overflow-y-auto lg:overflow-x-hidden">
              {sessions.length === 0 ? (
                <div className="rounded-[20px] border border-dashed border-[rgba(var(--line),0.84)] bg-[rgba(var(--panel-muted),0.45)] px-4 py-4 text-sm text-[rgb(var(--muted-strong))]">
                  Start your first conversation to create a saved session.
                </div>
              ) : (
                <div className="flex gap-2 lg:grid lg:gap-1.5">
                  {sessions.map((session) => {
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
                        className={`min-w-[200px] rounded-[20px] border px-3 py-2.5 text-left transition lg:min-w-0 ${
                          active
                            ? "border-[rgba(var(--primary),0.95)] bg-[linear-gradient(135deg,rgba(var(--primary),1),rgba(var(--primary-strong),0.94))] text-white shadow-[0_12px_22px_rgba(var(--primary),0.2)]"
                            : "border-[rgba(var(--line),0.84)] bg-[rgba(var(--panel),0.72)] text-[rgb(var(--foreground))] hover:border-[rgba(var(--primary),0.26)] hover:bg-[rgba(var(--panel),0.96)]"
                        }`}
                      >
                        <div className="truncate text-[13px] font-semibold">{session.title}</div>
                        <div className={`mt-1.5 line-clamp-2 text-[11px] leading-4 ${active ? "text-white/70" : "text-[rgb(var(--muted-strong))]"}`}>
                          {sessionPreview(session)}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
            <div className="hidden border-t border-[rgba(var(--line),0.84)] px-3 py-3 lg:block">
              <div className="rounded-[20px] border border-[rgba(var(--primary),0.14)] bg-[linear-gradient(135deg,rgba(var(--primary-soft),0.92),rgba(var(--accent-soft),0.72))] px-3 py-3 text-xs text-[rgb(var(--muted-strong))]">
                <div className="flex items-center gap-2 font-medium text-[rgb(var(--primary-strong))]">
                  <Sparkles className="h-4 w-4" />
                  Grounded responses
                </div>
                <div className="mt-1.5 leading-5">Replies stay scoped to your visible tenant data and compact SpendPilot knowledge.</div>
              </div>
            </div>
          </aside>

          <section className="panel flex min-h-[74vh] flex-col overflow-hidden bg-[linear-gradient(180deg,rgba(var(--panel),0.98),rgba(var(--panel-strong),0.98))] lg:h-[calc(100vh-10rem)] lg:min-h-0">
            <div className="border-b border-[rgba(var(--line),0.84)] px-4 py-3 sm:px-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-[13px] font-semibold text-[rgb(var(--foreground))]">
                    {activeSession?.title || "New conversation"}
                  </div>
                  <div className="mt-1 text-xs leading-5 text-[rgb(var(--muted-strong))]">
                    Ask naturally. The assistant should feel conversational while staying finance-grounded.
                  </div>
                </div>
                <div className="rounded-full border border-[rgba(var(--primary),0.18)] bg-[rgba(var(--primary-soft),0.86)] px-2.5 py-1 text-[11px] font-medium text-[rgb(var(--primary-strong))]">
                  {sending ? "Responding..." : "Ready"}
                </div>
              </div>
            </div>

            <div
              ref={transcriptRef}
              className="flex-1 overflow-y-auto bg-[radial-gradient(circle_at_top,rgba(var(--primary),0.12),transparent_34%),linear-gradient(180deg,rgba(var(--panel-muted),0.36),rgba(var(--panel),0.08))] px-3 py-4 sm:px-4 lg:px-5"
            >
              {renderedMessages.length === 0 ? (
                <div className="mx-auto flex w-full max-w-4xl flex-col items-center gap-4 py-10 text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,rgba(var(--primary),1),rgba(var(--accent),0.95))] text-white shadow-[0_14px_30px_rgba(var(--primary),0.2)]">
                    <Sparkles className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-xl font-semibold text-[rgb(var(--foreground))]">How can I help with SpendPilot today?</div>
                    <div className="mt-2 max-w-2xl text-sm leading-6 text-[rgb(var(--muted-strong))]">
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
                        className="rounded-[20px] border border-[rgba(var(--line),0.84)] bg-[linear-gradient(180deg,rgba(var(--panel),0.98),rgba(var(--accent-soft),0.34))] px-4 py-3.5 text-left text-sm text-[rgb(var(--foreground))] transition hover:-translate-y-0.5 hover:border-[rgba(var(--accent),0.34)] hover:shadow-[0_10px_20px_rgba(var(--accent),0.1)]"
                      >
                        {prompt}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="mx-auto w-full max-w-[980px] space-y-3.5">
                  {renderedMessages.map((item) => {
                    const assistant = item.role === "assistant";
                    return (
                      <div key={item.id} className={`flex w-full gap-2.5 ${assistant ? "items-start" : "justify-end"}`}>
                        {assistant ? (
                          <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[linear-gradient(135deg,rgba(var(--primary),1),rgba(var(--accent),0.92))] text-white shadow-[0_8px_18px_rgba(var(--primary),0.18)]">
                            <Bot className="h-4 w-4" />
                          </div>
                        ) : null}
                        <div className={`${assistant ? "w-full max-w-[860px]" : "w-full max-w-[760px]"}`}>
                          <div className="mb-1.5 flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.15em] text-[rgb(var(--muted-strong))]">
                            {assistant ? "Assistant" : "You"}
                            {"pending" in item && item.pending ? <span className="normal-case tracking-normal">typing...</span> : null}
                          </div>
                          <div
                            className={`rounded-[22px] px-4 py-3 text-[13px] leading-6 shadow-sm ${
                              assistant
                                ? "border border-[rgba(var(--line),0.84)] bg-[linear-gradient(180deg,rgba(var(--panel),0.99),rgba(var(--primary-soft),0.22))] text-[rgb(var(--foreground))] shadow-[0_8px_20px_rgba(var(--shadow-color),0.06)]"
                                : "bg-[linear-gradient(135deg,rgba(var(--primary),1),rgba(var(--primary-strong),0.96))] text-white shadow-[0_10px_22px_rgba(var(--primary),0.18)]"
                            }`}
                          >
                            <div className="whitespace-pre-wrap">{item.content}</div>
                            {"sources" in item && item.sources && item.sources.length > 0 ? (
                              <div className="mt-3 flex flex-wrap gap-1.5">
                                {item.sources.map((source, index) => (
                                  <span
                                    key={`${item.id}-${source.label}-${index}`}
                                    className="rounded-full border border-[rgba(var(--accent),0.18)] bg-[rgba(var(--accent-soft),0.72)] px-2.5 py-1 text-[10px] font-medium text-[rgb(var(--muted-strong))]"
                                  >
                                    {source.label}
                                  </span>
                                ))}
                              </div>
                            ) : null}
                            {"grounded_context" in item && item.grounded_context ? (
                              <div className="mt-3 flex flex-wrap gap-1.5 text-[11px] text-[rgb(var(--muted-strong))]">
                                {item.grounded_context.confidence ? (
                                  <span className="rounded-full bg-[rgba(var(--primary-soft),0.92)] px-2.5 py-1 text-[rgb(var(--primary-strong))]">
                                    Confidence: {item.grounded_context.confidence}
                                  </span>
                                ) : null}
                                {item.grounded_context.fallback_used ? (
                                  <span className="rounded-full bg-[rgba(var(--accent-soft),0.84)] px-2.5 py-1 text-[rgb(var(--muted-strong))]">Fallback response</span>
                                ) : null}
                              </div>
                            ) : null}
                          </div>
                        </div>
                        {!assistant ? (
                          <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-[rgba(var(--line),0.84)] bg-[rgba(var(--panel),0.92)] text-[rgb(var(--foreground))] shadow-sm">
                            <User2 className="h-4 w-4" />
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="border-t border-[rgba(var(--line),0.84)] bg-[rgba(var(--panel),0.96)] px-3 py-3.5 backdrop-blur sm:px-5">
              {error ? (
                <div className="mb-3">
                  <ErrorState label={error} />
                </div>
              ) : null}

              {latestAssistantMessage?.suggested_followups?.length ? (
                <div className="mb-3 flex flex-wrap gap-1.5">
                  {latestAssistantMessage.suggested_followups.map((prompt) => (
                    <button
                      key={prompt}
                      type="button"
                      onClick={() => handlePrompt(prompt)}
                      className="rounded-full border border-[rgba(var(--primary),0.16)] bg-[rgba(var(--primary-soft),0.72)] px-3 py-1.5 text-[12px] text-[rgb(var(--primary-strong))] transition hover:bg-[rgba(var(--primary-soft),0.96)]"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              ) : null}

              <form onSubmit={ask} className="mx-auto w-full max-w-[980px]">
                <div
                  className={`rounded-[24px] border p-2.5 transition-all duration-200 ${
                    composerExpanded || message
                      ? "border-[rgba(var(--primary),0.24)] bg-[linear-gradient(180deg,rgba(var(--panel),0.99),rgba(var(--primary-soft),0.24))] shadow-[0_14px_30px_rgba(var(--primary),0.1)]"
                      : "border-[rgba(var(--line),0.9)] bg-[rgba(var(--panel),0.98)] shadow-md"
                  }`}
                >
                  <textarea
                    ref={textareaRef}
                    className={`w-full resize-none overflow-y-auto bg-transparent px-2.5 text-[13px] leading-6 text-[rgb(var(--foreground))] outline-none placeholder:text-[rgb(var(--muted-strong))] ${
                      composerExpanded || message ? "py-1.5" : "py-1"
                    }`}
                    value={message}
                    onChange={(event) => setMessage(event.target.value)}
                    onFocus={() => setComposerExpanded(true)}
                    onBlur={() => {
                      if (!message.trim()) setComposerExpanded(false);
                    }}
                    onKeyDown={handleTextareaKeyDown}
                    placeholder="Message SpendPilot AI..."
                  />
                  <div className="mt-2.5 flex flex-col gap-2 border-t border-[rgba(var(--line),0.68)] px-2.5 pt-2.5 sm:flex-row sm:items-end sm:justify-between">
                    <div className="space-y-1.5">
                      <div className="text-[11px] text-[rgb(var(--muted-strong))]">{composerHint}</div>
                      {!activeSession && !sending ? (
                        <div className="text-[11px] text-[rgb(var(--muted-strong))]">This message will start a new chat session.</div>
                      ) : null}
                    </div>
                    <div className="flex items-center gap-2 self-end">
                      <button
                        type="button"
                        onClick={() => handlePrompt(EXAMPLE_PROMPTS[0])}
                        className="rounded-full border border-[rgba(var(--accent),0.18)] bg-[rgba(var(--accent-soft),0.56)] px-3 py-1.5 text-[11px] font-medium text-[rgb(var(--muted-strong))] transition hover:bg-[rgba(var(--accent-soft),0.86)]"
                      >
                        Use example
                      </button>
                      <button
                        type="submit"
                        disabled={sending || !message.trim()}
                        className="flex h-9 w-9 items-center justify-center rounded-full bg-[linear-gradient(135deg,rgba(var(--primary),1),rgba(var(--accent),0.94))] text-white shadow-[0_10px_22px_rgba(var(--primary),0.18)] transition hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-45"
                        aria-label={sending ? "Sending message" : "Send message"}
                      >
                        <ArrowUp className="h-4 w-4" />
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
