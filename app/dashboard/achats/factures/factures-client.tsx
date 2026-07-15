"use client";

import { useState } from "react";
import { CheckCircle2, Clock, AlertCircle, Trash2, FileCheck, X } from "lucide-react";
import { markInvoicePaid, deleteInvoice, completeInvoice } from "./actions";
import { toast } from "sonner";

interface Invoice {
  id: string;
  invoiceNumber: string;
  invoiceDate: string | Date;
  dueDate?: string | Date | null;
  amountHT: number;
  amountTVA: number;
  amountTTC: number;
  amountImposable?: number | null;
  amountNonImposable?: number | null;
  invoiceStatus?: string | null;
  paid: boolean;
  paidAt?: string | Date | null;
  note?: string | null;
  supplier: { name: string };
  order?: { number: string } | null;
}

interface Props {
  invoices: Invoice[];
  suppliers: { id: string; name: string }[];
  isDF?: boolean;
}

const fmt = (n: number) => new Intl.NumberFormat("fr-CI").format(n);

export function FacturesClient({ invoices, isDF }: Props) {
  const [filter, setFilter] = useState<"all" | "paid" | "pending" | "overdue" | "provisoire">("all");
  const [loading, setLoading] = useState<string | null>(null);
  const [completing, setCompleting] = useState<Invoice | null>(null);
  const [imposable, setImposable] = useState("");
  const [nonImposable, setNonImposable] = useState("");

  const now = new Date();

  const filtered = invoices.filter((inv) => {
    if (filter === "paid") return inv.paid;
    if (filter === "pending") return !inv.paid;
    if (filter === "overdue") return !inv.paid && inv.dueDate && new Date(inv.dueDate) < now;
    if (filter === "provisoire") return (inv.invoiceStatus || "PROVISOIRE") === "PROVISOIRE";
    return true;
  });

  const provisoireCount = invoices.filter((i) => (i.invoiceStatus || "PROVISOIRE") === "PROVISOIRE").length;

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

  function openComplete(inv: Invoice) {
    setCompleting(inv);
    const ht = Number(inv.amountHT);
    setImposable(inv.amountImposable != null ? String(inv.amountImposable) : String(ht));
    setNonImposable(inv.amountNonImposable != null ? String(inv.amountNonImposable) : "0");
  }

  async function handleComplete() {
    if (!completing) return;
    const imp = parseFloat(imposable) || 0;
    const nimp = parseFloat(nonImposable) || 0;
    setLoading(completing.id);
    const result = await completeInvoice(completing.id, imp, nimp);
    if (result.success) {
      toast.success("Répartition enregistrée — facture complète.");
      setCompleting(null);
    } else {
      toast.error(result.error || "Erreur");
    }
    setLoading(null);
  }

  function getPayStatus(inv: Invoice) {
    if (inv.paid) return { label: "Payée", color: "bg-green-100 text-green-700", icon: CheckCircle2 };
    if (inv.dueDate && new Date(inv.dueDate) < now)
      return { label: "En retard", color: "bg-red-100 text-red-700", icon: AlertCircle };
    return { label: "En attente", color: "bg-orange-100 text-orange-700", icon: Clock };
  }

  return (
    <>
      {/* Completion modal */}
      {completing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-gray-900">Compléter la facture</h3>
              <button onClick={() => setCompleting(null)} className="p-1.5 hover:bg-gray-100 rounded-lg">
                <X className="w-4 h-4 text-gray-400" />
              </button>
            </div>
            <p className="text-xs text-gray-500 mb-4">
              Facture <span className="font-semibold text-gray-700">{completing.invoiceNumber}</span> —{" "}
              Montant HT total : <span className="font-bold text-gray-900">{fmt(Number(completing.amountHT))} FCFA</span>
            </p>

            <div className="space-y-3 mb-5">
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">
                  Partie imposable (FCFA) *
                </label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={imposable}
                  onChange={(e) => setImposable(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-right tabular-nums focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">
                  Partie non-imposable (FCFA) *
                </label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={nonImposable}
                  onChange={(e) => setNonImposable(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-right tabular-nums focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="rounded-lg bg-gray-50 px-3 py-2 flex justify-between text-sm">
                <span className="text-gray-500">Total saisi</span>
                <span className={`font-semibold tabular-nums ${
                  Math.abs((parseFloat(imposable) || 0) + (parseFloat(nonImposable) || 0) - Number(completing.amountHT)) <= 1
                    ? "text-green-600"
                    : "text-red-600"
                }`}>
                  {fmt((parseFloat(imposable) || 0) + (parseFloat(nonImposable) || 0))} FCFA
                </span>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setCompleting(null)}
                className="flex-1 py-2 text-sm text-gray-500 border border-gray-200 rounded-xl hover:bg-gray-50"
              >
                Annuler
              </button>
              <button
                onClick={handleComplete}
                disabled={!!loading}
                className="flex-1 py-2 text-sm font-semibold text-white bg-[#0369A1] hover:bg-blue-700 rounded-xl disabled:opacity-50"
              >
                {loading ? "Enregistrement…" : "Valider la répartition"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {/* Filters */}
        <div className="flex flex-wrap gap-1 p-4 border-b border-gray-50">
          {[
            { key: "all", label: "Toutes" },
            { key: "provisoire", label: `À compléter${provisoireCount > 0 ? ` (${provisoireCount})` : ""}` },
            { key: "pending", label: "En attente" },
            { key: "overdue", label: "En retard" },
            { key: "paid", label: "Payées" },
          ].map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key as any)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                filter === f.key
                  ? f.key === "provisoire"
                    ? "bg-yellow-400 text-yellow-900"
                    : "bg-orange-500 text-white"
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
                <th className="text-right px-5 py-3">Imposable</th>
                <th className="text-right px-5 py-3">Non-imp.</th>
                <th className="text-right px-5 py-3">HT</th>
                <th className="text-right px-5 py-3">TVA</th>
                <th className="text-right px-5 py-3">TTC</th>
                <th className="text-left px-5 py-3">Statut</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={12} className="text-center py-12 text-gray-300 text-sm">
                    Aucune facture
                  </td>
                </tr>
              ) : (
                filtered.map((inv) => {
                  const payStatus = getPayStatus(inv);
                  const StatusIcon = payStatus.icon;
                  const isOverdue = !inv.paid && inv.dueDate && new Date(inv.dueDate) < now;
                  const isProvisoire = (inv.invoiceStatus || "PROVISOIRE") === "PROVISOIRE";
                  return (
                    <tr key={inv.id} className={`hover:bg-gray-50/50 transition-colors ${isProvisoire ? "bg-yellow-50/40" : ""}`}>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-gray-900">{inv.invoiceNumber}</span>
                          {isProvisoire && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-yellow-100 text-yellow-700 border border-yellow-200">
                              PROV.
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-3 text-gray-600">{inv.supplier.name}</td>
                      <td className="px-5 py-3 text-gray-400 text-xs">{inv.order?.number || "—"}</td>
                      <td className="px-5 py-3 text-gray-500 text-xs">
                        {new Date(inv.invoiceDate).toLocaleDateString("fr-CI")}
                      </td>
                      <td className={`px-5 py-3 text-xs font-medium ${isOverdue ? "text-red-500" : "text-gray-500"}`}>
                        {inv.dueDate ? new Date(inv.dueDate).toLocaleDateString("fr-CI") : "—"}
                      </td>
                      <td className="px-5 py-3 text-right tabular-nums text-xs text-blue-600">
                        {inv.amountImposable != null ? fmt(Number(inv.amountImposable)) : "—"}
                      </td>
                      <td className="px-5 py-3 text-right tabular-nums text-xs text-gray-400">
                        {inv.amountNonImposable != null ? fmt(Number(inv.amountNonImposable)) : "—"}
                      </td>
                      <td className="px-5 py-3 text-right text-gray-600 tabular-nums">
                        {fmt(Number(inv.amountHT))}
                      </td>
                      <td className="px-5 py-3 text-right text-gray-400 tabular-nums text-xs">
                        {fmt(Number(inv.amountTVA))}
                      </td>
                      <td className="px-5 py-3 text-right font-semibold text-gray-900 tabular-nums">
                        {fmt(Number(inv.amountTTC))}
                      </td>
                      <td className="px-5 py-3">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${payStatus.color}`}>
                          <StatusIcon className="w-3 h-3" />
                          {payStatus.label}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-1 justify-end">
                          {isDF && isProvisoire && (
                            <button
                              onClick={() => openComplete(inv)}
                              className="p-1.5 text-yellow-600 hover:bg-yellow-50 rounded-lg transition-colors"
                              title="Compléter la répartition imposable/non-imposable"
                            >
                              <FileCheck className="w-4 h-4" />
                            </button>
                          )}
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
    </>
  );
}
