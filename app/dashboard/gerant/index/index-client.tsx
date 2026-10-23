"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { saveIndex, validateDay } from "./actions";
import { toast } from "sonner";
import { CheckCircle, Save, ChevronLeft, ChevronRight } from "lucide-react";

function fmt(n: any) {
  return n !== null && n !== undefined ? Number(n).toLocaleString("fr-CI") : "—";
}

export function IndexClientPage({ stationId, selectedDate, pumps, indexMap, userRole, isToday }: any) {
  const router = useRouter();
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [endErrors, setEndErrors] = useState<Record<string, boolean>>({});
  const [validating, setValidating] = useState(false);

  function changeDate(delta: number) {
    // Parse date parts manually to avoid UTC/local timezone offset issues
    const [y, m, d] = selectedDate.split("-").map(Number);
    const date = new Date(y, m - 1, d);
    date.setDate(date.getDate() + delta);
    const newDate = [
      date.getFullYear(),
      String(date.getMonth() + 1).padStart(2, "0"),
      String(date.getDate()).padStart(2, "0"),
    ].join("-");
    router.push(`?date=${newDate}&stationId=${stationId}`);
  }

  async function handleSave(e: React.FormEvent<HTMLFormElement>, nozzleId: string) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const start = parseFloat(fd.get("indexStart") as string);
    const end = parseFloat(fd.get("indexEnd") as string);
    if (!isNaN(end) && end < start) {
      setEndErrors((e) => ({ ...e, [nozzleId]: true }));
      toast.error("L'index de fin ne peut pas être inférieur à l'index de début.");
      return;
    }
    setEndErrors((e) => ({ ...e, [nozzleId]: false }));
    setLoading((l) => ({ ...l, [nozzleId]: true }));
    try {
      await saveIndex(fd);
      toast.success("Index enregistré.");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading((l) => ({ ...l, [nozzleId]: false }));
    }
  }

  async function handleValidate() {
    if (!confirm("Valider la journée ? Les données ne pourront plus être modifiées.")) return;
    setValidating(true);
    try {
      await validateDay(stationId, selectedDate);
      toast.success("Journée validée.");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setValidating(false);
    }
  }

  const isGerant = userRole === "GERANT";
  // GERANT can only edit today's indexes; past days are read-only
  const canEdit = !isGerant || isToday;
  const canValidate = ["ADMIN", "DIRECTION_COMMERCIALE"].includes(userRole);
  const allValidated = pumps.every((p: any) =>
    p.nozzles.every((n: any) => indexMap[n.id]?.validated)
  );

  // Cumul par carburant
  const byFuel: Record<string, { name: string; volume: number; revenue: number; nozzleCount: number; indexMin: number | null; indexMax: number | null }> = {};
  let totalRevenue = 0;
  let totalVolume = 0;
  for (const p of pumps) {
    for (const n of p.nozzles) {
      const idx = indexMap[n.id];
      const fuelName = n.fuel.name;
      if (!byFuel[fuelName]) byFuel[fuelName] = { name: fuelName, volume: 0, revenue: 0, nozzleCount: 0, indexMin: null, indexMax: null };
      byFuel[fuelName].nozzleCount++;
      if (idx) {
        const vol = Number(idx.volumeSold || 0);
        const rev = Number(idx.revenue || 0);
        byFuel[fuelName].volume += vol;
        byFuel[fuelName].revenue += rev;
        totalVolume += vol;
        totalRevenue += rev;
        const start = Number(idx.indexStart);
        const end = idx.indexEnd ? Number(idx.indexEnd) : null;
        if (byFuel[fuelName].indexMin === null || start < byFuel[fuelName].indexMin!) byFuel[fuelName].indexMin = start;
        if (end !== null && (byFuel[fuelName].indexMax === null || end > byFuel[fuelName].indexMax!)) byFuel[fuelName].indexMax = end;
      }
    }
  }
  const fuelEntries = Object.values(byFuel);

  return (
    <div>
      {/* Date nav */}
      <div className="flex items-center gap-3 mb-6">
        <Button variant="outline" size="sm" onClick={() => changeDate(-1)}><ChevronLeft className="w-4 h-4" /></Button>
        <Input
          type="date"
          value={selectedDate}
          onChange={(e) => router.push(`?date=${e.target.value}&stationId=${stationId}`)}
          className="w-auto"
        />
        <Button variant="outline" size="sm" onClick={() => changeDate(1)}><ChevronRight className="w-4 h-4" /></Button>
        {!canEdit && (
        <div className="ml-auto flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-100 text-gray-500 text-xs font-medium">
          Consultation uniquement — modification impossible sur les jours passés
        </div>
      )}
      {canValidate && !allValidated && (
          <Button onClick={handleValidate} disabled={validating} variant="outline" className="ml-auto border-green-500 text-green-600 hover:bg-green-50">
            <CheckCircle className="w-4 h-4 mr-2" /> Valider la journée
          </Button>
        )}
        {allValidated && <Badge className="ml-auto bg-green-100 text-green-700">Journée validée</Badge>}
      </div>

      {/* Cumul journalier */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm mb-6 overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-50 flex items-center justify-between">
          <span className="text-sm font-bold text-slate-800">Cumul journalier</span>
          <div className="flex items-center gap-4 text-xs text-slate-500">
            <span>Volume total : <strong className="text-slate-800 tabular-nums">{fmt(totalVolume)} L</strong></span>
            <span>CA total : <strong className="text-blue-700 tabular-nums">{fmt(totalRevenue)} FCFA</strong></span>
          </div>
        </div>
        <div className="divide-y divide-slate-50">
          {fuelEntries.map((f) => (
            <div key={f.name} className="grid grid-cols-4 gap-0 px-4 py-3 items-center">
              <div>
                <p className="text-[11px] text-slate-400 uppercase tracking-wide font-semibold">{f.name}</p>
                <p className="text-xs text-slate-500 mt-0.5">{f.nozzleCount} pistolet{f.nozzleCount > 1 ? "s" : ""}</p>
              </div>
              <div className="text-center">
                <p className="text-[10px] text-slate-400 uppercase">Index</p>
                <p className="text-sm font-semibold tabular-nums text-slate-700">
                  {f.indexMin !== null ? fmt(f.indexMin) : "—"}
                  <span className="text-slate-300 mx-1">→</span>
                  {f.indexMax !== null ? fmt(f.indexMax) : "—"}
                </p>
              </div>
              <div className="text-center">
                <p className="text-[10px] text-slate-400 uppercase">Volume</p>
                <p className="text-sm font-bold tabular-nums text-slate-900">{fmt(f.volume)} L</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-slate-400 uppercase">CA</p>
                <p className="text-sm font-bold tabular-nums text-blue-700">{fmt(f.revenue)} FCFA</p>
              </div>
            </div>
          ))}
          {fuelEntries.length === 0 && (
            <p className="text-xs text-slate-400 text-center py-4">Aucun index saisi pour le moment.</p>
          )}
        </div>
      </div>

      {/* Pumps */}
      <div className="space-y-4">
        {pumps.map((pump: any) => (
          <Card key={pump.id}>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{pump.name}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {pump.nozzles.map((nozzle: any) => {
                  const idx = indexMap[nozzle.id];
                  const validated = idx?.validated;
                  const readOnly = !canEdit || validated;
                  return (
                    <form key={nozzle.id} onSubmit={(e) => handleSave(e, nozzle.id)} className="bg-gray-50 rounded-lg p-3">
                      <input type="hidden" name="nozzleId" value={nozzle.id} />
                      <input type="hidden" name="stationId" value={stationId} />
                      <input type="hidden" name="date" value={selectedDate} />
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="outline" className="text-xs">#{nozzle.number}</Badge>
                        <span className="text-sm font-medium">{nozzle.fuel.name}</span>
                        <span className="text-xs text-gray-500">({Number(nozzle.fuel.salePrice).toLocaleString("fr-CI")} FCFA/L)</span>
                        {validated && <Badge className="ml-auto bg-green-100 text-green-700 text-xs">Validé</Badge>}
                      </div>
                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 items-end">
                        <div>
                          <label className="text-xs text-gray-500">Index début</label>
                          <Input
                            name="indexStart"
                            type="number"
                            step="0.01"
                            defaultValue={idx ? Number(idx.indexStart) : ""}
                            disabled={readOnly}
                            required
                          />
                        </div>
                        <div>
                          <label className="text-xs text-gray-500">Index fin</label>
                          <Input
                            name="indexEnd"
                            type="number"
                            step="0.01"
                            defaultValue={idx?.indexEnd ? Number(idx.indexEnd) : ""}
                            disabled={readOnly}
                            onChange={() => setEndErrors((e) => ({ ...e, [nozzle.id]: false }))}
                            className={endErrors[nozzle.id] ? "border-red-400 focus-visible:ring-red-300" : ""}
                          />
                          {endErrors[nozzle.id] && (
                            <p className="text-[11px] text-red-500 mt-0.5">Doit être &gt; index début</p>
                          )}
                        </div>
                        <div>
                          <label className="text-xs text-gray-500">Volume (L)</label>
                          <Input value={idx?.volumeSold ? fmt(idx.volumeSold) : "—"} disabled className="bg-white" />
                        </div>
                        <div>
                          <label className="text-xs text-gray-500">CA (FCFA)</label>
                          <Input value={idx?.revenue ? fmt(idx.revenue) : "—"} disabled className="bg-white" />
                        </div>
                      </div>
                      {!readOnly && (
                        <div className="mt-2 flex justify-end">
                          <Button type="submit" size="sm" disabled={loading[nozzle.id]} className="bg-[#0369A1] hover:bg-blue-700">
                            <Save className="w-3 h-3 mr-1" />
                            {loading[nozzle.id] ? "..." : "Enregistrer"}
                          </Button>
                        </div>
                      )}
                    </form>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        ))}
        {pumps.length === 0 && (
          <p className="text-gray-500 text-center py-8">Aucune pompe configurée pour cette station.</p>
        )}
      </div>
    </div>
  );
}
