"use client";

import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export function MetricStrip({ metrics }: { metrics: { label: string; value: number }[] }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
      {metrics.map((metric) => (
        <div key={metric.label} className="panel p-5">
          <div className="text-sm text-slate-400">{metric.label}</div>
          <div className="mt-3 font-display text-3xl">{metric.value}</div>
        </div>
      ))}
    </div>
  );
}

export function ChartPanel({
  title,
  kind,
  data,
  xKey,
  yKey,
}: {
  title: string;
  kind: "line" | "bar";
  data: any[];
  xKey: string;
  yKey: string;
}) {
  return (
    <div className="panel p-6">
      <h2 className="font-display text-2xl">{title}</h2>
      <div className="mt-6 h-72">
        <ResponsiveContainer width="100%" height="100%">
          {kind === "line" ? (
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} />
              <XAxis dataKey={xKey} />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey={yKey} stroke="#0ea5e9" strokeWidth={3} dot={false} />
            </LineChart>
          ) : (
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} />
              <XAxis dataKey={xKey} />
              <YAxis />
              <Tooltip />
              <Bar dataKey={yKey} fill="#f97316" radius={[10, 10, 0, 0]} />
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
}

