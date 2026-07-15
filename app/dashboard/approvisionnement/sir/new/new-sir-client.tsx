"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Save } from "lucide-react";
import { toast } from "sonner";
import { createSIRPurchase } from "../../actions";

interface Fuel { id: string; name: string; code: string; unit: string; purchasePrice: number; }

export function NewSIRClient({ fuels }: { fuels: Fuel[] }) {
  const router = useRouter();
  const [fuelId, setFuelId] = useState(fuels[0]?.id || "");
  const [loading, setLoading] = useState(false);

  const selectedFuel = fuels.find((f) => f.id === fuelId);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    fd.set("fuelId", fuelId);
    const result = await createSIRPurchase(fd);
    if (result.success) {
      toast.success("Achat SIR enregistré.");
      router.push("/dashboard/approvisionnement/sir");
    } else {
      toast.error(result.error || "Erreur");
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-lg space-y-4">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
        <div>
          <label className="text-xs font-medium text-gray-600 block mb-1">Produit *</label>
          <select
            value={fuelId}
            onChange={(e) => setFuelId(e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          >
            {fuels.map((f) => <option key={f.id} value={f.id}>{f.name} ({f.code})</option>)}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">Date d'achat *</label>
            <input
              name="purchaseDate"
              type="date"
              defaultValue={new Date().toISOString().split("T")[0]}
              required
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">Statut</label>
            <select
              name="status"
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="COMMANDE">Commandé</option>
              <option value="LIVRE">Livré au GESTOCI</option>
              <option value="FACTURE">Facturé</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">
              Volume ({selectedFuel?.unit || "L"}) *
            </label>
            <input
              name="quantity"
              type="number"
              min="0"
              step="any"
              required
              placeholder="ex: 50000"
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-right tabular-nums focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">Prix unitaire (FCFA/{selectedFuel?.unit || "L"}) *</label>
            <input
              name="unitPrice"
              type="number"
              min="0"
              step="any"
              required
              defaultValue={selectedFuel?.purchasePrice}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-right tabular-nums focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div>
          <label className="text-xs font-medium text-gray-600 block mb-1">N° Facture SIR</label>
          <input
            name="invoiceNumber"
            type="text"
            placeholder="ex: FACT-SIR-2025-0001"
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="text-xs font-medium text-gray-600 block mb-1">Note</label>
          <textarea
            name="note"
            rows={2}
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full flex items-center justify-center gap-2 py-3 bg-[#0369A1] hover:bg-blue-700 text-white text-sm font-semibold rounded-xl disabled:opacity-50"
      >
        <Save className="w-4 h-4" />
        {loading ? "Enregistrement…" : "Enregistrer l'achat SIR"}
      </button>
    </form>
  );
}
