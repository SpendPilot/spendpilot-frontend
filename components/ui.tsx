import { AlertTriangle, Loader2 } from "lucide-react";

export function PageHeader({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="text-xs uppercase tracking-[0.3em] text-slate-400">Business AI workspace</div>
      <h1 className="font-display text-4xl">{title}</h1>
      <p className="max-w-3xl text-slate-600 dark:text-slate-300">{description}</p>
    </div>
  );
}

export function LoadingState({ label }: { label: string }) {
  return (
    <div className="panel flex items-center gap-3 p-6 text-slate-500">
      <Loader2 className="h-5 w-5 animate-spin" />
      {label}
    </div>
  );
}

export function ErrorState({ label }: { label: string }) {
  return (
    <div className="panel flex items-center gap-3 border-rose-300 bg-rose-50 p-6 text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200">
      <AlertTriangle className="h-5 w-5" />
      {label}
    </div>
  );
}

export function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="panel p-10 text-center">
      <h2 className="font-display text-2xl">{title}</h2>
      <p className="mt-3 text-slate-600 dark:text-slate-300">{description}</p>
    </div>
  );
}

export function DataTable({ columns, rows }: { columns: string[]; rows: string[][] }) {
  return (
    <div className="panel overflow-hidden">
      <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800">
        <thead className="bg-slate-50 dark:bg-slate-950/40">
          <tr>
            {columns.map((column) => (
              <th key={column} className="px-5 py-4 text-left text-xs uppercase tracking-[0.25em] text-slate-400">
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 text-sm dark:divide-slate-800">
          {rows.map((row, rowIndex) => (
            <tr key={rowIndex}>
              {row.map((cell, cellIndex) => (
                <td key={cellIndex} className="px-5 py-4">
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

