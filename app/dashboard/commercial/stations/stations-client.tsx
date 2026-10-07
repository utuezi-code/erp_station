"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  BarChart2, Droplets, TrendingUp, CreditCard, Truck, ArrowDownCircle, ArrowUpCircle,
  Building2, AlertTriangle, ChevronRight,
} from "lucide-react";

function fmt(n: any, dec = 0) {
  return Number(n || 0).toLocaleString("fr-CI", { maximumFractionDigits: dec, minimumFractionDigits: dec });
}
function fmtDate(d: string | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("fr-CI", { day: "2-digit", month: "2-digit", year: "numeric" });
}

interface Station { id: string; name: string; code: string; city: string | null }
interface DailyIndexGroup { stationId: string; _sum: { volumeSold: number | null; revenue: number | null } }
interface TankMovement {
  id: string; stationId: string; date: string;
  openingStock: number; delivery: number; theoreticalStock: number; physicalStock: number | null; gap: number | null;
  tank: { name: string; capacity: number }; fuel: { name: string; code: string };
}
interface EncaissementGroup { stationId: string; type: string; _sum: { amount: number | null } }
interface VersementGroup { stationId: string; status: string; _sum: { amount: number | null }; _count: { id: number } }
interface Exploitation {
  id: string; stationId: string; period: string;
  fuelRevenue: number; shopRevenue: number; otherRevenue: number;
  salaries: number; water: number; electricity: number; security: number;
  maintenance: number; commissions: number; transport: number; taxes: number; otherCharges: number;
  grossResult: number; netResult: number;
}
interface CreditGroup { stationId: string; _sum: { amount: number | null; volume: number | null }; _count: { id: number } }
interface Depotage {
  id: string; stationId: string; date: string; quantity: number; truckNumber: string | null;
  blNumber: string | null; fuel: { name: string; code: string };
}
interface MiseADispo {
  id: string; stationId: string; quantityM15: number; quantityReel: number; correctionFactor: number | null;
  fuel: { name: string; code: string }; withdrawal: { date: string; blNumber: string | null; bepNumber: string | null };
}

const MOIS_LABELS: Record<string, string> = {
  "01": "Janvier", "02": "Février", "03": "Mars", "04": "Avril", "05": "Mai", "06": "Juin",
  "07": "Juillet", "08": "Août", "09": "Septembre", "10": "Octobre", "11": "Novembre", "12": "Décembre",
};

const ENCAISSEMENT_LABELS: Record<string, string> = {
  ESPECES: "Espèces", MOBILE_MONEY: "Mobile Money", CARTE_BANCAIRE: "Carte bancaire",
  BON_CARBURANT: "Bon carburant", CREDIT_CLIENT: "Crédit client",
};

