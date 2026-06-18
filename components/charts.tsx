"use client";

import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export function MetricStrip({ metrics }: { metrics: { label: string; value: number }[] }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
      {metrics.map((metric) => (
        <div key={metric.label} className="metric-card">
          <div className="text-sm text-[rgb(var(--muted))]">{metric.label}</div>
          <div className="mt-3 font-display text-3xl tracking-tight">{metric.value}</div>
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
      <div className="section-kicker">Performance view</div>
      <h2 className="mt-2 font-display text-2xl tracking-tight">{title}</h2>
      <div className="mt-6 h-72">
        <ResponsiveContainer width="100%" height="100%">
          {kind === "line" ? (
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} vertical={false} />
              <XAxis dataKey={xKey} axisLine={false} tickLine={false} tickMargin={12} />
              <YAxis axisLine={false} tickLine={false} tickMargin={10} />
              <Tooltip
                cursor={{ fill: "rgba(32, 95, 70, 0.08)" }}
                contentStyle={{
                  borderRadius: "18px",
                  border: "1px solid rgba(189, 198, 181, 0.7)",
                  boxShadow: "0 18px 40px rgba(57, 67, 49, 0.12)",
                }}
              />
              <Line type="monotone" dataKey={yKey} stroke="#205f46" strokeWidth={3} dot={false} />
            </LineChart>
          ) : (
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} vertical={false} />
              <XAxis dataKey={xKey} axisLine={false} tickLine={false} tickMargin={12} />
              <YAxis axisLine={false} tickLine={false} tickMargin={10} />
              <Tooltip
                cursor={{ fill: "rgba(32, 95, 70, 0.08)" }}
                contentStyle={{
                  borderRadius: "18px",
                  border: "1px solid rgba(189, 198, 181, 0.7)",
                  boxShadow: "0 18px 40px rgba(57, 67, 49, 0.12)",
                }}
              />
              <Bar dataKey={yKey} fill="#bf6d34" radius={[12, 12, 4, 4]} />
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
}

