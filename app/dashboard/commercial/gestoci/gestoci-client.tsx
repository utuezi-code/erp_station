"use client";

import { useState, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Truck, Plus, Trash2, BarChart2, ClipboardList, AlertTriangle, ArrowDownCircle, ArrowUpCircle } from "lucide-react";
import { toast } from "sonner";
import { createWithdrawal, recordStockReading } from "./actions";
import { useRouter } from "next/navigation";

function fmt(n: any, dec = 0) { return Number(n || 0).toLocaleString("fr-CI", { maximumFractionDigits: dec, minimumFractionDigits: dec }); }
function fmtDate(d: string | null) { return d ? new Date(d).toLocaleDateString("fr-CI", { day: "2-digit", month: "2-digit", year: "numeric" }) : "—"; }

// ─── Types ───────────────────────────────────────────────────────────────────

interface StockLine {
  fuel: { id: string; name: string; code: string };
  enteredM15: number;
  withdrawnM15: number;
  balance: number;
}

interface GESTOCIEntry {
  id: string;
  date: string;
  quantityM15: number;
  fuelId: string;
  fuel: { id: string; name: string; code: string };
  deliveryOrder: { reference: string | null; sirOrder: { number: string } } | null;
}

interface WithdrawalItem {
  id: string;
  fuelId: string;
  quantityM15: number;
  quantityReel: number;
  correctionFactor: number | null;
  unitPrice: number;
  fuel: { id: string; name: string; code: string };
  station: { id: string; name: string };
}

interface Withdrawal {
  id: string;
  number: string;
  date: string;
  loadingDate: string | null;
  blNumber: string | null;
  bepNumber: string | null;
  truckRef: string | null;
  citerneRef: string | null;
  driverName: string | null;
  destination: string | null;
  status: string;
  note: string | null;
  user: { name: string };
  items: WithdrawalItem[];
}

interface StockReading {
  id: string;
  date: string;
  stockM15: number;
  fuelId: string;
  fuel: { id: string; name: string; code: string };
  note: string | null;
  user: { name: string };
}

// ─── Timeline event for the journal ──────────────────────────────────────────

type JournalEvent =
  | { kind: "entry"; date: string; entry: GESTOCIEntry }
  | { kind: "bl"; date: string; withdrawal: Withdrawal }
  | { kind: "reading"; date: string; reading: StockReading };

// ─── Main Component ───────────────────────────────────────────────────────────