export function StationsCompteClient({
  stations, mois, stationId,
  dailyIndexes, tankMovements, encaissements, versements, exploitation, credits, depotages, misesADispo,
}: {
  stations: Station[];
  mois: string;
  stationId: string;
  dailyIndexes: DailyIndexGroup[];
  tankMovements: TankMovement[];
  encaissements: EncaissementGroup[];
  versements: VersementGroup[];
  exploitation: Exploitation[];
  credits: CreditGroup[];
  depotages: Depotage[];
  misesADispo: MiseADispo[];
}) {
  const router = useRouter();
  const [tab, setTab] = useState("index");

  const selectedStation = stationId ? stations.find((s) => s.id === stationId) : null;
  const displayStations = stationId ? stations.filter((s) => s.id === stationId) : stations;

  const [moisYear, moisMonth] = mois.split("-");
  const moisLabel = `${MOIS_LABELS[moisMonth]} ${moisYear}`;

  // Helpers
  function indexForStation(sid: string) {
    return dailyIndexes.find((d) => d.stationId === sid);
  }
  function tanksForStation(sid: string) {
    const map = new Map<string, TankMovement>();
    tankMovements.filter((t) => t.stationId === sid).forEach((t) => {
      const key = t.tank.name + t.fuel.code;
      if (!map.has(key) || new Date(t.date) > new Date(map.get(key)!.date)) map.set(key, t);
    });
    return Array.from(map.values());
  }
  function encaissForStation(sid: string) {
    return encaissements.filter((e) => e.stationId === sid);
  }
  function versForStation(sid: string) {
    return versements.filter((v) => v.stationId === sid);
  }
  function exploitForStation(sid: string) {
    return exploitation.find((e) => e.stationId === sid);
  }
  function creditForStation(sid: string) {
    return credits.find((c) => c.stationId === sid);
  }
  function depotagesForStation(sid: string) {
    return depotages.filter((d) => d.stationId === sid);
  }
  function misesForStation(sid: string) {
    return misesADispo.filter((m) => m.stationId === sid);
  }

  // Month navigation
  function navigate(delta: number) {
    const [y, m] = mois.split("-").map(Number);
    const d = new Date(y, m - 1 + delta, 1);
    const nm = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const params = new URLSearchParams({ mois: nm });
    if (stationId) params.set("stationId", stationId);
    router.push(`/dashboard/commercial/stations?${params}`);
  }
  function selectStation(id: string) {
    const params = new URLSearchParams({ mois });
    if (id) params.set("stationId", id);
    router.push(`/dashboard/commercial/stations?${params}`);
  }

  // Grand totals
  const totalVolume = dailyIndexes.reduce((s, d) => s + Number(d._sum.volumeSold || 0), 0);
  const totalRevenue = dailyIndexes.reduce((s, d) => s + Number(d._sum.revenue || 0), 0);
  const totalEncaiss = encaissements.reduce((s, e) => s + Number(e._sum.amount || 0), 0);
  const totalVerses = versements.filter((v) => v.status === "VALIDE").reduce((s, v) => s + Number(v._sum.amount || 0), 0);
  const totalDepotage = depotages.reduce((s, d) => s + Number(d.quantity || 0), 0);
  const totalCredits = credits.reduce((s, c) => s + Number(c._sum.amount || 0), 0);

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm text-gray-400">Direction Commerciale</p>
          <h1 className="text-2xl font-bold text-gray-900">Comptes par station</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {selectedStation ? selectedStation.name : `${stations.length} stations`} · {moisLabel}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => navigate(-1)} className="px-3 py-1.5 rounded-lg border border-gray-200 text-sm hover:bg-gray-50">‹</button>
          <span className="px-4 py-1.5 rounded-lg bg-gray-100 text-sm font-medium">{moisLabel}</span>
          <button onClick={() => navigate(1)} className="px-3 py-1.5 rounded-lg border border-gray-200 text-sm hover:bg-gray-50">›</button>
          <Select value={stationId || "__all__"} onValueChange={(v) => selectStation(v === "__all__" ? "" : (v ?? ""))}>
            <SelectTrigger className="w-48 h-9">
              <SelectValue>
                {stationId ? (stations.find((s) => s.id === stationId)?.name ?? stationId) : "Toutes les stations"}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">Toutes les stations</SelectItem>
              {stations.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard icon={<BarChart2 className="w-5 h-5 text-blue-500" />} label="Volume vendu" value={`${fmt(totalVolume)} L`} color="blue" />
        <KpiCard icon={<TrendingUp className="w-5 h-5 text-green-500" />} label="CA carburant" value={`${fmt(totalRevenue)} F`} color="green" />
        <KpiCard icon={<ArrowUpCircle className="w-5 h-5 text-purple-500" />} label="Encaissé" value={`${fmt(totalEncaiss)} F`} color="purple" />
        <KpiCard icon={<ArrowDownCircle className="w-5 h-5 text-orange-500" />} label="Versé (validé)" value={`${fmt(totalVerses)} F`} color="orange" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <KpiCard icon={<Truck className="w-5 h-5 text-teal-500" />} label="Dépotages" value={`${fmt(totalDepotage)} L`} color="teal" sub={`${depotages.length} livraison${depotages.length > 1 ? "s" : ""}`} />
        <KpiCard icon={<CreditCard className="w-5 h-5 text-rose-500" />} label="Ventes à crédit" value={`${fmt(totalCredits)} F`} color="rose" sub={`${credits.reduce((s, c) => s + c._count.id, 0)} transactions`} />
        <KpiCard icon={<Droplets className="w-5 h-5 text-cyan-500" />} label="Mises à dispo" value={`${fmt(misesADispo.reduce((s, m) => s + Number(m.quantityM15 || 0), 0))} L M15`} color="cyan" sub={`${misesADispo.length} BL`} />
      </div>

      {/* ── Tabs ── */}
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="index">Index & Ventes</TabsTrigger>
          <TabsTrigger value="jauges">Jauges / Stocks</TabsTrigger>
          <TabsTrigger value="recettes">Recettes & Versements</TabsTrigger>
          <TabsTrigger value="depenses">Dépenses</TabsTrigger>
          <TabsTrigger value="credits">Crédits cartes</TabsTrigger>
          <TabsTrigger value="depotages">Dépotages</TabsTrigger>
        </TabsList>

        {/* ── INDEX ── */}
        <TabsContent value="index">
          <Card>
            <CardHeader><CardTitle className="text-sm">Volumes vendus & CA par station — {moisLabel}</CardTitle></CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Station</TableHead>
                    <TableHead className="text-right">Volume (L)</TableHead>
                    <TableHead className="text-right">CA (FCFA)</TableHead>
                    <TableHead className="text-right">Prix moy. (FCFA/L)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {displayStations.map((s) => {
                    const idx = indexForStation(s.id);
                    const vol = Number(idx?._sum.volumeSold || 0);
                    const rev = Number(idx?._sum.revenue || 0);
                    const pu = vol > 0 ? rev / vol : 0;
                    return (
                      <TableRow key={s.id} className="cursor-pointer hover:bg-gray-50" onClick={() => selectStation(s.id)}>
                        <TableCell>
                          <div className="font-medium">{s.name}</div>
                          <div className="text-xs text-gray-400">{s.code}{s.city ? ` · ${s.city}` : ""}</div>
                        </TableCell>
                        <TableCell className="text-right font-mono">{vol > 0 ? fmt(vol) : <span className="text-gray-300">—</span>}</TableCell>
                        <TableCell className="text-right font-mono">{rev > 0 ? fmt(rev) : <span className="text-gray-300">—</span>}</TableCell>
                        <TableCell className="text-right font-mono text-gray-500">{pu > 0 ? fmt(pu, 0) : "—"}</TableCell>
                      </TableRow>
                    );
                  })}
                  <TableRow className="bg-gray-50 font-bold">
                    <TableCell>TOTAL</TableCell>
                    <TableCell className="text-right font-mono">{fmt(totalVolume)}</TableCell>
                    <TableCell className="text-right font-mono">{fmt(totalRevenue)}</TableCell>
                    <TableCell className="text-right text-gray-500">
                      {totalVolume > 0 ? fmt(totalRevenue / totalVolume, 0) : "—"}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── JAUGES ── */}
        <TabsContent value="jauges">
          <div className="space-y-4">
            {displayStations.map((s) => {
              const tanks = tanksForStation(s.id);
              return (
                <Card key={s.id}>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-gray-400" />{s.name}
                      {tanks.length === 0 && <Badge className="bg-gray-100 text-gray-500 text-xs">Aucune donnée</Badge>}
                    </CardTitle>
                  </CardHeader>
                  {tanks.length > 0 && (
                    <CardContent className="p-0">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Cuve</TableHead>
                            <TableHead>Produit</TableHead>
                            <TableHead className="text-right">Stock ouv.</TableHead>
                            <TableHead className="text-right">Livraison</TableHead>
                            <TableHead className="text-right">Stock théo.</TableHead>
                            <TableHead className="text-right">Stock phys.</TableHead>
                            <TableHead className="text-right">Écart</TableHead>
                            <TableHead>Dernière saisie</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {tanks.map((t) => {
                            const ecart = Number(t.gap || 0);
                            return (
                              <TableRow key={t.id}>
                                <TableCell className="font-medium">{t.tank.name}</TableCell>
                                <TableCell><Badge className="bg-blue-50 text-blue-700 text-xs">{t.fuel.code}</Badge></TableCell>
                                <TableCell className="text-right font-mono">{fmt(t.openingStock)}</TableCell>
                                <TableCell className="text-right font-mono text-teal-600">{Number(t.delivery) > 0 ? `+${fmt(t.delivery)}` : "—"}</TableCell>
                                <TableCell className="text-right font-mono">{fmt(t.theoreticalStock)}</TableCell>
                                <TableCell className="text-right font-mono">{t.physicalStock != null ? fmt(t.physicalStock) : <span className="text-gray-300">—</span>}</TableCell>
                                <TableCell className={`text-right font-mono font-semibold ${ecart < -50 ? "text-red-600" : ecart > 50 ? "text-amber-600" : "text-green-600"}`}>
                                  {t.gap != null ? (ecart > 0 ? `+${fmt(ecart)}` : fmt(ecart)) : "—"}
                                </TableCell>
                                <TableCell className="text-xs text-gray-400">{fmtDate(t.date)}</TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </CardContent>
                  )}
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* ── RECETTES ── */}
        <TabsContent value="recettes">
          <div className="space-y-4">
            {displayStations.map((s) => {
              const encs = encaissForStation(s.id);
              const vers = versForStation(s.id);
              const totalEnc = encs.reduce((t, e) => t + Number(e._sum.amount || 0), 0);
              const totalVer = vers.filter((v) => v.status === "VALIDE").reduce((t, v) => t + Number(v._sum.amount || 0), 0);
              const totalVerPending = vers.filter((v) => v.status === "EN_ATTENTE").reduce((t, v) => t + Number(v._sum.amount || 0), 0);
              const ecart = totalEnc - totalVer;
              return (
                <Card key={s.id}>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center justify-between">
                      <span className="flex items-center gap-2"><Building2 className="w-4 h-4 text-gray-400" />{s.name}</span>
                      <span className={`text-sm font-bold ${ecart > 0 ? "text-amber-600" : "text-green-600"}`}>
                        Écart : {fmt(ecart)} F
                      </span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">Encaissements</p>
                        {encs.length === 0 ? <p className="text-sm text-gray-300">Aucun</p> : (
                          <div className="space-y-1">
                            {encs.map((e) => (
                              <div key={e.type} className="flex justify-between text-sm py-1 border-b border-gray-50">
                                <span className="text-gray-600">{ENCAISSEMENT_LABELS[e.type] || e.type}</span>
                                <span className="font-mono font-medium">{fmt(e._sum.amount || 0)} F</span>
                              </div>
                            ))}
                            <div className="flex justify-between text-sm font-bold pt-1">
                              <span>Total encaissé</span>
                              <span className="font-mono text-green-700">{fmt(totalEnc)} F</span>
                            </div>
                          </div>
                        )}
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">Versements</p>
                        <div className="space-y-1">
                          {totalVer > 0 && (
                            <div className="flex justify-between text-sm py-1 border-b border-gray-50">
                              <span className="text-gray-600 flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-400 inline-block" /> Validés</span>
                              <span className="font-mono font-medium">{fmt(totalVer)} F</span>
                            </div>
                          )}
                          {totalVerPending > 0 && (
                            <div className="flex justify-between text-sm py-1 border-b border-gray-50">
                              <span className="text-gray-600 flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400 inline-block" /> En attente</span>
                              <span className="font-mono font-medium">{fmt(totalVerPending)} F</span>
                            </div>
                          )}
                          {totalVer === 0 && totalVerPending === 0 && <p className="text-sm text-gray-300">Aucun</p>}
                          <div className="flex justify-between text-sm font-bold pt-1">
                            <span>Total versé</span>
                            <span className="font-mono text-blue-700">{fmt(totalVer)} F</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* ── DÉPENSES ── */}
        <TabsContent value="depenses">
          <div className="space-y-4">
            {displayStations.map((s) => {
              const exp = exploitForStation(s.id);
              if (!exp) return (
                <Card key={s.id}>
                  <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Building2 className="w-4 h-4 text-gray-400" />{s.name}</CardTitle></CardHeader>
                  <CardContent><p className="text-sm text-gray-400">Aucun compte d'exploitation saisi pour {moisLabel}.</p></CardContent>
                </Card>
              );
              const charges = [
                ["Salaires & charges", exp.salaries],
                ["Eau", exp.water],
                ["Électricité", exp.electricity],
                ["Sécurité", exp.security],
                ["Maintenance", exp.maintenance],
                ["Commissions", exp.commissions],
                ["Transport", exp.transport],
                ["Taxes", exp.taxes],
                ["Autres charges", exp.otherCharges],
              ] as [string, number][];
              const totalCharges = charges.reduce((t, [, v]) => t + Number(v || 0), 0);
              const totalRev = Number(exp.fuelRevenue || 0) + Number(exp.shopRevenue || 0) + Number(exp.otherRevenue || 0);
              return (
                <Card key={s.id}>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center justify-between">
                      <span className="flex items-center gap-2"><Building2 className="w-4 h-4 text-gray-400" />{s.name}</span>
                      <span className={`text-sm font-bold ${Number(exp.netResult) >= 0 ? "text-green-600" : "text-red-600"}`}>
                        Résultat net : {fmt(exp.netResult)} F
                      </span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-6">
                      <div>
                        <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">Produits</p>
                        <div className="space-y-1">
                          {[["Ventes carburant", exp.fuelRevenue], ["Boutique", exp.shopRevenue], ["Autres", exp.otherRevenue]] .map(([l, v]) => Number(v) > 0 && (
                            <div key={String(l)} className="flex justify-between text-sm py-1 border-b border-gray-50">
                              <span className="text-gray-600">{l}</span>
                              <span className="font-mono">{fmt(v)} F</span>
                            </div>
                          ))}
                          <div className="flex justify-between text-sm font-bold pt-1 text-green-700">
                            <span>Total produits</span><span className="font-mono">{fmt(totalRev)} F</span>
                          </div>
                        </div>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">Charges</p>
                        <div className="space-y-1">
                          {charges.filter(([, v]) => Number(v) > 0).map(([l, v]) => (
                            <div key={l} className="flex justify-between text-sm py-1 border-b border-gray-50">
                              <span className="text-gray-600">{l}</span>
                              <span className="font-mono">{fmt(v)} F</span>
                            </div>
                          ))}
                          <div className="flex justify-between text-sm font-bold pt-1 text-red-700">
                            <span>Total charges</span><span className="font-mono">{fmt(totalCharges)} F</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="mt-4 grid grid-cols-2 gap-3">
                      <div className="rounded-lg bg-blue-50 px-4 py-2 text-center">
                        <p className="text-xs text-blue-500">Résultat brut</p>
                        <p className={`text-base font-bold font-mono ${Number(exp.grossResult) >= 0 ? "text-blue-700" : "text-red-600"}`}>{fmt(exp.grossResult)} F</p>
                      </div>
                      <div className={`rounded-lg px-4 py-2 text-center ${Number(exp.netResult) >= 0 ? "bg-green-50" : "bg-red-50"}`}>
                        <p className={`text-xs ${Number(exp.netResult) >= 0 ? "text-green-500" : "text-red-400"}`}>Résultat net</p>
                        <p className={`text-base font-bold font-mono ${Number(exp.netResult) >= 0 ? "text-green-700" : "text-red-600"}`}>{fmt(exp.netResult)} F</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* ── CRÉDITS ── */}
        <TabsContent value="credits">
          <Card>
            <CardHeader><CardTitle className="text-sm">Ventes à crédit (cartes carburant) — {moisLabel}</CardTitle></CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Station</TableHead>
                    <TableHead className="text-right">Transactions</TableHead>
                    <TableHead className="text-right">Volume (L)</TableHead>
                    <TableHead className="text-right">Montant (FCFA)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {displayStations.map((s) => {
                    const cr = creditForStation(s.id);
                    return (
                      <TableRow key={s.id}>
                        <TableCell className="font-medium">{s.name}</TableCell>
                        <TableCell className="text-right">{cr ? cr._count.id : <span className="text-gray-300">0</span>}</TableCell>
                        <TableCell className="text-right font-mono">{cr ? fmt(cr._sum.volume || 0) : "—"}</TableCell>
                        <TableCell className="text-right font-mono font-semibold">{cr ? fmt(cr._sum.amount || 0) : "—"}</TableCell>
                      </TableRow>
                    );
                  })}
                  <TableRow className="bg-gray-50 font-bold">
                    <TableCell>TOTAL</TableCell>
                    <TableCell className="text-right">{credits.reduce((s, c) => s + c._count.id, 0)}</TableCell>
                    <TableCell className="text-right font-mono">{fmt(credits.reduce((s, c) => s + Number(c._sum.volume || 0), 0))}</TableCell>
                    <TableCell className="text-right font-mono">{fmt(totalCredits)}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── DÉPOTAGES ── */}
        <TabsContent value="depotages">
          <div className="space-y-4">
            {displayStations.map((s) => {
              const deps = depotagesForStation(s.id);
              const mises = misesForStation(s.id);
              return (
                <Card key={s.id}>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center justify-between">
                      <span className="flex items-center gap-2"><Building2 className="w-4 h-4 text-gray-400" />{s.name}</span>
                      <span className="text-xs text-gray-400">{deps.length + mises.length} mouvement{deps.length + mises.length > 1 ? "s" : ""}</span>
                    </CardTitle>
                  </CardHeader>
                  {(deps.length > 0 || mises.length > 0) && (
                    <CardContent className="p-0">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Date</TableHead>
                            <TableHead>Source</TableHead>
                            <TableHead>Produit</TableHead>
                            <TableHead>Réf. BL / N°</TableHead>
                            <TableHead className="text-right">Qté (L)</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {mises.map((m) => (
                            <TableRow key={m.id}>
                              <TableCell className="text-sm text-gray-500">{fmtDate(m.withdrawal.date)}</TableCell>
                              <TableCell><Badge className="bg-teal-50 text-teal-700 text-xs">GESTOCI → Station</Badge></TableCell>
                              <TableCell className="font-medium">{m.fuel.name} ({m.fuel.code})</TableCell>
                              <TableCell className="text-sm font-mono text-gray-500">
                                {m.withdrawal.blNumber || m.withdrawal.bepNumber || "—"}
                              </TableCell>
                              <TableCell className="text-right font-mono font-semibold">{fmt(m.quantityM15)} M15</TableCell>
                            </TableRow>
                          ))}
                          {deps.map((d) => (
                            <TableRow key={d.id}>
                              <TableCell className="text-sm text-gray-500">{fmtDate(d.date)}</TableCell>
                              <TableCell><Badge className="bg-blue-50 text-blue-700 text-xs">Livraison directe</Badge></TableCell>
                              <TableCell className="font-medium">{d.fuel.name} ({d.fuel.code})</TableCell>
                              <TableCell className="text-sm font-mono text-gray-500">{d.blNumber || "—"}</TableCell>
                              <TableCell className="text-right font-mono font-semibold">{fmt(d.quantity)} L</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  )}
                  {deps.length === 0 && mises.length === 0 && (
                    <CardContent><p className="text-sm text-gray-400">Aucun dépotage ce mois.</p></CardContent>
                  )}
                </Card>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function KpiCard({ icon, label, value, color, sub }: { icon: React.ReactNode; label: string; value: string; color: string; sub?: string }) {
  const colors: Record<string, string> = {
    blue: "bg-blue-50", green: "bg-green-50", purple: "bg-purple-50", orange: "bg-orange-50",
    teal: "bg-teal-50", rose: "bg-rose-50", cyan: "bg-cyan-50",
  };
  return (
    <div className={`rounded-xl border border-gray-100 p-4 ${colors[color] || "bg-gray-50"}`}>
      <div className="flex items-center gap-2 mb-1">{icon}<p className="text-xs text-gray-500">{label}</p></div>
      <p className="text-lg font-bold text-gray-800 tabular-nums">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  );
}
