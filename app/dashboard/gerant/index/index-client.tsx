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

export function IndexClientPage({ stationId, selectedDate, pumps, indexMap, userRole }: any) {
  const router = useRouter();
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [validating, setValidating] = useState(false);

  function changeDate(delta: number) {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + delta);
    router.push(`?date=${d.toISOString().split("T")[0]}&stationId=${stationId}`);
  }

  async function handleSave(e: React.FormEvent<HTMLFormElement>, nozzleId: string) {
    e.preventDefault();
    setLoading((l) => ({ ...l, [nozzleId]: true }));
    const fd = new FormData(e.currentTarget);
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

  const canValidate = ["ADMIN", "DIRECTION_COMMERCIALE"].includes(userRole);
  const allValidated = pumps.every((p: any) =>
    p.nozzles.every((n: any) => indexMap[n.id]?.validated)
  );

  let totalRevenue = 0;
  let totalVolume = 0;
  for (const p of pumps) {
    for (const n of p.nozzles) {
      const idx = indexMap[n.id];
      if (idx) {
        totalVolume += Number(idx.volumeSold || 0);
        totalRevenue += Number(idx.revenue || 0);
      }
    }
  }

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
        {canValidate && !allValidated && (
          <Button onClick={handleValidate} disabled={validating} variant="outline" className="ml-auto border-green-500 text-green-600 hover:bg-green-50">
            <CheckCircle className="w-4 h-4 mr-2" /> Valider la journée
          </Button>
        )}
        {allValidated && <Badge className="ml-auto bg-green-100 text-green-700">Journée validée</Badge>}
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-gray-500">Volume total vendu</p>
            <p className="text-2xl font-bold">{fmt(totalVolume)} L</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-gray-500">Chiffre d'affaires</p>
            <p className="text-2xl font-bold">{fmt(totalRevenue)} FCFA</p>
          </CardContent>
        </Card>
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
                            disabled={validated}
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
                            disabled={validated}
                          />
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
                      {!validated && (
                        <div className="mt-2 flex justify-end">
                          <Button type="submit" size="sm" disabled={loading[nozzle.id]} className="bg-orange-500 hover:bg-orange-600">
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
