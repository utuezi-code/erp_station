"use client";

import { useState } from "react";
import { CheckCircle2, Clock, AlertCircle, Trash2, Eye } from "lucide-react";
import { markInvoicePaid, deleteInvoice } from "./actions";
import { toast } from "sonner";

interface Invoice {
  id: string;
  invoiceNumber: string;
  invoiceDate: string | Date;
  dueDate?: string | Date | null;
  amountHT: number;
  amountTVA: number;
  amountTTC: number;
  paid: boolean;
  paidAt?: string | Date | null;
  note?: string | null;
  supplier: { name: string };
  order?: { number: string } | null;
}

interface Props {
  invoices: Invoice[];
  suppliers: { id: string; name: string }[];
}

const fmt = (n: number) => new Intl.NumberFormat("fr-CI").format(n) + " FCFA";

export function FacturesClient({ invoices }: Props) {
  const [filter, setFilter] = useState<"all" | "paid" | "pending" | "overdue">("all");
  const [loading, setLoading] = useState<string | null>(null);

  const now = new Date();

  const filtered = invoices.filter((inv) => {
    if (filter === "paid") return inv.paid;
    if (filter === "pending") return !inv.paid;
    if (filter === "overdue") return !inv.paid && inv.dueDate && new Date(inv.dueDate) < now;
    return true;
  });

  async function handlePaid(id: string) {
    setLoading(id);
    try {
      await markInvoicePaid(id);
      toast.success("Facture marquée comme payée");
    } catch {
      toast.error("Erreur lors de la mise à jour");
    } finally {
      setLoading(null);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Supprimer cette facture ?")) return;
    setLoading(id);
    try {
      await deleteInvoice(id);
      toast.success("Facture supprimée");
    } catch {
      toast.error("Erreur lors de la suppression");
    } finally {
      setLoading(null);
    }
  }

  function getStatus(inv: Invoice) {
    if (inv.paid) return { label: "Payée", color: "bg-green-100 text-green-700", icon: CheckCircle2 };
    if (inv.dueDate && new Date(inv.dueDate) < now)
      return { label: "En retard", color: "bg-red-100 text-red-700", icon: AlertCircle };
    return { label: "En attente", color: "bg-orange-100 text-orange-700", icon: Clock };
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Filters */}
      <div className="flex flex-wrap gap-1 p-4 border-b border-gray-50">
        {[
          { key: "all", label: "Toutes" },
          { key: "pending", label: "En attente" },
          { key: "overdue", label: "En retard" },
          { key: "paid", label: "Payées" },
        ].map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key as any)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              filter === f.key
                ? "bg-orange-500 text-white"
                : "text-gray-500 hover:bg-gray-100"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs font-semibold text-gray-400 uppercase tracking-wide border-b border-gray-50">
              <th className="text-left px-5 py-3">N° Facture</th>
              <th className="text-left px-5 py-3">Fournisseur</th>
              <th className="text-left px-5 py-3">BC lié</th>
              <th className="text-left px-5 py-3">Date</th>
              <th className="text-left px-5 py-3">Échéance</th>
              <th className="text-right px-5 py-3">Montant HT</th>
              <th className="text-right px-5 py-3">TVA</th>
              <th className="text-right px-5 py-3">Total TTC</th>
              <th className="text-left px-5 py-3">Statut</th>
              <th className="px-5 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={10} className="text-center py-12 text-gray-300 text-sm">
                  Aucune facture
                </td>
              </tr>
            ) : (
              filtered.map((inv) => {
                const status = getStatus(inv);
                const StatusIcon = status.icon;
                const isOverdue = !inv.paid && inv.dueDate && new Date(inv.dueDate) < now;
                return (
                  <tr key={inv.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-5 py-3 font-semibold text-gray-900">{inv.invoiceNumber}</td>
                    <td className="px-5 py-3 text-gray-600">{inv.supplier.name}</td>
                    <td className="px-5 py-3 text-gray-400 text-xs">{inv.order?.number || "—"}</td>
                    <td className="px-5 py-3 text-gray-500 text-xs">
                      {new Date(inv.invoiceDate).toLocaleDateString("fr-CI")}
                    </td>
                    <td className={`px-5 py-3 text-xs font-medium ${isOverdue ? "text-red-500" : "text-gray-500"}`}>
                      {inv.dueDate ? new Date(inv.dueDate).toLocaleDateString("fr-CI") : "—"}
                    </td>
                    <td className="px-5 py-3 text-right text-gray-600 tabular-nums">
                      {new Intl.NumberFormat("fr-CI").format(Number(inv.amountHT))}
                    </td>
                    <td className="px-5 py-3 text-right text-gray-400 tabular-nums text-xs">
                      {new Intl.NumberFormat("fr-CI").format(Number(inv.amountTVA))}
                    </td>
                    <td className="px-5 py-3 text-right font-semibold text-gray-900 tabular-nums">
                      {new Intl.NumberFormat("fr-CI").format(Number(inv.amountTTC))}
                    </td>
                    <td className="px-5 py-3">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${status.color}`}>
                        <StatusIcon className="w-3 h-3" />
                        {status.label}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-1 justify-end">
                        {!inv.paid && (
                          <button
                            onClick={() => handlePaid(inv.id)}
                            disabled={loading === inv.id}
                            className="p-1.5 text-green-500 hover:bg-green-50 rounded-lg transition-colors text-xs font-medium"
                            title="Marquer payée"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(inv.id)}
                          disabled={loading === inv.id}
                          className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          title="Supprimer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
