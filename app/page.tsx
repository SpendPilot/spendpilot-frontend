import Link from "next/link";

export default function HomePage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-16">
      <div className="grid w-full max-w-6xl gap-8 lg:grid-cols-[1.15fr_0.85fr]">
        <section className="panel panel-grid relative overflow-hidden p-10 sm:p-12">
          <div aria-hidden="true" className="absolute right-[-8%] top-[-10%] h-56 w-56 rounded-full bg-[rgba(var(--primary),0.12)] blur-3xl" />
          <div className="space-y-8">
            <div>
              <p className="section-kicker text-[rgb(var(--primary))]">Spend control workspace</p>
              <h1 className="mt-4 font-display text-5xl leading-tight tracking-tight text-slate-950 dark:text-white">
                Keep budgets, approvals, expenses, and bill review in one calm operational workspace.
              </h1>
            </div>
            <p className="max-w-2xl text-lg text-[rgb(var(--muted-strong))]">
              Track spending, review documents, and move requests through the right approval path without losing context across teams.
            </p>
            <div className="grid gap-4 sm:grid-cols-3">
              {[
                ["Role-aware access", "Each workspace adapts to owners, department leads, and employees."],
                ["Operational visibility", "See current budget pressure, approval queues, and upcoming payment work."],
                ["Document review", "Upload bills and keep extracted details close to the expense workflow."],
              ].map(([title, description]) => (
                <div key={title} className="panel-soft rounded-[24px] p-5">
                  <div className="font-display text-xl tracking-tight">{title}</div>
                  <div className="mt-2 text-sm text-[rgb(var(--muted-strong))]">{description}</div>
                </div>
              ))}
            </div>
          </div>
        </section>
        <section className="panel p-10 sm:p-12">
          <div className="section-kicker">Start here</div>
          <h2 className="mt-4 font-display text-3xl tracking-tight">Open your workspace</h2>
          <p className="mt-3 text-[rgb(var(--muted-strong))]">
            Sign in to review current spending, manage approvals, or continue your department onboarding.
          </p>
          <Link
            className="btn-primary mt-8"
            href="/login"
          >
            Sign in
          </Link>
        </section>
      </div>
    </main>
  );
}
