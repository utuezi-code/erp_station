"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Save, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { createMiseADispo } from "../../actions";

interface Fuel { id: string; name: string; code: string; unit: string; salePrice: number; stockDispo: number; }
interface Station { id: string; name: string; code: string; }
interface Order { id: string; number: string; service: string; station?: { name: string } | null; }

interface Props {
  stations: Station[];
  fuels: Fuel[];
  pendingOrders: Order[];
  preOrderId: string;
}

export function NewMDClient({ stations, fuels, pendingOrders, preOrderId }: Props) {
  const router = useRouter();
  const [stationId, setStationId] = useState("");
  const [fuelId, setFuelId] = useState(fuels[0]?.id || "");
  const [quantity, setQuantity] = useState("");
  const [orderId, setOrderId] = useState(preOrderId);
  const [loading, setLoading] = useState(false);

  const selectedFuel = fuels.find((f) => f.id === fuelId);
  const qty = parseFloat(quantity) || 0;
  const total = qty * (selectedFuel?.salePrice || 0);
  const stockInsuffisant = selectedFuel && qty > selectedFuel.stockDispo;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!stationId) { toast.error("Sélectionnez une station."); return; }
    if (qty <= 0) { toast.error("Volume invalide."); return; }
    if (stockInsuffisant) { toast.error("Stock GESTOCI insuffisant."); return; }

    setLoading(true);
    const fd = new FormData(e.currentTarget);
    fd.set("stationId", stationId);
    fd.set("fuelId", fuelId);
    fd.set("quantity", quantity);
    fd.set("unitPrice", String(selectedFuel?.salePrice || 0));
    if (orderId) fd.set("orderId", orderId);

    const result = await createMiseADispo(fd);
    if (result.success) {
      toast.success("Mise à disposition créée et stock GESTOCI mis à jour.");
      router.push("/dashboard/approvisionnement/mises-a-disposition");
    } else {
      toast.error(result.error || "Erreur");
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-lg space-y-4">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">

        {/* Station */}
        <div>
          <label className="text-xs font-medium text-gray-600 block mb-1">Station destinataire *</label>
          <select
            value={stationId}
            onChange={(e) => setStationId(e.target.value)}
            required
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Choisir une station…</option>
            {stations.map((s) => <option key={s.id} value={s.id}>{s.name} ({s.code})</option>)}
          </select>
        </div>

        {/* Lier à une DA validée */}
        {pendingOrders.length > 0 && (
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">Lier à une demande d'achat (optionnel)</label>
            <select
              value={orderId}
              onChange={(e) => setOrderId(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Aucune DA liée</option>
              {pendingOrders.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.number} — {o.service} ({o.station?.name})
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Produit */}
        <div>
          <label className="text-xs font-medium text-gray-600 block mb-1">Produit *</label>
          <div className="grid grid-cols-1 gap-2">
            {fuels.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setFuelId(f.id)}
                className={`flex items-center justify-between px-4 py-3 rounded-xl border text-sm transition-colors ${
                  fuelId === f.id ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className={`font-semibold ${fuelId === f.id ? "text-blue-700" : "text-gray-700"}`}>{f.code}</span>
                  <span className="text-xs text-gray-400">{f.name}</span>
                </div>
                <div className="text-right">
                  <p className={`text-xs font-semibold tabular-nums ${f.stockDispo < 5000 ? "text-orange-600" : "text-gray-700"}`}>
                    {f.stockDispo.toLocaleString("fr-CI")} {f.unit} dispo.
                  </p>
                  <p className="text-xs text-gray-400">{f.salePrice.toLocaleString("fr-CI")} FCFA/{f.unit}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Date + Volume */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">Date de mise à dispo *</label>
            <input
              name="date"
              type="date"
              defaultValue={new Date().toISOString().split("T")[0]}
              required
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">
              Volume ({selectedFuel?.unit || "L"}) *
            </label>
            <input
              type="number"
              min="0"
              step="any"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              required
              placeholder="ex: 10000"
              className={`w-full border rounded-xl px-3 py-2.5 text-sm text-right tabular-nums focus:outline-none focus:ring-2 ${
                stockInsuffisant ? "border-red-400 focus:ring-red-400" : "border-gray-200 focus:ring-blue-500"
              }`}
            />
          </div>
        </div>

        {/* Alerte stock */}
        {stockInsuffisant && selectedFuel && (
          <div className="flex items-center gap-2 px-3 py-2.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            Stock insuffisant. Disponible : {selectedFuel.stockDispo.toLocaleString("fr-CI")} {selectedFuel.unit}
          </div>
        )}

        {/* Résumé montant */}
        {qty > 0 && !stockInsuffisant && selectedFuel && (
          <div className="rounded-xl bg-blue-50 border border-blue-100 px-4 py-3">
            <p className="text-xs text-blue-500 font-medium mb-1">Valeur de la mise à disposition</p>
            <p className="text-xl font-bold text-blue-800 tabular-nums">
              {total.toLocaleString("fr-CI")} <span className="text-sm font-normal">FCFA</span>
            </p>
            <p className="text-xs text-blue-400 mt-0.5">
              {qty.toLocaleString("fr-CI")} {selectedFuel.unit} × {selectedFuel.salePrice.toLocaleString("fr-CI")} FCFA
            </p>
          </div>
        )}

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
        disabled={loading || !!stockInsuffisant || qty <= 0}
        className="w-full flex items-center justify-center gap-2 py-3 bg-[#0369A1] hover:bg-blue-700 text-white text-sm font-semibold rounded-xl disabled:opacity-50"
      >
        <Save className="w-4 h-4" />
        {loading ? "Enregistrement…" : "Émettre la mise à disposition"}
      </button>
    </form>
  );
}