export function GESTOCIStockClient({
  stockByFuel,
  entries,
  withdrawals,
  stockReadings,
  stations,
  fuels,
  role,
}: {
  stockByFuel: StockLine[];
  entries: GESTOCIEntry[];
  withdrawals: Withdrawal[];
  stockReadings: StockReading[];
  stations: { id: string; name: string }[];
  fuels: { id: string; name: string; code: string }[];
  role: string;
}) {
  const router = useRouter();
  const isDC = role === "DIRECTION_COMMERCIALE" || role === "ADMIN";

  const [showNewBL, setShowNewBL] = useState(false);
  const [showReading, setShowReading] = useState(false);
  const [loading, setLoading] = useState(false);

  // BL form state
  const [blDate, setBlDate] = useState(new Date().toISOString().slice(0, 10));
  const [blLoadingDate, setBlLoadingDate] = useState("");
  const [blNumber, setBlNumber] = useState("");
  const [bepNumber, setBepNumber] = useState("");
  const [truckRef, setTruckRef] = useState("");
  const [citerneRef, setCiterneRef] = useState("");
  const [driverName, setDriverName] = useState("");
  const [destination, setDestination] = useState("");
  const [blNote, setBlNote] = useState("");
  const [lines, setLines] = useState<{
    fuelId: string; stationId: string;
    quantityReel: string; correctionFactor: string; quantityM15: string; unitPrice: string;
  }[]>([{ fuelId: "", stationId: "", quantityReel: "", correctionFactor: "", quantityM15: "", unitPrice: "" }]);

  // Stock reading form state
  const [readDate, setReadDate] = useState(new Date().toISOString().slice(0, 10));
  const [readNote, setReadNote] = useState("");
  const [readLines, setReadLines] = useState<{ fuelId: string; stockM15: string }[]>(
    fuels.map((f) => ({ fuelId: f.id, stockM15: "" }))
  );

  // Auto-compute M15 from reel × factor
  function updateLine(idx: number, field: string, val: string) {
    const n = [...lines];
    n[idx] = { ...n[idx], [field]: val };
    if (field === "quantityReel" || field === "correctionFactor") {
      const reel = Number(field === "quantityReel" ? val : n[idx].quantityReel) || 0;
      const factor = Number(field === "correctionFactor" ? val : n[idx].correctionFactor) || 0;
      if (reel > 0 && factor > 0) {
        n[idx].quantityM15 = (reel * factor).toFixed(0);
      }
    }
    setLines(n);
  }

  function addLine() { setLines([...lines, { fuelId: "", stationId: "", quantityReel: "", correctionFactor: "", quantityM15: "", unitPrice: "" }]); }
  function removeLine(idx: number) { if (lines.length > 1) setLines(lines.filter((_, i) => i !== idx)); }

  async function submitBL() {
    const validLines = lines.filter((l) => l.fuelId && l.stationId && Number(l.quantityM15) > 0);
    if (validLines.length === 0) { toast.error("Au moins une ligne complète requise."); return; }
    setLoading(true);
    const r = await createWithdrawal({
      date: blDate,
      loadingDate: blLoadingDate || undefined,
      blNumber: blNumber || undefined,
      bepNumber: bepNumber || undefined,
      truckRef: truckRef || undefined,
      citerneRef: citerneRef || undefined,
      driverName: driverName || undefined,
      destination: destination || undefined,
      note: blNote || undefined,
      items: validLines.map((l) => ({
        fuelId: l.fuelId,
        stationId: l.stationId,
        quantityM15: Number(l.quantityM15),
        quantityReel: Number(l.quantityReel) || Number(l.quantityM15),
        correctionFactor: Number(l.correctionFactor) || undefined,
        unitPrice: Number(l.unitPrice) || 0,
      })),
    });
    setLoading(false);
    if (r.success) {
      toast.success("BL IVORY enregistré.");
      setShowNewBL(false);
      resetBL();
      router.refresh();
    } else {
      toast.error("Erreur lors de l'enregistrement.");
    }
  }

  function resetBL() {
    setBlDate(new Date().toISOString().slice(0, 10));
    setBlLoadingDate(""); setBlNumber(""); setBepNumber(""); setTruckRef("");
    setCiterneRef(""); setDriverName(""); setDestination(""); setBlNote("");
    setLines([{ fuelId: "", stationId: "", quantityReel: "", correctionFactor: "", quantityM15: "", unitPrice: "" }]);
  }

  async function submitReading() {
    const valid = readLines.filter((l) => l.fuelId && Number(l.stockM15) >= 0 && l.stockM15 !== "");
    if (valid.length === 0) { toast.error("Saisissez au moins un stock."); return; }
    setLoading(true);
    const r = await recordStockReading({
      date: readDate,
      readings: valid.map((l) => ({ fuelId: l.fuelId, stockM15: Number(l.stockM15) })),
      note: readNote || undefined,
    });
    setLoading(false);
    if (r.success) {
      toast.success("Relevé GESTOCI enregistré.");
      setShowReading(false);
      setReadNote(""); setReadDate(new Date().toISOString().slice(0, 10));
      setReadLines(fuels.map((f) => ({ fuelId: f.id, stockM15: "" })));
      router.refresh();
    } else {
      toast.error("Erreur.");
    }
  }

  // ─── Build journal events sorted by date ──────────────────────────────────
  const journalEvents = useMemo<JournalEvent[]>(() => {
    const evts: JournalEvent[] = [
      ...entries.map((e) => ({ kind: "entry" as const, date: e.date, entry: e })),
      ...withdrawals.map((w) => ({ kind: "bl" as const, date: w.loadingDate || w.date, withdrawal: w })),
      ...stockReadings.map((r) => ({ kind: "reading" as const, date: r.date, reading: r })),
    ];
    return evts.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [entries, withdrawals, stockReadings]);

  // Running theoretical stock per fuel
  const journalWithBalance = useMemo(() => {
    const balance: Record<string, number> = {};
    return journalEvents.map((evt) => {
      const snap = { ...balance };
      if (evt.kind === "entry") {
        balance[evt.entry.fuelId] = (balance[evt.entry.fuelId] || 0) + Number(evt.entry.quantityM15);
      } else if (evt.kind === "bl") {
        for (const item of evt.withdrawal.items) {
          balance[item.fuelId] = (balance[item.fuelId] || 0) - Number(item.quantityM15);
        }
      }
      return { evt, balanceBefore: snap, balanceAfter: { ...balance } };
    });
  }, [journalEvents]);

  // Latest GESTOCI reading per fuel (for ecart display)
  const latestReading = useMemo<Record<string, StockReading>>(() => {
    const map: Record<string, StockReading> = {};
    for (const r of stockReadings) map[r.fuelId] = r;
    return map;
  }, [stockReadings]);

  return (
    <>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-400">Module Commercial</p>
          <h1 className="text-2xl font-bold text-gray-900">Suivi stock GESTOCI — IVORY ENERGIES CI 2026</h1>
          <p className="text-gray-500 mt-1 text-sm">Contrôle des stocks à 15°C (M15)</p>
        </div>
        {isDC && (
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setShowReading(true)}>
              <ClipboardList className="w-4 h-4 mr-2" /> Relevé GESTOCI
            </Button>
            <Button className="bg-[#0369A1] hover:bg-blue-700" onClick={() => setShowNewBL(true)}>
              <Truck className="w-4 h-4 mr-2" /> Saisir BL IVORY
            </Button>
          </div>
        )}
      </div>

      {/* Stock cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {stockByFuel.length === 0 && (
          <div className="col-span-4 p-8 bg-gray-50 rounded-xl text-center text-gray-500 text-sm">
            Aucun stock enregistré. Enregistrez d'abord une livraison SIR pour créer les entrées GESTOCI.
          </div>
        )}
        {stockByFuel.map((s) => {
          const lr = latestReading[s.fuel.id];
          const ecart = lr ? s.balance - Number(lr.stockM15) : null;
          return (
            <Card key={s.fuel.id} className={s.balance <= 0 ? "border-red-300" : s.balance < 20000 ? "border-amber-300" : ""}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center justify-between">
                  <span>{s.fuel.name}</span>
                  <span className="text-xs font-normal text-gray-400 bg-gray-100 px-2 py-0.5 rounded">{s.fuel.code}</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1.5 text-sm">
                <div className="flex justify-between text-xs text-gray-500">
                  <span>Entrées SIR</span>
                  <span className="text-green-600 font-medium">+{fmt(s.enteredM15)} L</span>
                </div>
                <div className="flex justify-between text-xs text-gray-500">
                  <span>BL édités</span>
                  <span className="text-red-500 font-medium">−{fmt(s.withdrawnM15)} L</span>
                </div>
                <div className="flex justify-between pt-1 border-t mt-1">
                  <span className="font-semibold text-xs">Stock théorique M15</span>
                  <span className={`font-bold text-sm ${s.balance <= 0 ? "text-red-600" : s.balance < 20000 ? "text-amber-600" : "text-gray-900"}`}>
                    {fmt(s.balance)} L
                  </span>
                </div>
                {lr && (
                  <div className="flex justify-between text-xs border-t pt-1">
                    <span className="text-gray-400">Relevé GESTOCI</span>
                    <span className="text-blue-600">{fmt(Number(lr.stockM15))} L</span>
                  </div>
                )}
                {ecart !== null && (
                  <div className={`flex justify-between text-xs font-medium ${Math.abs(ecart) > 1000 ? "text-red-600" : "text-gray-500"}`}>
                    <span>Écart</span>
                    <span>{ecart > 0 ? "+" : ""}{fmt(ecart)} L</span>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Journal */}
      <Tabs defaultValue="journal">
        <TabsList className="mb-4">
          <TabsTrigger value="journal"><BarChart2 className="w-4 h-4 mr-1.5" />Journal de bord</TabsTrigger>
          <TabsTrigger value="readings"><ClipboardList className="w-4 h-4 mr-1.5" />Relevés GESTOCI</TabsTrigger>
        </TabsList>

        <TabsContent value="journal">
          <Card>
            <CardContent className="p-0 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="text-xs bg-gray-50">
                    <TableHead className="w-28">Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Référence</TableHead>
                    <TableHead>Produit(s)</TableHead>
                    <TableHead>Destination / Détail</TableHead>
                    <TableHead className="text-right">Entrée (L M15)</TableHead>
                    <TableHead className="text-right">Sortie (L M15)</TableHead>
                    <TableHead className="text-right">Stock SUPER</TableHead>
                    <TableHead className="text-right">Stock GASOIL</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {journalWithBalance.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center text-gray-400 py-12 text-sm">
                        Aucun mouvement enregistré.
                      </TableCell>
                    </TableRow>
                  )}
                  {journalWithBalance.map(({ evt, balanceAfter }, i) => {
                    if (evt.kind === "entry") {
                      const e = evt.entry;
                      return (
                        <TableRow key={e.id} className="bg-green-50/40 hover:bg-green-50">
                          <TableCell className="text-xs font-medium">{fmtDate(e.date)}</TableCell>
                          <TableCell>
                            <Badge className="bg-green-100 text-green-700 border-0 text-xs">
                              <ArrowDownCircle className="w-3 h-3 mr-1" />Entrée SIR
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs font-mono text-gray-600">
                            {e.deliveryOrder?.sirOrder?.number || "—"}
                          </TableCell>
                          <TableCell className="text-xs font-medium">{e.fuel.code}</TableCell>
                          <TableCell className="text-xs text-gray-500">
                            BL livraison {e.deliveryOrder?.reference || ""}
                          </TableCell>
                          <TableCell className="text-right text-xs font-semibold text-green-700">
                            +{fmt(e.quantityM15)}
                          </TableCell>
                          <TableCell className="text-right text-xs text-gray-300">—</TableCell>
                          <TableCell className="text-right text-xs font-mono">
                            {stockByFuel.find(s => s.fuel.code === "SPE" || s.fuel.name.toLowerCase().includes("super"))
                              ? fmt(balanceAfter[stockByFuel.find(s => s.fuel.name.toLowerCase().includes("super"))?.fuel.id || ""] || 0)
                              : "—"}
                          </TableCell>
                          <TableCell className="text-right text-xs font-mono">
                            {stockByFuel.find(s => s.fuel.name.toLowerCase().includes("gasoil") || s.fuel.code === "GO")
                              ? fmt(balanceAfter[stockByFuel.find(s => s.fuel.name.toLowerCase().includes("gasoil"))?.fuel.id || ""] || 0)
                              : "—"}
                          </TableCell>
                        </TableRow>
                      );
                    }

                    if (evt.kind === "bl") {
                      const w = evt.withdrawal;
                      const totalM15 = w.items.reduce((s, i) => s + Number(i.quantityM15), 0);
                      return (
                        <TableRow key={w.id} className="hover:bg-gray-50">
                          <TableCell className="text-xs font-medium">{fmtDate(w.loadingDate || w.date)}</TableCell>
                          <TableCell>
                            <Badge className="bg-blue-50 text-blue-700 border-0 text-xs">
                              <ArrowUpCircle className="w-3 h-3 mr-1" />BL Ivory
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs">
                            <div className="font-mono text-gray-700">{w.blNumber ? `N° ${w.blNumber}` : w.number}</div>
                            {w.bepNumber && <div className="text-gray-400">BEP {w.bepNumber}</div>}
                          </TableCell>
                          <TableCell className="text-xs">
                            {w.items.map((item, idx) => (
                              <div key={idx} className="text-gray-700">
                                <span className="font-medium">{item.fuel.code}</span>
                                {item.correctionFactor && (
                                  <span className="text-gray-400 ml-1">×{item.correctionFactor}</span>
                                )}
                              </div>
                            ))}
                          </TableCell>
                          <TableCell className="text-xs">
                            <div className="font-medium text-gray-800">{w.destination || "—"}</div>
                            <div className="text-gray-400">
                              {[w.truckRef, w.citerneRef].filter(Boolean).join(" / ")}
                            </div>
                            {w.items.map((item, idx) => (
                              <div key={idx} className="text-gray-500">
                                → {item.station.name} : {fmt(item.quantityReel)} L amb. / {fmt(item.quantityM15)} L M15
                                {item.correctionFactor && Number(item.correctionFactor) > 0 && (
                                  <span className={`ml-1 ${Math.abs(Number(item.quantityM15) - Number(item.quantityReel) * Number(item.correctionFactor)) > 10 ? "text-amber-600" : "text-gray-400"}`}>
                                    (th. {fmt(Number(item.quantityReel) * Number(item.correctionFactor))})
                                  </span>
                                )}
                              </div>
                            ))}
                          </TableCell>
                          <TableCell className="text-right text-xs text-gray-300">—</TableCell>
                          <TableCell className="text-right text-xs font-semibold text-red-600">
                            −{fmt(totalM15)}
                          </TableCell>
                          <TableCell className="text-right text-xs font-mono">
                            {(() => {
                              const sf = stockByFuel.find(s => s.fuel.name.toLowerCase().includes("super"));
                              return sf ? fmt(balanceAfter[sf.fuel.id] || 0) : "—";
                            })()}
                          </TableCell>
                          <TableCell className="text-right text-xs font-mono">
                            {(() => {
                              const gf = stockByFuel.find(s => s.fuel.name.toLowerCase().includes("gasoil"));
                              return gf ? fmt(balanceAfter[gf.fuel.id] || 0) : "—";
                            })()}
                          </TableCell>
                        </TableRow>
                      );
                    }

                    if (evt.kind === "reading") {
                      const r = evt.reading;
                      return (
                        <TableRow key={r.id} className="bg-purple-50/40">
                          <TableCell className="text-xs font-medium">{fmtDate(r.date)}</TableCell>
                          <TableCell>
                            <Badge className="bg-purple-100 text-purple-700 border-0 text-xs">
                              <ClipboardList className="w-3 h-3 mr-1" />Relevé GESTOCI
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs text-gray-400">—</TableCell>
                          <TableCell className="text-xs font-medium">{r.fuel.code}</TableCell>
                          <TableCell className="text-xs text-gray-500">
                            Communiqué par GESTOCI — {fmt(Number(r.stockM15))} L M15
                            {r.note && <span className="ml-1 text-gray-400">· {r.note}</span>}
                          </TableCell>
                          <TableCell colSpan={2} className="text-center text-xs text-purple-600 font-medium">
                            Stock officiel : {fmt(Number(r.stockM15))} L
                          </TableCell>
                          <TableCell className="text-right text-xs font-mono">
                            {(() => {
                              const sf = stockByFuel.find(s => s.fuel.name.toLowerCase().includes("super"));
                              return sf ? fmt(balanceAfter[sf.fuel.id] || 0) : "—";
                            })()}
                          </TableCell>
                          <TableCell className="text-right text-xs font-mono">
                            {(() => {
                              const gf = stockByFuel.find(s => s.fuel.name.toLowerCase().includes("gasoil"));
                              return gf ? fmt(balanceAfter[gf.fuel.id] || 0) : "—";
                            })()}
                          </TableCell>
                        </TableRow>
                      );
                    }

                    return null;
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="readings">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Relevés officiels communiqués par la GESTOCI</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Produit</TableHead>
                    <TableHead className="text-right">Stock GESTOCI (L M15)</TableHead>
                    <TableHead className="text-right">Stock théorique (L M15)</TableHead>
                    <TableHead className="text-right">Écart</TableHead>
                    <TableHead>Note</TableHead>
                    <TableHead>Par</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[...stockReadings].reverse().map((r) => {
                    const sf = stockByFuel.find((s) => s.fuel.id === r.fuelId);
                    const theorique = sf?.balance ?? null;
                    const ecart = theorique !== null ? theorique - Number(r.stockM15) : null;
                    return (
                      <TableRow key={r.id}>
                        <TableCell className="text-sm">{fmtDate(r.date)}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">{r.fuel.code}</Badge>
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm text-purple-700">
                          {fmt(Number(r.stockM15))}
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm">
                          {theorique !== null ? fmt(theorique) : "—"}
                        </TableCell>
                        <TableCell className="text-right">
                          {ecart !== null ? (
                            <span className={`text-sm font-semibold ${Math.abs(ecart) > 1000 ? "text-red-600" : Math.abs(ecart) > 200 ? "text-amber-600" : "text-green-600"}`}>
                              {ecart > 0 ? "+" : ""}{fmt(ecart)}
                              {Math.abs(ecart) > 1000 && <AlertTriangle className="w-3 h-3 inline ml-1" />}
                            </span>
                          ) : "—"}
                        </TableCell>
                        <TableCell className="text-sm text-gray-500">{r.note || "—"}</TableCell>
                        <TableCell className="text-sm text-gray-400">{r.user.name}</TableCell>
                      </TableRow>
                    );
                  })}
                  {stockReadings.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-gray-400 py-8 text-sm">
                        Aucun relevé enregistré. Cliquez sur "Relevé GESTOCI" pour en saisir un.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ─── Modal : Saisir BL IVORY ─────────────────────────────────────────── */}
      <Dialog open={showNewBL} onOpenChange={(v) => { if (!v) { setShowNewBL(false); resetBL(); } }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Saisir un BL IVORY — Retrait GESTOCI</DialogTitle>
          </DialogHeader>
          <div className="space-y-5">
            {/* Dates & BL info */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Date d'émission BL *</Label>
                <Input type="date" value={blDate} onChange={(e) => setBlDate(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Date de chargement</Label>
                <Input type="date" value={blLoadingDate} onChange={(e) => setBlLoadingDate(e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label>N° BL IVORY</Label>
                <Input value={blNumber} onChange={(e) => setBlNumber(e.target.value)} placeholder="ex: 393" />
              </div>
              <div className="space-y-1">
                <Label>N° BEP</Label>
                <Input value={bepNumber} onChange={(e) => setBepNumber(e.target.value)} placeholder="ex: 1037" />
              </div>
              <div className="space-y-1">
                <Label>Destination / Client</Label>
                <Input value={destination} onChange={(e) => setDestination(e.target.value)} placeholder="ex: SARHALA" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label>N° Tracteur</Label>
                <Input value={truckRef} onChange={(e) => setTruckRef(e.target.value)} placeholder="ex: 46991WWCI01" />
              </div>
              <div className="space-y-1">
                <Label>N° Citerne</Label>
                <Input value={citerneRef} onChange={(e) => setCiterneRef(e.target.value)} placeholder="ex: AA 498 SG 02" />
              </div>
              <div className="space-y-1">
                <Label>Chauffeur</Label>
                <Input value={driverName} onChange={(e) => setDriverName(e.target.value)} />
              </div>
            </div>

            {/* Lignes produits */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-xs font-semibold uppercase tracking-wide">Lignes de chargement</Label>
                <Button variant="outline" size="sm" onClick={addLine}><Plus className="w-3 h-3 mr-1" /> Ligne</Button>
              </div>
              <div className="bg-blue-50 border border-blue-100 rounded-lg px-3 py-2 text-xs text-blue-700 mb-3">
                Saisir la quantité ambiante (citerne) et le facteur de correction. Le volume M15 est calculé automatiquement.
              </div>
              {lines.map((l, idx) => (
                <div key={idx} className="grid grid-cols-7 gap-2 items-end border rounded-lg p-3 mb-2">
                  <div className="space-y-1">
                    <Label className="text-xs">Produit *</Label>
                    <Select value={l.fuelId} onValueChange={(v) => updateLine(idx, "fuelId", v ?? "")}>
                      <SelectTrigger className="h-8"><SelectValue placeholder="—" /></SelectTrigger>
                      <SelectContent>{fuels.map((f) => <SelectItem key={f.id} value={f.id}>{f.code}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Station *</Label>
                    <Select value={l.stationId} onValueChange={(v) => updateLine(idx, "stationId", v ?? "")}>
                      <SelectTrigger className="h-8"><SelectValue placeholder="—" /></SelectTrigger>
                      <SelectContent>{stations.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Qté ambiant (L)</Label>
                    <Input className="h-8 text-right" type="number" placeholder="0" value={l.quantityReel}
                      onChange={(e) => updateLine(idx, "quantityReel", e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Facteur corr.</Label>
                    <Input className="h-8 text-right" type="number" step="0.0001" placeholder="0.9813" value={l.correctionFactor}
                      onChange={(e) => updateLine(idx, "correctionFactor", e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Qté M15 (BL) *</Label>
                    <Input className="h-8 text-right bg-blue-50 font-medium" type="number" placeholder="calculé" value={l.quantityM15}
                      onChange={(e) => updateLine(idx, "quantityM15", e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">P.U. (FCFA)</Label>
                    <Input className="h-8 text-right" type="number" placeholder="0" value={l.unitPrice}
                      onChange={(e) => updateLine(idx, "unitPrice", e.target.value)} />
                  </div>
                  <div className="flex items-end pb-0.5">
                    {lines.length > 1 && (
                      <Button variant="ghost" size="sm" className="h-8" onClick={() => removeLine(idx)}>
                        <Trash2 className="w-3 h-3 text-red-400" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="space-y-1">
              <Label>Note</Label>
              <Textarea rows={2} value={blNote} onChange={(e) => setBlNote(e.target.value)} placeholder="Observations..." />
            </div>
          </div>
          <DialogFooter className="gap-2 mt-4">
            <Button variant="outline" onClick={() => { setShowNewBL(false); resetBL(); }}>Annuler</Button>
            <Button className="bg-[#0369A1] hover:bg-blue-700" disabled={loading} onClick={submitBL}>
              <Truck className="w-4 h-4 mr-2" /> Enregistrer le BL
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Modal : Relevé GESTOCI ──────────────────────────────────────────── */}
      <Dialog open={showReading} onOpenChange={(v) => { if (!v) setShowReading(false); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Relevé stock communiqué par GESTOCI</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1">
              <Label>Date du relevé *</Label>
              <Input type="date" value={readDate} onChange={(e) => setReadDate(e.target.value)} />
            </div>
            <div className="bg-purple-50 border border-purple-100 rounded-lg px-3 py-2 text-xs text-purple-700">
              Saisir les stocks à 15°C tels que communiqués officiellement par la GESTOCI.
            </div>
            {readLines.map((rl, idx) => {
              const fuel = fuels.find((f) => f.id === rl.fuelId);
              if (!fuel) return null;
              return (
                <div key={idx} className="flex items-center gap-3">
                  <Label className="w-24 text-sm font-medium">{fuel.name}</Label>
                  <div className="flex-1">
                    <Input
                      type="number"
                      placeholder={`Stock ${fuel.code} (L M15)`}
                      value={rl.stockM15}
                      onChange={(e) => {
                        const n = [...readLines];
                        n[idx] = { ...n[idx], stockM15: e.target.value };
                        setReadLines(n);
                      }}
                    />
                  </div>
                  <span className="text-xs text-gray-400 w-12">L M15</span>
                </div>
              );
            })}
            <div className="space-y-1">
              <Label>Note</Label>
              <Textarea rows={2} value={readNote} onChange={(e) => setReadNote(e.target.value)} placeholder="Source, observations..." />
            </div>
          </div>
          <DialogFooter className="gap-2 mt-2">
            <Button variant="outline" onClick={() => setShowReading(false)}>Annuler</Button>
            <Button className="bg-purple-700 hover:bg-purple-800" disabled={loading} onClick={submitReading}>
              <ClipboardList className="w-4 h-4 mr-2" /> Enregistrer le relevé
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
