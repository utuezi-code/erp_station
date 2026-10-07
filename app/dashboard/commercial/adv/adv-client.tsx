"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TrendingUp, BarChart2, Droplets, CreditCard, ArrowUpCircle, Trophy, ChevronUp, ChevronDown } from "lucide-react";

function fmt(n: any, dec = 0) {
  return Number(n || 0).toLocaleString("fr-CI", { maximumFractionDigits: dec, minimumFractionDigits: dec });
}

const MOIS_OPTS = [
  { value: "", label: "Toute l'année" },
  { value: "1", label: "Janvier" }, { value: "2", label: "Février" }, { value: "3", label: "Mars" },
  { value: "4", label: "Avril" }, { value: "5", label: "Mai" }, { value: "6", label: "Juin" },
  { value: "7", label: "Juillet" }, { value: "8", label: "Août" }, { value: "9", label: "Septembre" },
  { value: "10", label: "Octobre" }, { value: "11", label: "Novembre" }, { value: "12", label: "Décembre" },
];

interface Station { id: string; name: string; code: string }
interface Fuel { id: string; name: string; code: string }
interface IndexGroup { stationId: string; nozzleId: string; _sum: { volumeSold: number | null; revenue: number | null } }
interface MonthlyRow { station_id: string; fuel_id: string; mois: string; volume: number; revenue: number }
interface Exploitation { stationId: string; period: string; fuelRevenue: number; shopRevenue: number; grossResult: number; netResult: number }
interface FuelGroup { stationId: string; fuelId: string | null; _sum: { quantity?: number | null; quantityM15?: number | null; amount?: number | null; volume?: number | null }; _count?: { id: number } }
interface VersGroup { stationId: string; status: string; _sum: { amount: number | null } }

