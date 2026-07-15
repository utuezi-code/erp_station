"use client";

import { useState } from "react";
import { ArrowDownCircle, ArrowUpCircle } from "lucide-react";

interface Movement {
  id: string;
  date: string | Date;
  type: string;
  quantity: number;
  reference?: string | null;
  note?: string | null;
  fuel: { name: string; code: string; unit: string };
  sirPurchase?: { reference: string } | null;
  miseADispo?: { number: string; station: { name: string } } | null;
}

const fmt = (n: number) => new Intl.NumberFormat("fr-CI").format(n);

export function GESTOCIClient({ movements }: { movements: Movement[] }) {
  const [typeFilter, setTypeFilter] = useState("all");
  const [fuelFilter, setFuelFilter] = useState("all");

  const fuels = [...new Map(movements.map((m) => [m.fuel.code, m.fuel])).values()];

  const filtered = movements.filter((m) => {
    if (typeFilter !== "all" && m.type !== typeFilter) return false;
    if (fuelFilter !== "all" && m.fuel.code !== fuelFilter) return false;
    return true;
  });

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50">
        <h2 className="text-sm font-semibold text-gray-900">Historique des mouvements</h2>
        <div className="flex gap-2">
          <select
            value={fuelFilter}
            onChange={(e) => setFuelFilter(e.target.value)}
            className="text-xs border border-gray-200 rounded-lg px-2.5 py-1.5"
          >
            <option value="all">Tous les produits</option>
            {fuels.map((f) => <option key={f.code} value={f.code}>{f.name}</option>)}
          </select>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="text-xs border border-gray-200 rounded-lg px-2.5 py-1.5"
          >
            <option value="all">Entrées & Sorties</option>
            <option value="ENTREE">Entrées seulement</option>
            <option value="SORTIE">Sorties seulement</option>
          </select>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs font-semibold text-gray-400 uppercase tracking-wide border-b border-gray-50">
              <th className="text-left px-5 py-3">Date</th>
              <th className="text-left px-5 py-3">Type</th>
              <th className="text-left px-5 py-3">Produit</th>
              <th className="text-right px-5 py-3">Volume</th>
              <th className="text-left px-5 py-3">Référence</th>
              <th className="text-left px-5 py-3">Origine / Destination</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-12 text-gray-300 text-sm">Aucun mouvement</td>
              </tr>
            ) : filtered.map((m) => {
              const isIn = m.type === "ENTREE";
              const label = isIn ? "Entrée" : "Sortie";
              const origin = isIn
                ? (m.sirPurchase?.reference ? `SIR — ${m.sirPurchase.reference}` : "SIR")
                : (m.miseADispo ? `${m.miseADispo.station.name}` : "Station");
              return (
                <tr key={m.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-5 py-3 text-gray-500 text-xs">{new Date(m.date).toLocaleDateString("fr-CI")}</td>
                  <td className="px-5 py-3">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${isIn ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
                      {isIn ? <ArrowDownCircle className="w-3 h-3" /> : <ArrowUpCircle className="w-3 h-3" />}
                      {label}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 text-xs font-medium">
                      {m.fuel.code}
                    </span>
                  </td>
                  <td className={`px-5 py-3 text-right tabular-nums font-semibold ${isIn ? "text-green-600" : "text-red-500"}`}>
                    {isIn ? "+" : "−"}{fmt(Number(m.quantity))} <span className="font-normal text-gray-400 text-xs">{m.fuel.unit}</span>
                  </td>
                  <td className="px-5 py-3 text-gray-500 text-xs">{m.reference || "—"}</td>
                  <td className="px-5 py-3 text-gray-600 text-xs">{origin}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
