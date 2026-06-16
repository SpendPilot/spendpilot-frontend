"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

import { AppShell } from "@/components/app-shell";
import { ErrorState, LoadingState, PageHeader } from "@/components/ui";
import { useAuth } from "@/components/auth-provider";
import { apiFetch, getApiError } from "@/lib/api";

type DocumentOut = {
  id: string;
  filename: string;
  status: string;
  content_type: string;
  extracted_text?: string | null;
  created_at: string;
};

type ScanOut = {
  risk_level: string;
  summary: string;
  findings: { title: string; description: string; severity: string }[];
  recommendations: string[];
  provider_status: string;
  extracted_expense?: {
    vendor_name?: string | null;
    invoice_number?: string | null;
    currency?: string | null;
    total_amount?: number | null;
    invoice_date?: string | null;
  } | null;
};

export default function DocumentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { token, profile } = useAuth();
  const [document, setDocument] = useState<DocumentOut | null>(null);
  const [scan, setScan] = useState<ScanOut | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);

  useEffect(() => {
    if (!token || !id) return;

    Promise.all([
      apiFetch<DocumentOut>(`/api/documents/${id}`, { token }),
      apiFetch<ScanOut>(`/api/documents/${id}/scan-result`, { token }).catch(() => null),
    ])
      .then(([nextDocument, nextScan]) => {
        setDocument(nextDocument);
        setScan(nextScan);
      })
      .catch((err) => setError(getApiError(err)))
      .finally(() => setLoading(false));
  }, [id, token]);

  async function triggerScan() {
    if (!token || !id) return;
    setScanning(true);
    setError(null);
    try {
      const nextScan = await apiFetch<ScanOut>(`/api/documents/${id}/scan`, {
        method: "POST",
        token,
      });
      setScan(nextScan);
    } catch (err) {
      setError(getApiError(err));
    } finally {
      setScanning(false);
    }
  }

  if (loading) return <LoadingState label="Loading document..." />;
  if (error) return <ErrorState label={error} />;
  if (!document) return <ErrorState label="Document not found." />;

  return (
    <AppShell>
      <div className="space-y-6">
        <PageHeader
          title={document.filename}
          description="Review extracted spend signals, OCR text, and the latest finance-focused AI findings for this document."
        />

        <div className="panel p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-sm uppercase tracking-[0.25em] text-slate-400">{document.content_type}</div>
              <div className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                Uploaded {new Date(document.created_at).toLocaleString()}
              </div>
            </div>
            <button
              type="button"
              onClick={() => void triggerScan()}
              className="rounded-2xl bg-slate-950 px-4 py-3 text-sm font-medium text-white dark:bg-white dark:text-slate-950"
            >
              {scanning ? "Scanning..." : "Run scan"}
            </button>
          </div>
        </div>

        {scan?.extracted_expense ? (
          <div className="panel grid gap-4 p-6 xl:grid-cols-4">
            <div>
              <div className="text-sm uppercase tracking-[0.25em] text-slate-400">Vendor</div>
              <div className="mt-2 font-medium">{scan.extracted_expense.vendor_name || "Not detected"}</div>
            </div>
            <div>
              <div className="text-sm uppercase tracking-[0.25em] text-slate-400">Invoice</div>
              <div className="mt-2 font-medium">{scan.extracted_expense.invoice_number || "Not detected"}</div>
            </div>
            <div>
              <div className="text-sm uppercase tracking-[0.25em] text-slate-400">Total</div>
              <div className="mt-2 font-medium">
                {scan.extracted_expense.currency || profile?.organization.default_currency || "INR"}{" "}
                {scan.extracted_expense.total_amount ?? "Not detected"}
              </div>
            </div>
            <div>
              <div className="text-sm uppercase tracking-[0.25em] text-slate-400">Date</div>
              <div className="mt-2 font-medium">{scan.extracted_expense.invoice_date || "Not detected"}</div>
            </div>
          </div>
        ) : null}

        {scan ? (
          <div className="panel space-y-6 p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="text-sm uppercase tracking-[0.25em] text-slate-400">Latest result</div>
                <h2 className="mt-2 font-display text-3xl">{scan.risk_level} risk</h2>
              </div>
              <div className="rounded-full bg-slate-100 px-4 py-2 text-xs uppercase tracking-[0.25em] dark:bg-slate-800">
                {scan.provider_status}
              </div>
            </div>
            <p className="text-sm leading-7 text-slate-600 dark:text-slate-300">{scan.summary}</p>
            <div className="grid gap-4 xl:grid-cols-2">
              <div className="space-y-3">
                <h3 className="font-display text-2xl">Findings</h3>
                {scan.findings.map((finding) => (
                  <div
                    key={`${finding.title}-${finding.description}`}
                    className="rounded-2xl border border-slate-200/80 p-4 dark:border-slate-800"
                  >
                    <div className="text-xs uppercase tracking-[0.25em] text-slate-400">{finding.severity}</div>
                    <div className="mt-2 font-medium">{finding.title}</div>
                    <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{finding.description}</p>
                  </div>
                ))}
              </div>
              <div className="space-y-3">
                <h3 className="font-display text-2xl">Recommendations</h3>
                {scan.recommendations.map((item) => (
                  <div key={item} className="rounded-2xl bg-slate-100/80 px-4 py-3 text-sm dark:bg-slate-800/60">
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : null}

        <div className="panel p-6">
          <h2 className="font-display text-2xl">Extracted text preview</h2>
          <pre className="mt-4 max-h-[420px] overflow-auto whitespace-pre-wrap rounded-2xl bg-slate-100 p-4 text-sm dark:bg-slate-900">
            {document.extracted_text || "No text extracted yet. Run a scan to populate this section."}
          </pre>
        </div>
      </div>
    </AppShell>
  );
}
