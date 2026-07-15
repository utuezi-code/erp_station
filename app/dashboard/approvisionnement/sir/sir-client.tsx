"use client";

import { useState } from "react";
import { updateSIRStatus } from "../actions";
import { toast } from "sonner";

interface Purchase {
  id: string;
  reference: string;
  purchaseDate: string | Date;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  invoiceNumber?: string | null;
  status: string;
  note?: string | null;
  fuel: { name: string; code: string; unit: string };
}

interface Props {
  purchases: Purchase[];
  fuels: { id: string; name: string; code: string }[];
  canCreate: boolean;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; next?: string; nextLabel?: string }> = {
  COMMANDE: { label: "Commandé", color: "bg-amber-100 text-amber-700", next: "LIVRE", nextLabel: "Marquer livré" },
  LIVRE: { label: "Livré GESTOCI", color: "bg-blue-100 text-blue-700", next: "FACTURE", nextLabel: "Marquer facturé" },
  FACTURE: { label: "Facturé", color: "bg-green-100 text-green-700" },
};

const fmt = (n: number) => new Intl.NumberFormat("fr-CI").format(n);

export function SIRClient({ purchases, fuels }: Props) {
  const [fuelFilter, setFuelFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [loading, setLoading] = useState<string | null>(null);

  const filtered = purchases.filter((p) => {
    if (fuelFilter !== "all" && p.fuel.code !== fuelFilter) return false;
    if (statusFilter !== "all" && p.status !== statusFilter) return false;
    return true;
  });

  async function handleNext(p: Purchase) {
    const cfg = STATUS_CONFIG[p.status];
    if (!cfg?.next) return;
    setLoading(p.id);
    const result = await updateSIRStatus(p.id, cfg.next);
    if (result.success) {
      toast.success(`Statut mis à jour → ${STATUS_CONFIG[cfg.next]?.label}`);
    } else {
      toast.error(result.error || "Erreur");
    }
    setLoading(null);
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Filters */}
      <div className="flex flex-wrap gap-3 p-4 border-b border-gray-50">
        <select
          value={fuelFilter}
          onChange={(e) => setFuelFilter(e.target.value)}
          className="text-xs border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">Tous les carburants</option>
          {fuels.map((f) => <option key={f.id} value={f.code}>{f.name}</option>)}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="text-xs border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">Tous les statuts</option>
          {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs font-semibold text-gray-400 uppercase tracking-wide border-b border-gray-50">
              <th className="text-left px-5 py-3">Référence</th>
              <th className="text-left px-5 py-3">Date</th>
              <th className="text-left px-5 py-3">Produit</th>
              <th className="text-right px-5 py-3">Volume</th>
              <th className="text-right px-5 py-3">Prix unit.</th>
              <th className="text-right px-5 py-3">Total</th>
              <th className="text-left px-5 py-3">N° Facture SIR</th>
              <th className="text-left px-5 py-3">Statut</th>
              <th className="px-5 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={9} className="text-center py-12 text-gray-300 text-sm">Aucun achat SIR</td>
              </tr>
            ) : filtered.map((p) => {
              const cfg = STATUS_CONFIG[p.status] || { label: p.status, color: "bg-gray-100 text-gray-600" };
              return (
                <tr key={p.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-5 py-3 font-semibold text-gray-900">{p.reference}</td>
                  <td className="px-5 py-3 text-gray-500 text-xs">{new Date(p.purchaseDate).toLocaleDateString("fr-CI")}</td>
                  <td className="px-5 py-3">
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 text-xs font-medium">
                      {p.fuel.code}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right tabular-nums font-medium text-gray-800">
                    {fmt(Number(p.quantity))} <span className="text-gray-400 text-xs">{p.fuel.unit}</span>
                  </td>
                  <td className="px-5 py-3 text-right tabular-nums text-gray-500 text-xs">{fmt(Number(p.unitPrice))}</td>
                  <td className="px-5 py-3 text-right tabular-nums font-semibold text-gray-900">{fmt(Number(p.totalAmount))}</td>
                  <td className="px-5 py-3 text-gray-400 text-xs">{p.invoiceNumber || "—"}</td>
                  <td className="px-5 py-3">
                    <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${cfg.color}`}>{cfg.label}</span>
                  </td>
                  <td className="px-5 py-3">
                    {cfg.next && (
                      <button
                        onClick={() => handleNext(p)}
                        disabled={loading === p.id}
                        className="text-xs px-3 py-1.5 bg-gray-900 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 whitespace-nowrap"
                      >
                        {loading === p.id ? "…" : cfg.nextLabel}
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
