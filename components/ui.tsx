import { AlertTriangle, Loader2 } from "lucide-react";

export function PageHeader({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex flex-col gap-3">
      <div className="section-kicker">Finance workspace</div>
      <h1 className="font-display text-4xl tracking-tight sm:text-5xl">{title}</h1>
      <p className="max-w-3xl text-sm text-[rgb(var(--muted-strong))] sm:text-base">{description}</p>
    </div>
  );
}

export function LoadingState({ label }: { label: string }) {
  return (
    <div className="panel flex items-center gap-3 p-6 text-sm text-[rgb(var(--muted-strong))]">
      <div className="rounded-full bg-[rgba(var(--primary),0.12)] p-2 text-[rgb(var(--primary-strong))]">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
      {label}
    </div>
  );
}

export function ErrorState({ label }: { label: string }) {
  return (
    <div className="panel flex items-center gap-3 border-[rgba(var(--danger),0.25)] bg-[rgba(var(--danger-soft),0.92)] p-6 text-sm text-[rgb(var(--danger))]">
      <div className="rounded-full bg-white/70 p-2 dark:bg-black/10">
        <AlertTriangle className="h-5 w-5" />
      </div>
      {label}
    </div>
  );
}

export function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="panel p-10 text-center sm:p-12">
      <div className="mx-auto flex max-w-2xl flex-col items-center gap-4">
        <div className="badge-tonal">No items to show</div>
        <h2 className="font-display text-2xl tracking-tight sm:text-3xl">{title}</h2>
        <p className="text-sm text-[rgb(var(--muted-strong))] sm:text-base">{description}</p>
      </div>
    </div>
  );
}

export function DataTable({ columns, rows }: { columns: string[]; rows: string[][] }) {
  return (
    <div className="panel overflow-hidden">
      <table className="min-w-full divide-y">
        <thead className="bg-[rgba(var(--panel-muted),0.8)]">
          <tr>
            {columns.map((column) => (
              <th key={column} className="px-5 py-4 text-left text-[11px] font-medium uppercase tracking-[0.24em] text-[rgb(var(--muted))]">
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y text-sm">
          {rows.map((row, rowIndex) => (
            <tr key={rowIndex} className="bg-transparent transition hover:bg-[rgba(var(--primary),0.04)]">
              {row.map((cell, cellIndex) => (
                <td key={cellIndex} className="px-5 py-4 align-top">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

