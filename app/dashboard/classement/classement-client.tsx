"use client";

import { useState } from "react";

interface StationRank {
  stationId: string;
  stationName: string;
  ca: number;
  volume: number;
  versements: number;
  tauxVersement: number;
  marge: number;
}

interface ClassementClientProps {
  byCA: StationRank[];
  byMarge: StationRank[];
  period: string;
}

function fmt(n: number) {
  return n.toLocaleString("fr-CI", { maximumFractionDigits: 0 });
}

const MEDALS = ["🥇", "🥈", "🥉"];

function RankTable({ data, metric }: { data: StationRank[]; metric: "ca" | "marge" }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-xs text-gray-500 border-b border-gray-100">
            <th className="text-left py-3 px-4">Rang</th>
            <th className="text-left py-3 px-4">Station</th>
            <th className="text-right py-3 px-4">CA (FCFA)</th>
            <th className="text-right py-3 px-4">Volume (L)</th>
            <th className="text-right py-3 px-4">Versements (FCFA)</th>
            <th className="text-right py-3 px-4">Taux versement</th>
            {metric === "marge" && <th className="text-right py-3 px-4">Marge (FCFA)</th>}
          </tr>
        </thead>
        <tbody>
          {data.map((row, idx) => (
            <tr
              key={row.stationId}
              className={`border-b border-gray-50 transition-colors ${idx < 3 ? "bg-orange-50/40" : "hover:bg-gray-50"}`}
            >
              <td className="py-3 px-4 font-bold text-gray-700">
                {idx < 3 ? MEDALS[idx] : <span className="text-gray-400">#{idx + 1}</span>}
              </td>
              <td className="py-3 px-4 font-semibold text-gray-900">{row.stationName}</td>
              <td className="py-3 px-4 text-right font-mono text-gray-700">{fmt(row.ca)}</td>
              <td className="py-3 px-4 text-right font-mono text-gray-500">{fmt(row.volume)}</td>
              <td className="py-3 px-4 text-right font-mono text-gray-600">{fmt(row.versements)}</td>
              <td className="py-3 px-4 text-right">
                <span
                  className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${
                    row.tauxVersement >= 80
                      ? "bg-green-100 text-green-700"
                      : row.tauxVersement >= 50
                      ? "bg-amber-100 text-amber-700"
                      : "bg-red-100 text-red-700"
                  }`}
                >
                  {row.tauxVersement}%
                </span>
              </td>
              {metric === "marge" && (
                <td className="py-3 px-4 text-right font-mono font-semibold text-blue-700">{fmt(row.marge)}</td>
              )}
            </tr>
          ))}
          {data.length === 0 && (
            <tr>
              <td colSpan={metric === "marge" ? 7 : 6} className="py-10 text-center text-gray-400">
                Aucune donnée pour cette période.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export function ClassementClient({ byCA, byMarge, period }: ClassementClientProps) {
  const [tab, setTab] = useState<"ca" | "marge">("ca");

  return (
    <div>
      <div className="flex gap-1 p-1 bg-gray-100 rounded-xl w-fit mb-6">
        <button
          onClick={() => setTab("ca")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            tab === "ca" ? "bg-white text-orange-600 shadow-sm" : "text-gray-500 hover:text-gray-700"
          }`}
        >
          Top Ventes
        </button>
        <button
          onClick={() => setTab("marge")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            tab === "marge" ? "bg-white text-orange-600 shadow-sm" : "text-gray-500 hover:text-gray-700"
          }`}
        >
          Top Marges
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <RankTable data={tab === "ca" ? byCA : byMarge} metric={tab} />
      </div>
    </div>
  );
}
