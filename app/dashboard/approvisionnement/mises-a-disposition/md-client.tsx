"use client";

import { useState } from "react";
import { updateMDStatus } from "../actions";
import { toast } from "sonner";

interface MD {
  id: string;
  number: string;
  date: string | Date;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  status: string;
  note?: string | null;
  station: { name: string; code: string };
  fuel: { name: string; code: string; unit: string };
}

interface Props {
  mds: MD[];
  fuels: { id: string; name: string; code: string }[];
  stations: { id: string; name: string; code: string }[];
  canCreate: boolean;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; next?: string; nextLabel?: string }> = {
  EMISE: { label: "Émise", color: "bg-blue-100 text-blue-700", next: "LIVREE", nextLabel: "Confirmer livraison" },
  LIVREE: { label: "Livrée", color: "bg-green-100 text-green-700", next: "CONFIRMEE", nextLabel: "Confirmer réception" },
  CONFIRMEE: { label: "Confirmée", color: "bg-gray-100 text-gray-600" },
};

const fmt = (n: number) => new Intl.NumberFormat("fr-CI").format(n);

export function MDClient({ mds, fuels, stations }: Props) {
  const [stationFilter, setStationFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [fuelFilter, setFuelFilter] = useState("all");
  const [loading, setLoading] = useState<string | null>(null);

  const filtered = mds.filter((m) => {
    if (stationFilter !== "all" && m.station.code !== stationFilter) return false;
    if (fuelFilter !== "all" && m.fuel.code !== fuelFilter) return false;
    if (statusFilter !== "all" && m.status !== statusFilter) return false;
    return true;
  });

  async function handleNext(md: MD) {
    const cfg = STATUS_CONFIG[md.status];
    if (!cfg?.next) return;
    setLoading(md.id);
    const result = await updateMDStatus(md.id, cfg.next);
    if (result.success) {
      toast.success(`Statut mis à jour → ${STATUS_CONFIG[cfg.next]?.label}`);
    } else {
      toast.error(result.error || "Erreur");
    }
    setLoading(null);
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="flex flex-wrap gap-2 px-5 py-4 border-b border-gray-50">
        <select value={stationFilter} onChange={(e) => setStationFilter(e.target.value)}
          className="text-xs border border-gray-200 rounded-lg px-2.5 py-1.5">
          <option value="all">Toutes les stations</option>
          {stations.map((s) => <option key={s.id} value={s.code}>{s.name}</option>)}
        </select>
        <select value={fuelFilter} onChange={(e) => setFuelFilter(e.target.value)}
          className="text-xs border border-gray-200 rounded-lg px-2.5 py-1.5">
          <option value="all">Tous les produits</option>
          {fuels.map((f) => <option key={f.id} value={f.code}>{f.name}</option>)}
        </select>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
          className="text-xs border border-gray-200 rounded-lg px-2.5 py-1.5">
          <option value="all">Tous les statuts</option>
          {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs font-semibold text-gray-400 uppercase tracking-wide border-b border-gray-50">
              <th className="text-left px-5 py-3">N° MD</th>
              <th className="text-left px-5 py-3">Date</th>
              <th className="text-left px-5 py-3">Station</th>
              <th className="text-left px-5 py-3">Produit</th>
              <th className="text-right px-5 py-3">Volume</th>
              <th className="text-right px-5 py-3">Prix unit.</th>
              <th className="text-right px-5 py-3">Montant</th>
              <th className="text-left px-5 py-3">Statut</th>
              <th className="px-5 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={9} className="text-center py-12 text-gray-300 text-sm">Aucune mise à disposition</td>
              </tr>
            ) : filtered.map((md) => {
              const cfg = STATUS_CONFIG[md.status] || { label: md.status, color: "bg-gray-100 text-gray-600" };
              return (
                <tr key={md.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-5 py-3 font-semibold text-gray-900">{md.number}</td>
                  <td className="px-5 py-3 text-gray-500 text-xs">{new Date(md.date).toLocaleDateString("fr-CI")}</td>
                  <td className="px-5 py-3 text-gray-700 text-sm">{md.station.name}</td>
                  <td className="px-5 py-3">
                    <span className="inline-flex px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 text-xs font-medium">{md.fuel.code}</span>
                  </td>
                  <td className="px-5 py-3 text-right tabular-nums font-medium text-gray-800">
                    {fmt(Number(md.quantity))} <span className="text-gray-400 text-xs">{md.fuel.unit}</span>
                  </td>
                  <td className="px-5 py-3 text-right tabular-nums text-gray-400 text-xs">{fmt(Number(md.unitPrice))}</td>
                  <td className="px-5 py-3 text-right tabular-nums font-semibold text-gray-900">{fmt(Number(md.totalAmount))}</td>
                  <td className="px-5 py-3">
                    <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${cfg.color}`}>{cfg.label}</span>
                  </td>
                  <td className="px-5 py-3">
                    {cfg.next && (
                      <button
                        onClick={() => handleNext(md)}
                        disabled={loading === md.id}
                        className="text-xs px-3 py-1.5 bg-gray-900 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 whitespace-nowrap"
                      >
                        {loading === md.id ? "…" : cfg.nextLabel}
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
