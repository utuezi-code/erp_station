"use client";

import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";
import { AlertTriangle, CheckCircle, Droplets, TrendingDown } from "lucide-react";

interface Movement {
  id: string;
  date: string;
  tankName: string;
  tankCapacity: number;
  fuelName: string;
  fuelCode: string;
  openingStock: number;
  delivery: number;
  transfer: number;
  theoreticalStock: number;
  physicalStock: number | null;
  gap: number | null;
}

function fmt(n: number) { return n.toLocaleString("fr-CI", { maximumFractionDigits: 1 }); }

function GapBadge({ gap }: { gap: number | null }) {
  if (gap === null) return <span className="text-xs text-slate-400">—</span>;
  const abs = Math.abs(gap);
  if (abs < 20) return <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 text-xs">{fmt(gap)} L ✓</Badge>;
  if (abs < 50) return <Badge className="bg-orange-100 text-orange-700 border-orange-200 text-xs">{fmt(gap)} L ⚠</Badge>;
  return <Badge className="bg-red-100 text-red-700 border-red-200 text-xs">{fmt(gap)} L 🚨</Badge>;
}

export function ReconciliationClient({
  movements, stations, selectedStation, from, to, isGerant,
  totalGap, anomalyCount,
}: {
  movements: Movement[];
  stations: { id: string; name: string }[];
  selectedStation: string;
  from: string;
  to: string;
  isGerant: boolean;
  totalGap: number;
  anomalyCount: number;
}) {
  const router = useRouter();

  function updateParams(key: string, value: string) {
    const p = new URLSearchParams({ stationId: selectedStation, from, to });
    p.set(key, value);
    router.push(`?${p.toString()}`);
  }

  const hasAnomalies = anomalyCount > 0;

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-wrap gap-4 bg-white border border-slate-100 rounded-xl p-4 shadow-sm">
        {!isGerant && (
          <div className="space-y-1">
            <Label className="text-xs text-slate-500">Station</Label>
            <Select value={selectedStation || "none"} onValueChange={(v) => updateParams("stationId", v === "none" ? "" : (v ?? ""))}>
              <SelectTrigger className="w-52">
                <span>{selectedStation ? (stations.find((s) => s.id === selectedStation)?.name ?? selectedStation) : "Choisir une station..."}</span>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Choisir une station...</SelectItem>
                {stations.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        )}
        <div className="space-y-1">
          <Label className="text-xs text-slate-500">Du</Label>
          <Input type="date" value={from} onChange={(e) => updateParams("from", e.target.value)} className="w-36 h-9" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-slate-500">Au</Label>
          <Input type="date" value={to} onChange={(e) => updateParams("to", e.target.value)} className="w-36 h-9" />
        </div>
      </div>

      {/* KPI cards */}
      {selectedStation && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Card className="shadow-sm border-slate-100">
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 mb-1">
                <Droplets className="w-4 h-4 text-blue-400" />
                <p className="text-xs text-slate-400 uppercase tracking-wide">Relevés</p>
              </div>
              <p className="text-2xl font-bold text-slate-900">{movements.length}</p>
            </CardContent>
          </Card>
          <Card className="shadow-sm border-slate-100">
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 mb-1">
                <TrendingDown className="w-4 h-4 text-orange-400" />
                <p className="text-xs text-slate-400 uppercase tracking-wide">Écart total</p>
              </div>
              <p className={`text-2xl font-bold ${Math.abs(totalGap) > 100 ? "text-red-600" : "text-slate-900"}`}>{fmt(totalGap)} L</p>
            </CardContent>
          </Card>
          <Card className="shadow-sm border-slate-100">
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 mb-1">
                <AlertTriangle className="w-4 h-4 text-red-400" />
                <p className="text-xs text-slate-400 uppercase tracking-wide">Anomalies</p>
              </div>
              <p className={`text-2xl font-bold ${hasAnomalies ? "text-red-600" : "text-slate-900"}`}>{anomalyCount}</p>
            </CardContent>
          </Card>
          <Card className="shadow-sm border-slate-100">
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle className="w-4 h-4 text-emerald-400" />
                <p className="text-xs text-slate-400 uppercase tracking-wide">Conformes</p>
              </div>
              <p className="text-2xl font-bold text-emerald-600">{movements.filter((m) => m.gap !== null && Math.abs(m.gap) < 20).length}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Alert banner */}
      {hasAnomalies && (
        <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl p-4">
          <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-red-700 text-sm">{anomalyCount} anomalie(s) détectée(s)</p>
            <p className="text-red-600 text-xs mt-0.5">
              Écarts supérieurs à 50L détectés — vérifiez fuites, vols ou erreurs de saisie.
            </p>
          </div>
        </div>
      )}

      {/* Table */}
      {!selectedStation ? (
        <div className="text-center py-16 text-slate-400">
          <Droplets className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p>Sélectionnez une station pour voir la réconciliation</p>
        </div>
      ) : movements.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <CheckCircle className="w-12 h-12 mx-auto mb-3 opacity-40 text-emerald-400" />
          <p>Aucun mouvement sur la période sélectionnée</p>
        </div>
      ) : (
        <div className="bg-white border border-slate-100 rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Date</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Cuve</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Carburant</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Stock ouv.</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Livraison</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Théorique</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Physique</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Écart</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {movements.map((m) => {
                  const isAnomaly = m.gap !== null && Math.abs(m.gap) >= 50;
                  return (
                    <tr key={m.id} className={`hover:bg-slate-50 transition-colors ${isAnomaly ? "bg-red-50/50" : ""}`}>
                      <td className="px-4 py-3 text-slate-600">{new Date(m.date).toLocaleDateString("fr-CI")}</td>
                      <td className="px-4 py-3 font-medium text-slate-800">{m.tankName}</td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className="text-xs">{m.fuelName}</Badge>
                      </td>
                      <td className="px-4 py-3 text-right text-slate-600">{fmt(m.openingStock)} L</td>
                      <td className="px-4 py-3 text-right text-blue-600 font-medium">{m.delivery > 0 ? `+${fmt(m.delivery)}` : "—"}</td>
                      <td className="px-4 py-3 text-right text-slate-700 font-semibold">{fmt(m.theoreticalStock)} L</td>
                      <td className="px-4 py-3 text-right">
                        {m.physicalStock !== null ? <span className="font-semibold text-slate-800">{fmt(m.physicalStock)} L</span> : <span className="text-slate-300">Non saisi</span>}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <GapBadge gap={m.gap} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-xs text-slate-500">
        <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" /> Écart &lt; 20L — Normal</div>
        <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-orange-400 inline-block" /> Écart 20–50L — À surveiller</div>
        <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500 inline-block" /> Écart &gt; 50L — Anomalie</div>
      </div>
    </div>
  );
}
