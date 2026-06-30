"use client";

import { useState } from "react";
import { updateFuelPrice } from "./actions";
import { toast } from "sonner";
import { Pencil, X, Save, Loader2, TrendingUp } from "lucide-react";

interface Fuel {
  id: string;
  name: string;
  code: string;
  salePrice: number;
  purchasePrice: number;
  margin: number;
  unit: string;
  active: boolean;
}

function fmt(n: number) {
  return n.toLocaleString("fr-CI", { maximumFractionDigits: 0 });
}

export function PrixClient({ fuels }: { fuels: Fuel[] }) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>, id: string) {
    e.preventDefault();
    setLoading(true);
    try {
      const fd = new FormData(e.currentTarget);
      const res = await updateFuelPrice(id, fd);
      if (res?.error) toast.error(res.error);
      else { toast.success("Prix mis à jour."); setEditingId(null); }
    } catch {
      toast.error("Erreur lors de la mise à jour.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3">
      {fuels.map((f) => (
        <div key={f.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-orange-500" />
              </div>
              <div>
                <p className="font-semibold text-gray-900">{f.name}</p>
                <p className="text-xs text-gray-400">{f.code} · par {f.unit}</p>
              </div>
            </div>
            {editingId !== f.id ? (
              <button
                onClick={() => setEditingId(f.id)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-orange-600 hover:bg-orange-50 rounded-lg transition-colors font-medium"
              >
                <Pencil className="w-3.5 h-3.5" /> Modifier
              </button>
            ) : (
              <button
                onClick={() => setEditingId(null)}
                className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {editingId !== f.id ? (
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-gray-50 rounded-xl p-3 text-center">
                <p className="text-[11px] text-gray-400 mb-1">Prix d'achat</p>
                <p className="font-bold text-gray-900">{fmt(f.purchasePrice)}</p>
                <p className="text-[10px] text-gray-400">FCFA/{f.unit}</p>
              </div>
              <div className="bg-orange-50 rounded-xl p-3 text-center">
                <p className="text-[11px] text-orange-500 mb-1">Prix de vente</p>
                <p className="font-bold text-orange-700 text-lg">{fmt(f.salePrice)}</p>
                <p className="text-[10px] text-orange-400">FCFA/{f.unit}</p>
              </div>
              <div className="bg-green-50 rounded-xl p-3 text-center">
                <p className="text-[11px] text-green-500 mb-1">Marge</p>
                <p className="font-bold text-green-700">{fmt(f.margin)}</p>
                <p className="text-[10px] text-green-400">FCFA/{f.unit}</p>
              </div>
            </div>
          ) : (
            <form onSubmit={(e) => handleSubmit(e, f.id)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-700">Prix d'achat (FCFA/{f.unit})</label>
                  <input
                    name="purchasePrice"
                    type="number"
                    step="1"
                    min="1"
                    defaultValue={f.purchasePrice}
                    required
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-700">Prix de vente (FCFA/{f.unit})</label>
                  <input
                    name="salePrice"
                    type="number"
                    step="1"
                    min="1"
                    defaultValue={f.salePrice}
                    required
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setEditingId(null)}
                  className="px-4 py-2 text-sm text-gray-500 hover:bg-gray-100 rounded-xl transition-colors">
                  Annuler
                </button>
                <button type="submit" disabled={loading}
                  className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white text-sm font-semibold rounded-xl transition-colors">
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Enregistrer
                </button>
              </div>
            </form>
          )}
        </div>
      ))}
    </div>
  );
}
