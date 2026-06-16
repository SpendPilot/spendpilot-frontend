import Link from "next/link";

export default function HomePage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-16">
      <div className="grid w-full max-w-6xl gap-8 lg:grid-cols-[1.15fr_0.85fr]">
        <section className="panel panel-grid overflow-hidden p-10">
          <div className="space-y-8">
            <div>
              <p className="text-sm uppercase tracking-[0.35em] text-sky-500">Spend control platform</p>
              <h1 className="mt-4 font-display text-5xl leading-tight text-slate-950 dark:text-white">
                Give finance teams one Entra-backed workspace for spend, approvals, and AI-assisted invoice review.
              </h1>
            </div>
            <p className="max-w-2xl text-lg text-slate-600 dark:text-slate-300">
              Capture receipts, extract invoice fields, route approvals, track budgets, and keep everything behind
              Azure Front Door, kGateway, and tenant-aware RBAC.
            </p>
            <div className="grid gap-4 sm:grid-cols-3">
              {[
                ["Entra-native", "Use Microsoft Entra ID, tenant-aware membership bootstrap, and app roles."],
                ["Finance-focused", "Manage budgets, expenses, approvals, documents, and audit signals together."],
                ["Azure-first", "Prefer Workload Identity, Blob Storage, Document Intelligence, and AI Foundry."],
              ].map(([title, description]) => (
                <div key={title} className="rounded-3xl border border-slate-200/80 p-5 dark:border-slate-800">
                  <div className="font-display text-xl">{title}</div>
                  <div className="mt-2 text-sm text-slate-500 dark:text-slate-300">{description}</div>
                </div>
              ))}
            </div>
          </div>
        </section>
        <section className="panel p-10">
          <div className="text-sm uppercase tracking-[0.35em] text-slate-400">Start here</div>
          <h2 className="mt-4 font-display text-3xl">Open the finance workspace</h2>
          <p className="mt-3 text-slate-600 dark:text-slate-300">
            The frontend uses same-origin API calls and is designed for Azure Front Door plus kGateway routing.
          </p>
          <Link
            className="mt-8 inline-flex rounded-2xl bg-slate-950 px-5 py-3 text-sm font-medium text-white dark:bg-white dark:text-slate-950"
            href="/login"
          >
            Sign in
          </Link>
        </section>
      </div>
    </main>
  );
}