export function ADVClient({
  stations, fuels, annee, moisFilter,
  indexData, nozzleFuel, monthlyData, exploitation, depotages, misesADispo, creditsADV, versements,
}: {
  stations: Station[];
  fuels: Fuel[];
  annee: number;
  moisFilter: string;
  indexData: IndexGroup[];
  nozzleFuel: Record<string, string>;
  monthlyData: MonthlyRow[];
  exploitation: Exploitation[];
  depotages: FuelGroup[];
  misesADispo: FuelGroup[];
  creditsADV: FuelGroup[];
  versements: VersGroup[];
}) {
  const router = useRouter();
  const [tab, setTab] = useState("synthese");
  const [sortCol, setSortCol] = useState<"volume" | "ca" | "credit" | "depotage">("ca");
  const [sortDir, setSortDir] = useState<"desc" | "asc">("desc");

  // ── Aggregation helpers ───────────────────────────────────────────────────
  function stationVolume(sid: string) {
    return indexData.filter((d) => d.stationId === sid).reduce((s, d) => s + Number(d._sum.volumeSold || 0), 0);
  }
  function stationCA(sid: string) {
    return indexData.filter((d) => d.stationId === sid).reduce((s, d) => s + Number(d._sum.revenue || 0), 0);
  }
  function stationDepotage(sid: string) {
    const d = depotages.filter((x) => x.stationId === sid).reduce((s, x) => s + Number(x._sum.quantity || 0), 0);
    const m = misesADispo.filter((x) => x.stationId === sid).reduce((s, x) => s + Number(x._sum.quantityM15 || 0), 0);
    return d + m;
  }
  function stationCredit(sid: string) {
    return creditsADV.filter((x) => x.stationId === sid).reduce((s, x) => s + Number(x._sum.amount || 0), 0);
  }
  function stationVerse(sid: string) {
    return versements.filter((v) => v.stationId === sid && v.status === "VALIDE").reduce((s, v) => s + Number(v._sum.amount || 0), 0);
  }
  function stationResult(sid: string) {
    return exploitation.filter((e) => e.stationId === sid).reduce((s, e) => s + Number(e.netResult || 0), 0);
  }

  const totalVol = stations.reduce((s, st) => s + stationVolume(st.id), 0);
  const totalCA = stations.reduce((s, st) => s + stationCA(st.id), 0);
  const totalDep = stations.reduce((s, st) => s + stationDepotage(st.id), 0);
  const totalCred = stations.reduce((s, st) => s + stationCredit(st.id), 0);
  const totalVer = stations.reduce((s, st) => s + stationVerse(st.id), 0);
  const totalRes = stations.reduce((s, st) => s + stationResult(st.id), 0);

  // Sorted stations for ranking
  const ranked = [...stations].sort((a, b) => {
    const getValue = (id: string) => {
      if (sortCol === "volume") return stationVolume(id);
      if (sortCol === "ca") return stationCA(id);
      if (sortCol === "credit") return stationCredit(id);
      return stationDepotage(id);
    };
    return sortDir === "desc" ? getValue(b.id) - getValue(a.id) : getValue(a.id) - getValue(b.id);
  });

  // Monthly trend data (all stations combined, by fuel)
  const allMonths = [...new Set(monthlyData.map((r) => r.mois))].sort();

  function navigate(field: "annee" | "mois", val: string) {
    const params = new URLSearchParams();
    if (field === "annee") { params.set("annee", val); if (moisFilter) params.set("mois", moisFilter); }
    else { params.set("annee", String(annee)); if (val) params.set("mois", val); }
    router.push(`/dashboard/commercial/adv?${params}`);
  }

  function SortBtn({ col, label }: { col: typeof sortCol; label: string }) {
    const active = sortCol === col;
    return (
      <button
        className={`flex items-center gap-1 ${active ? "text-[#0369A1] font-semibold" : "text-gray-500 hover:text-gray-700"}`}
        onClick={() => { if (active) setSortDir(d => d === "desc" ? "asc" : "desc"); else { setSortCol(col); setSortDir("desc"); } }}
      >
        {label}
        {active && (sortDir === "desc" ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />)}
      </button>
    );
  }

  const periodLabel = moisFilter ? `${MOIS_OPTS.find(m => m.value === moisFilter)?.label} ${annee}` : String(annee);

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm text-gray-400">Direction Commerciale</p>
          <h1 className="text-2xl font-bold text-gray-900">Suivi ADV</h1>
          <p className="text-sm text-gray-500 mt-0.5">Administration des Ventes · {periodLabel}</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => navigate("annee", String(annee - 1))} className="px-3 py-1.5 rounded-lg border text-sm hover:bg-gray-50">‹ {annee - 1}</button>
          <span className="px-4 py-1.5 rounded-lg bg-gray-100 text-sm font-bold">{annee}</span>
          <button onClick={() => navigate("annee", String(annee + 1))} className="px-3 py-1.5 rounded-lg border text-sm hover:bg-gray-50">{annee + 1} ›</button>
          <Select value={moisFilter || "__all__"} onValueChange={(v) => navigate("mois", v === "__all__" ? "" : (v ?? ""))}>
            <SelectTrigger className="w-40 h-9"><SelectValue /></SelectTrigger>
            <SelectContent>{MOIS_OPTS.map((m) => <SelectItem key={m.value || "__all__"} value={m.value || "__all__"}>{m.label}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>

      {/* ── KPI row ── */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {[
          { icon: <Droplets className="w-4 h-4 text-blue-500" />, label: "Volume total", value: `${fmt(totalVol)} L`, bg: "bg-blue-50" },
          { icon: <TrendingUp className="w-4 h-4 text-green-500" />, label: "CA carburant", value: `${fmt(totalCA)} F`, bg: "bg-green-50" },
          { icon: <BarChart2 className="w-4 h-4 text-purple-500" />, label: "Résultat net", value: `${fmt(totalRes)} F`, bg: totalRes >= 0 ? "bg-purple-50" : "bg-red-50" },
          { icon: <ArrowUpCircle className="w-4 h-4 text-orange-500" />, label: "Versé (validé)", value: `${fmt(totalVer)} F`, bg: "bg-orange-50" },
          { icon: <CreditCard className="w-4 h-4 text-rose-500" />, label: "Crédit cartes", value: `${fmt(totalCred)} F`, bg: "bg-rose-50" },
          { icon: <Trophy className="w-4 h-4 text-amber-500" />, label: "Dépotages", value: `${fmt(totalDep)} L`, bg: "bg-amber-50" },
        ].map(({ icon, label, value, bg }) => (
          <div key={label} className={`rounded-xl border border-gray-100 p-4 ${bg}`}>
            <div className="flex items-center gap-2 mb-1">{icon}<p className="text-xs text-gray-500">{label}</p></div>
            <p className="text-base font-bold text-gray-800 tabular-nums">{value}</p>
          </div>
        ))}
      </div>

      {/* ── Tabs ── */}
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="synthese">Synthèse stations</TabsTrigger>
          <TabsTrigger value="produits">Par produit</TabsTrigger>
          <TabsTrigger value="tendance">Tendance mensuelle</TabsTrigger>
          <TabsTrigger value="versements">Versements</TabsTrigger>
        </TabsList>

        {/* ── SYNTHÈSE ── */}
        <TabsContent value="synthese">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center justify-between">
                <span>Classement stations — {periodLabel}</span>
                <div className="flex items-center gap-4 text-xs font-normal">
                  <span className="text-gray-400">Trier par :</span>
                  <SortBtn col="ca" label="CA" />
                  <SortBtn col="volume" label="Volume" />
                  <SortBtn col="depotage" label="Dépotage" />
                  <SortBtn col="credit" label="Crédit" />
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8">#</TableHead>
                    <TableHead>Station</TableHead>
                    <TableHead className="text-right">Volume (L)</TableHead>
                    <TableHead className="text-right">CA (FCFA)</TableHead>
                    <TableHead className="text-right">Dépotage (L)</TableHead>
                    <TableHead className="text-right">Crédit (F)</TableHead>
                    <TableHead className="text-right">Versé (F)</TableHead>
                    <TableHead className="text-right">Résultat net (F)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ranked.map((s, idx) => {
                    const vol = stationVolume(s.id);
                    const ca = stationCA(s.id);
                    const dep = stationDepotage(s.id);
                    const cred = stationCredit(s.id);
                    const ver = stationVerse(s.id);
                    const res = stationResult(s.id);
                    const pct = totalCA > 0 ? (ca / totalCA) * 100 : 0;
                    return (
                      <TableRow key={s.id} className="hover:bg-gray-50">
                        <TableCell className="font-bold text-gray-400">{idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : idx + 1}</TableCell>
                        <TableCell>
                          <div className="font-medium">{s.name}</div>
                          <div className="text-xs text-gray-400">{s.code}</div>
                          {/* CA progress bar */}
                          <div className="mt-1 h-1 rounded bg-gray-100 w-24">
                            <div className="h-1 rounded bg-[#0369A1]" style={{ width: `${pct}%` }} />
                          </div>
                          <div className="text-[10px] text-gray-400">{pct.toFixed(1)}% du CA total</div>
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm">{vol > 0 ? fmt(vol) : <span className="text-gray-200">—</span>}</TableCell>
                        <TableCell className="text-right font-mono text-sm font-semibold">{ca > 0 ? fmt(ca) : <span className="text-gray-200">—</span>}</TableCell>
                        <TableCell className="text-right font-mono text-sm">{dep > 0 ? fmt(dep) : <span className="text-gray-200">—</span>}</TableCell>
                        <TableCell className="text-right font-mono text-sm">{cred > 0 ? fmt(cred) : <span className="text-gray-200">—</span>}</TableCell>
                        <TableCell className="text-right font-mono text-sm">{ver > 0 ? fmt(ver) : <span className="text-gray-200">—</span>}</TableCell>
                        <TableCell className={`text-right font-mono text-sm font-semibold ${res >= 0 ? "text-green-700" : "text-red-600"}`}>
                          {res !== 0 ? fmt(res) : <span className="text-gray-200">—</span>}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  <TableRow className="bg-gray-50 font-bold text-sm">
                    <TableCell colSpan={2}>TOTAL</TableCell>
                    <TableCell className="text-right font-mono">{fmt(totalVol)}</TableCell>
                    <TableCell className="text-right font-mono">{fmt(totalCA)}</TableCell>
                    <TableCell className="text-right font-mono">{fmt(totalDep)}</TableCell>
                    <TableCell className="text-right font-mono">{fmt(totalCred)}</TableCell>
                    <TableCell className="text-right font-mono">{fmt(totalVer)}</TableCell>
                    <TableCell className={`text-right font-mono ${totalRes >= 0 ? "text-green-700" : "text-red-600"}`}>{fmt(totalRes)}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── PAR PRODUIT ── */}
        <TabsContent value="produits">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {fuels.map((fuel) => {
              const fuelRows = stations.map((s) => {
                const vol = indexData
                  .filter((d) => d.stationId === s.id && nozzleFuel[d.nozzleId] === fuel.id)
                  .reduce((t, d) => t + Number(d._sum.volumeSold || 0), 0);
                const ca = indexData
                  .filter((d) => d.stationId === s.id && nozzleFuel[d.nozzleId] === fuel.id)
                  .reduce((t, d) => t + Number(d._sum.revenue || 0), 0);
                const dep = depotages.filter((d) => d.stationId === s.id && d.fuelId === fuel.id).reduce((t, d) => t + Number(d._sum.quantity || 0), 0)
                  + misesADispo.filter((m) => m.stationId === s.id && m.fuelId === fuel.id).reduce((t, m) => t + Number(m._sum.quantityM15 || 0), 0);
                return { station: s, vol, ca, dep };
              }).filter((r) => r.vol > 0 || r.dep > 0);

              const totalF = fuelRows.reduce((t, r) => t + r.vol, 0);
              if (fuelRows.length === 0) return null;
              return (
                <Card key={fuel.id}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Badge className="bg-blue-100 text-blue-700">{fuel.code}</Badge>
                      {fuel.name}
                      <span className="ml-auto text-xs text-gray-500 font-normal">Total : {fmt(totalF)} L</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Station</TableHead>
                          <TableHead className="text-right">Volume (L)</TableHead>
                          <TableHead className="text-right">CA (FCFA)</TableHead>
                          <TableHead className="text-right">Dépotage (L)</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {fuelRows.sort((a, b) => b.vol - a.vol).map((r) => (
                          <TableRow key={r.station.id}>
                            <TableCell className="text-sm">{r.station.name}</TableCell>
                            <TableCell className="text-right font-mono text-sm">{fmt(r.vol)}</TableCell>
                            <TableCell className="text-right font-mono text-sm">{r.ca > 0 ? fmt(r.ca) : "—"}</TableCell>
                            <TableCell className="text-right font-mono text-sm">{r.dep > 0 ? fmt(r.dep) : "—"}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* ── TENDANCE MENSUELLE ── */}
        <TabsContent value="tendance">
          <Card>
            <CardHeader><CardTitle className="text-sm">Évolution mensuelle {annee}</CardTitle></CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Mois</TableHead>
                    {fuels.map((f) => (
                      <TableHead key={f.id} className="text-right">{f.code} (L)</TableHead>
                    ))}
                    <TableHead className="text-right">Total vol. (L)</TableHead>
                    <TableHead className="text-right">CA (FCFA)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allMonths.map((m) => {
                    const rows = monthlyData.filter((r) => r.mois === m);
                    const totalMonthVol = rows.reduce((s, r) => s + Number(r.volume || 0), 0);
                    const totalMonthCA = rows.reduce((s, r) => s + Number(r.revenue || 0), 0);
                    const [, mNum] = m.split("-");
                    const mLabel = MOIS_OPTS.find((o) => o.value === String(Number(mNum)))?.label || m;
                    return (
                      <TableRow key={m} className="hover:bg-gray-50">
                        <TableCell className="font-medium">{mLabel}</TableCell>
                        {fuels.map((f) => {
                          const vol = rows.filter((r) => r.fuel_id === f.id).reduce((s, r) => s + Number(r.volume || 0), 0);
                          return (
                            <TableCell key={f.id} className="text-right font-mono text-sm">
                              {vol > 0 ? fmt(vol) : <span className="text-gray-200">—</span>}
                            </TableCell>
                          );
                        })}
                        <TableCell className="text-right font-mono text-sm font-semibold">{fmt(totalMonthVol)}</TableCell>
                        <TableCell className="text-right font-mono text-sm text-green-700">{fmt(totalMonthCA)}</TableCell>
                      </TableRow>
                    );
                  })}
                  {allMonths.length === 0 && (
                    <TableRow><TableCell colSpan={fuels.length + 3} className="text-center text-gray-400 py-8">Aucune donnée validée pour {annee}</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── VERSEMENTS ── */}
        <TabsContent value="versements">
          <Card>
            <CardHeader><CardTitle className="text-sm">Suivi versements — {periodLabel}</CardTitle></CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Station</TableHead>
                    <TableHead className="text-right">CA estimé (F)</TableHead>
                    <TableHead className="text-right">Versé validé (F)</TableHead>
                    <TableHead className="text-right">En attente (F)</TableHead>
                    <TableHead className="text-right">Taux couverture</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stations.map((s) => {
                    const ca = stationCA(s.id);
                    const ver = stationVerse(s.id);
                    const pending = versements.filter((v) => v.stationId === s.id && v.status === "EN_ATTENTE").reduce((t, v) => t + Number(v._sum.amount || 0), 0);
                    const taux = ca > 0 ? Math.min((ver / ca) * 100, 100) : 0;
                    return (
                      <TableRow key={s.id}>
                        <TableCell className="font-medium">{s.name}</TableCell>
                        <TableCell className="text-right font-mono text-sm">{ca > 0 ? fmt(ca) : "—"}</TableCell>
                        <TableCell className="text-right font-mono text-sm font-semibold text-green-700">{ver > 0 ? fmt(ver) : "—"}</TableCell>
                        <TableCell className="text-right font-mono text-sm text-amber-600">{pending > 0 ? fmt(pending) : "—"}</TableCell>
                        <TableCell className="text-right">
                          {ca > 0 ? (
                            <div className="flex items-center justify-end gap-2">
                              <div className="w-16 h-1.5 bg-gray-100 rounded">
                                <div className="h-1.5 rounded" style={{ width: `${taux}%`, backgroundColor: taux > 80 ? "#16a34a" : taux > 50 ? "#f59e0b" : "#ef4444" }} />
                              </div>
                              <span className={`text-xs font-medium ${taux > 80 ? "text-green-600" : taux > 50 ? "text-amber-600" : "text-red-600"}`}>{taux.toFixed(0)}%</span>
                            </div>
                          ) : "—"}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  <TableRow className="bg-gray-50 font-bold text-sm">
                    <TableCell>TOTAL</TableCell>
                    <TableCell className="text-right font-mono">{fmt(totalCA)}</TableCell>
                    <TableCell className="text-right font-mono text-green-700">{fmt(totalVer)}</TableCell>
                    <TableCell className="text-right font-mono text-amber-600">
                      {fmt(versements.filter((v) => v.status === "EN_ATTENTE").reduce((s, v) => s + Number(v._sum.amount || 0), 0))}
                    </TableCell>
                    <TableCell className="text-right">
                      <span className={`text-sm font-bold ${totalCA > 0 && (totalVer / totalCA) > 0.8 ? "text-green-600" : "text-amber-600"}`}>
                        {totalCA > 0 ? `${Math.min((totalVer / totalCA) * 100, 100).toFixed(0)}%` : "—"}
                      </span>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
