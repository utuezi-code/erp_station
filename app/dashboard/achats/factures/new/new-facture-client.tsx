"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createInvoice } from "../actions";
import { toast } from "sonner";
import { ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";

interface Props {
  suppliers: { id: string; name: string }[];
  orders: { id: string; number: string; totalTTC: number; supplier: { name: string } }[];
}

export function NewFactureClient({ suppliers, orders }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [amountHT, setAmountHT] = useState("");
  const [tvaRate, setTvaRate] = useState("18");
  const amountTVA = (parseFloat(amountHT) || 0) * (parseFloat(tvaRate) / 100);
  const amountTTC = (parseFloat(amountHT) || 0) + amountTVA;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    try {
      const fd = new FormData(e.currentTarget);
      fd.set("amountTVA", amountTVA.toFixed(2));
      await createInvoice(fd);
      toast.success("Facture enregistrée");
      router.push("/dashboard/achats/factures");
    } catch {
      toast.error("Erreur lors de l'enregistrement");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/achats/factures" className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h2 className="text-xl font-bold text-gray-900">Nouvelle facture</h2>
          <p className="text-sm text-gray-400">Enregistrer une facture fournisseur</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5">
        {/* Fournisseur */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-700">Fournisseur *</label>
            <select name="supplierId" required className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400">
              <option value="">Sélectionner...</option>
              {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-700">BC lié (optionnel)</label>
            <select name="orderId" className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400">
              <option value="">Aucun</option>
              {orders.map((o) => (
                <option key={o.id} value={o.id}>{o.number} — {o.supplier.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Numéro & dates */}
        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-700">N° Facture *</label>
            <input name="invoiceNumber" required placeholder="FACT-2026-001"
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400" />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-700">Date facture *</label>
            <input name="invoiceDate" type="date" required defaultValue={new Date().toISOString().slice(0, 10)}
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400" />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-700">Date échéance</label>
            <input name="dueDate" type="date"
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400" />
          </div>
        </div>

        {/* Montants */}
        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-700">Montant HT (FCFA) *</label>
            <input name="amountHT" type="number" min="0" step="1" required value={amountHT}
              onChange={(e) => setAmountHT(e.target.value)}
              placeholder="0"
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400" />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-700">TVA (%)</label>
            <input type="number" min="0" max="100" value={tvaRate}
              onChange={(e) => setTvaRate(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400" />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-700">Total TTC</label>
            <div className="px-3 py-2.5 rounded-xl border border-gray-100 bg-gray-50 text-sm font-semibold text-gray-900">
              {new Intl.NumberFormat("fr-CI").format(amountTTC)} FCFA
            </div>
          </div>
        </div>

        {/* Note */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-gray-700">Note</label>
          <textarea name="note" rows={2} placeholder="Observations..."
            className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 resize-none" />
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Link href="/dashboard/achats/factures"
            className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-colors">
            Annuler
          </Link>
          <button type="submit" disabled={loading}
            className="flex items-center gap-2 px-5 py-2 bg-[#0369A1] hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-semibold rounded-xl transition-colors">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            Enregistrer
          </button>
        </div>
      </form>
    </div>
  );
}
