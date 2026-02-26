"use client";

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import type { ChartDataPoint } from "@/types";
import { formatDateShort } from "@/lib/utils";

interface MetricsChartProps {
  data: ChartDataPoint[];
  metrics?: ("food" | "water" | "energy")[];
}

const METRIC_CONFIG = {
  food: { color: "#f97316", label: "Food (g)", yAxisId: "grams" },
  water: { color: "#14b8a6", label: "Water (ml)", yAxisId: "ml" },
  energy: { color: "#a78bfa", label: "Energy (1-5)", yAxisId: "energy" },
} as const;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-md border border-stone-300 bg-white p-3 text-xs shadow-lg">
      <p className="mb-1.5 font-semibold text-stone-700">{label}</p>
      {payload.map(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (entry: any) => (
          <div key={entry.dataKey} className="flex items-center gap-2">
            <span
              className="inline-block h-2 w-2 rounded-full"
              style={{ background: entry.color }}
            />
            <span className="text-stone-500">{entry.name}:</span>
            <span className="font-medium text-stone-900">
              {entry.value != null ? entry.value : "—"}
            </span>
          </div>
        )
      )}
    </div>
  );
}

export function MetricsChart({
  data,
  metrics = ["food", "water", "energy"],
}: MetricsChartProps) {
  const chartData = data.map((d) => ({
    ...d,
    date: formatDateShort(d.date),
  }));

  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart
        data={chartData}
        margin={{ top: 4, right: 8, bottom: 0, left: 0 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
        <XAxis
          dataKey="date"
          tick={{ fill: "#71717a", fontSize: 11 }}
          axisLine={{ stroke: "#27272a" }}
          tickLine={false}
        />
        {/* Left axis: grams / ml */}
        <YAxis
          yAxisId="grams"
          orientation="left"
          tick={{ fill: "#71717a", fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          width={40}
        />
        {/* Right axis: energy 1-5 */}
        {metrics.includes("energy") && (
          <YAxis
            yAxisId="energy"
            orientation="right"
            domain={[0, 5]}
            ticks={[1, 2, 3, 4, 5]}
            tick={{ fill: "#71717a", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={25}
          />
        )}
        <YAxis yAxisId="ml" hide />
        <Tooltip content={<CustomTooltip />} />
        <Legend
          wrapperStyle={{ fontSize: 12, color: "#71717a", paddingTop: 12 }}
        />
        {metrics.map((key) => (
          <Line
            key={key}
            yAxisId={METRIC_CONFIG[key].yAxisId}
            type="monotone"
            dataKey={key}
            name={METRIC_CONFIG[key].label}
            stroke={METRIC_CONFIG[key].color}
            strokeWidth={2}
            dot={{ r: 3, fill: METRIC_CONFIG[key].color, strokeWidth: 0 }}
            activeDot={{ r: 5 }}
            connectNulls
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
