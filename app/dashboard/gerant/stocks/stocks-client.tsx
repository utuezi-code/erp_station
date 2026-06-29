"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { saveTankMovement } from "./actions";
import { toast } from "sonner";
import { Save, ChevronLeft, ChevronRight, AlertTriangle } from "lucide-react";

function fmt(n: any) {
  return n !== null && n !== undefined ? Number(n).toLocaleString("fr-CI", { maximumFractionDigits: 1 }) : "—";
}

export function StocksClientPage({ stationId, selectedDate, tanks, movementMap }: any) {
  const router = useRouter();
  const [loading, setLoading] = useState<Record<string, boolean>>({});

  function changeDate(delta: number) {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + delta);
    router.push(`?date=${d.toISOString().split("T")[0]}`);
  }

  async function handleSave(e: React.FormEvent<HTMLFormElement>, tankId: string) {
    e.preventDefault();
    setLoading((l) => ({ ...l, [tankId]: true }));
    const fd = new FormData(e.currentTarget);
    try {
      await saveTankMovement(fd);
      toast.success("Mouvement de stock enregistré.");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading((l) => ({ ...l, [tankId]: false }));
    }
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Button variant="outline" size="sm" onClick={() => changeDate(-1)}><ChevronLeft className="w-4 h-4" /></Button>
        <Input type="date" value={selectedDate} onChange={(e) => router.push(`?date=${e.target.value}`)} className="w-auto" />
        <Button variant="outline" size="sm" onClick={() => changeDate(1)}><ChevronRight className="w-4 h-4" /></Button>
      </div>

      <div className="space-y-4">
        {tanks.map((tank: any) => {
          const m = movementMap[tank.id];
          const gap = m?.gap ? Number(m.gap) : null;
          const lowStock = m?.theoreticalStock && Number(m.theoreticalStock) < Number(tank.alertLevel);
          return (
            <Card key={tank.id}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{tank.name} — {tank.fuel.name}</CardTitle>
                  <div className="flex gap-2">
                    {lowStock && <Badge variant="destructive" className="text-xs"><AlertTriangle className="w-3 h-3 mr-1" />Stock faible</Badge>}
                    {gap !== null && Math.abs(gap) > 50 && (
                      <Badge className="bg-orange-100 text-orange-700 text-xs">Écart: {fmt(gap)} L</Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <form onSubmit={(e) => handleSave(e, tank.id)} className="bg-gray-50 rounded-lg p-3">
                  <input type="hidden" name="tankId" value={tank.id} />
                  <input type="hidden" name="stationId" value={stationId} />
                  <input type="hidden" name="fuelId" value={tank.fuel.id} />
                  <input type="hidden" name="date" value={selectedDate} />
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-3">
                    <div>
                      <label className="text-xs text-gray-500">Stock ouverture (L)</label>
                      <Input name="openingStock" type="number" step="0.001" defaultValue={m ? Number(m.openingStock) : ""} required />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500">Livraison (L)</label>
                      <Input name="delivery" type="number" step="0.001" defaultValue={m ? Number(m.delivery) : "0"} />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500">Transfert (L)</label>
                      <Input name="transfer" type="number" step="0.001" defaultValue={m ? Number(m.transfer) : "0"} />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500">Stock physique (L)</label>
                      <Input name="physicalStock" type="number" step="0.001" defaultValue={m?.physicalStock ? Number(m.physicalStock) : ""} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div>
                      <label className="text-xs text-gray-500">Stock théorique calculé (L)</label>
                      <Input value={m?.theoreticalStock ? fmt(m.theoreticalStock) : "—"} disabled className="bg-white" />
                    </div>
                    <div>
                      <label className={`text-xs ${gap && Math.abs(gap) > 50 ? "text-orange-600" : "text-gray-500"}`}>Écart (L)</label>
                      <Input value={m?.gap ? fmt(m.gap) : "—"} disabled className={`bg-white ${gap && Math.abs(gap) > 50 ? "border-orange-400" : ""}`} />
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <Button type="submit" size="sm" disabled={loading[tank.id]} className="bg-orange-500 hover:bg-orange-600">
                      <Save className="w-3 h-3 mr-1" />{loading[tank.id] ? "..." : "Enregistrer"}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          );
        })}
        {tanks.length === 0 && <p className="text-gray-500 text-center py-8">Aucune cuve configurée.</p>}
      </div>
    </div>
  );
}
