"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { AppShell } from "@/components/app-shell";
import { ErrorState, PageHeader } from "@/components/ui";
import { useAuth } from "@/components/auth-provider";
import { apiFetch, readErrorMessage } from "@/lib/api";
import { buildApiUrl } from "@/lib/contracts";

type ExtractedExpense = {
  vendor_name?: string | null;
  invoice_number?: string | null;
  currency?: string | null;
  total_amount?: number | null;
  invoice_date?: string | null;
  summary?: string | null;
};

export default function ScanPage() {
  const router = useRouter();
  const { token, profile } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [autoScan, setAutoScan] = useState(true);
  const [createExpenseDraft, setCreateExpenseDraft] = useState(true);
  const [status, setStatus] = useState<string>("Choose a receipt, invoice, or supporting document.");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [preview, setPreview] = useState<ExtractedExpense | null>(null);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!token || !file) return;

    setSubmitting(true);
    setError(null);
    setPreview(null);
    setStatus("Uploading document...");

    try {
      const body = new FormData();
      body.append("file", file);

      const uploadResponse = await fetch(buildApiUrl("/api/documents/upload"), {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body,
      });
      if (!uploadResponse.ok) {
        throw new Error(await readErrorMessage(uploadResponse, "Document upload failed."));
      }

      const uploadPayload = await uploadResponse.json();
      const documentId = uploadPayload.data.document.id as string;
      setStatus("Upload complete.");

      if (autoScan) {
        setStatus("Running scan and invoice extraction...");
        await apiFetch(`/api/documents/${documentId}/scan`, {
          method: "POST",
          token,
        });
      }

      const extracted = await apiFetch<ExtractedExpense>(`/api/documents/${documentId}/extract-expense`, {
        method: "POST",
        token,
      });
      setPreview(extracted);
      setStatus("Expense fields extracted.");

      if (createExpenseDraft && extracted.total_amount) {
        setStatus("Creating draft expense...");
        await apiFetch("/api/finance/expenses/variable", {
          method: "POST",
          token,
          body: JSON.stringify({
            title: extracted.vendor_name || file.name,
            vendor_name: extracted.vendor_name,
            document_id: documentId,
            currency: extracted.currency || profile?.organization.default_currency || "INR",
            amount: extracted.total_amount,
            expense_date: extracted.invoice_date || new Date().toISOString().slice(0, 10),
            description: extracted.summary,
            category_id: "",
          }),
        });
        setStatus("Draft expense created from the uploaded document.");
      }

      router.push(`/documents/${documentId}`);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Upload failed.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AppShell>
      <div className="space-y-6">
        <PageHeader
          title="Capture spend"
          description="Upload an invoice or receipt, run Document Intelligence extraction, and optionally create a draft expense in one flow."
        />

        <form onSubmit={onSubmit} className="panel grid gap-6 p-6 xl:grid-cols-[1fr_0.9fr]">
          <div className="space-y-4">
            <label className="block rounded-3xl border border-dashed border-slate-300 p-6 dark:border-slate-700">
              <span className="text-sm font-medium text-slate-600 dark:text-slate-300">Invoice or receipt</span>
              <input
                type="file"
                accept=".pdf,.txt,.md,.doc,.docx,.png,.jpg,.jpeg"
                className="mt-4 block w-full text-sm"
                onChange={(event) => setFile(event.target.files?.[0] ?? null)}
              />
              <p className="mt-3 text-sm text-slate-500">
                PDFs and images are analyzed with the Document Intelligence invoice model when Azure is configured.
              </p>
            </label>

            <label className="flex items-center gap-3 rounded-2xl bg-slate-100 px-4 py-3 text-sm dark:bg-slate-800/60">
              <input
                type="checkbox"
                checked={autoScan}
                onChange={(event) => setAutoScan(event.target.checked)}
              />
              Run AI scan automatically after upload
            </label>

            <label className="flex items-center gap-3 rounded-2xl bg-slate-100 px-4 py-3 text-sm dark:bg-slate-800/60">
              <input
                type="checkbox"
                checked={createExpenseDraft}
                onChange={(event) => setCreateExpenseDraft(event.target.checked)}
              />
              Create a draft expense when total amount is extracted
            </label>
          </div>

          <div className="space-y-5">
            <div className="rounded-3xl bg-slate-100 p-5 text-sm dark:bg-slate-800/70">
              <div className="font-medium">Current status</div>
              <div className="mt-2 text-slate-600 dark:text-slate-300">{status}</div>
            </div>

            {preview ? (
              <div className="rounded-3xl bg-slate-100 p-5 text-sm dark:bg-slate-800/70">
                <div className="font-medium">Extracted preview</div>
                <div className="mt-3 space-y-2 text-slate-600 dark:text-slate-300">
                  <div>Vendor: {preview.vendor_name || "Not detected"}</div>
                  <div>Invoice: {preview.invoice_number || "Not detected"}</div>
                  <div>
                    Total: {preview.currency || profile?.organization.default_currency || "INR"}{" "}
                    {preview.total_amount ?? "Not detected"}
                  </div>
                  <div>Date: {preview.invoice_date || "Not detected"}</div>
                </div>
              </div>
            ) : null}

            {error ? <ErrorState label={error} /> : null}

            <button className="w-full rounded-2xl bg-slate-950 px-4 py-3 font-medium text-white dark:bg-white dark:text-slate-950">
              {submitting ? "Processing..." : "Upload and extract"}
            </button>
          </div>
        </form>
      </div>
    </AppShell>
  );
}
