"use client";

import { useRouter } from "next/navigation";

interface Period {
  value: string;
  label: string;
}

export function PeriodSelect({ periods, current }: { periods: Period[]; current: string }) {
  const router = useRouter();
  return (
    <select
      value={current}
      onChange={(e) => router.push(`/dashboard/classement?period=${e.target.value}`)}
      className="rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 bg-white"
    >
      {periods.map((p) => (
        <option key={p.value} value={p.value}>{p.label}</option>
      ))}
    </select>
  );
}
