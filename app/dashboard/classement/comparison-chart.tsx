"use client";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";

interface StationData {
  stationName: string;
  ca: number;
  volume: number;
  versements: number;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: { name: string; value: number; color: string }[];
  label?: string;
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-lg p-3 text-sm">
      <p className="font-semibold text-gray-900 mb-1">{label}</p>
      {payload.map((entry) => (
        <p key={entry.name} style={{ color: entry.color }}>
          {entry.name} : {entry.value.toLocaleString("fr-CI")} FCFA
        </p>
      ))}
    </div>
  );
}

export function ComparisonChart({ data }: { data: StationData[] }) {
  const chartData = data.map((d) => ({
    name: d.stationName,
    "CA": d.ca,
    "Versements": d.versements,
  }));

  return (
    <ResponsiveContainer width="100%" height={Math.max(300, data.length * 60)}>
      <BarChart
        data={chartData}
        layout="vertical"
        margin={{ top: 10, right: 30, left: 20, bottom: 10 }}
      >
        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
        <XAxis
          type="number"
          tickFormatter={(v) =>
            v >= 1_000_000
              ? `${(v / 1_000_000).toFixed(0)}M`
              : v >= 1_000
              ? `${(v / 1_000).toFixed(0)}k`
              : String(v)
          }
          tick={{ fontSize: 11 }}
        />
        <YAxis
          type="category"
          dataKey="name"
          width={120}
          tick={{ fontSize: 11 }}
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend />
        <Bar dataKey="CA" fill="#f97316" radius={[0, 4, 4, 0]} />
        <Bar dataKey="Versements" fill="#22c55e" radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
