"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Truck, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { createWithdrawal } from "./actions";
import { useRouter } from "next/navigation";

function fmt(n: any) { return Number(n || 0).toLocaleString("fr-CI", { maximumFractionDigits: 2 }); }

interface StockLine {
  fuel: { id: string; name: string; code: string };
  enteredM15: number;
  withdrawnM15: number;
  balance: number;
}

interface WithdrawalItem {
  id: string;
  quantityM15: number;
  quantityReel: number;
  unitPrice: number;
  fuel: { id: string; name: string; code: string };
  station: { id: string; name: string };
}

interface Withdrawal {
  id: string;
  number: string;
  date: string;
  status: string;
  truckRef: string | null;
  driverName: string | null;
  user: { name: string };
  items: WithdrawalItem[];
}

export function GESTOCIStockClient({
  stockByFuel,
  withdrawals,
  stations,
  fuels,
  role,
}: {
  stockByFuel: StockLine[];
  withdrawals: Withdrawal[];
  stations: { id: string; name: string }[];
  fuels: { id: string; name: string; code: string }[];
  role: string;
}) {
  const router = useRouter();
  const isDC = role === "DIRECTION_COMMERCIALE";
  const isAdmin = role === "ADMIN";
  const [showNew, setShowNew] = useState(false);
  const [loading, setLoading] = useState(false);

  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [truckRef, setTruckRef] = useState("");
  const [driverName, setDriverName] = useState("");
  const [note, setNote] = useState("");
  const [lines, setLines] = useState<{ fuelId: string; stationId: string; quantityM15: string; quantityReel: string; unitPrice: string }[]>([
    { fuelId: "", stationId: "", quantityM15: "", quantityReel: "", unitPrice: "" },
  ]);

  function addLine() { setLines([...lines, { fuelId: "", stationId: "", quantityM15: "", quantityReel: "", unitPrice: "" }]); }
  function removeLine(idx: number) { setLines(lines.filter((_, i) => i !== idx)); }

  async function submit() {
    const validLines = lines.filter((l) => l.fuelId && l.stationId && Number(l.quantityM15) > 0 && Number(l.quantityReel) > 0 && Number(l.unitPrice) > 0);
    if (validLines.length === 0) { toast.error("Au moins une ligne complète requise."); return; }
    setLoading(true);
    const r = await createWithdrawal({
      date,
      truckRef: truckRef || undefined,
      driverName: driverName || undefined,
      note: note || undefined,
      items: validLines.map((l) => ({
        fuelId: l.fuelId,
        stationId: l.stationId,
        quantityM15: Number(l.quantityM15),
        quantityReel: Number(l.quantityReel),
        unitPrice: Number(l.unitPrice),
      })),
    });
    setLoading(false);
    if (r.success) {
      toast.success("Retrait GESTOCI enregistré.");
      setShowNew(false);
      setLines([{ fuelId: "", stationId: "", quantityM15: "", quantityReel: "", unitPrice: "" }]);
      setTruckRef(""); setDriverName(""); setNote("");
      router.refresh();
    } else {
      toast.error("Erreur.");
    }
  }

  return (
    <>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Suivi stock GESTOCI</h1>
          <p className="text-gray-500 mt-1">Stocks à 15°C (M15) — GESTOCI</p>
        </div>
        {(isDC || isAdmin) && (
          <Button className="bg-[#0369A1] hover:bg-blue-700" onClick={() => setShowNew(true)}>
            <Truck className="w-4 h-4 mr-2" /> Retrait GESTOCI → Station
          </Button>
        )}
      </div>

      {/* Stock actuel */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {stockByFuel.length === 0 && (
          <div className="col-span-3 p-6 bg-gray-50 rounded-xl text-center text-gray-500 text-sm">
            Aucun stock enregistré. Commencez par créer un bon de commande SIR et enregistrez sa livraison.
          </div>
        )}
        {stockByFuel.map((s) => (
          <Card key={s.fuel.id} className={s.balance <= 0 ? "border-red-200" : s.balance < 10000 ? "border-amber-200" : ""}>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center justify-between">
                {s.fuel.name}
                <span className="text-xs font-normal text-gray-400">{s.fuel.code}</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Entrées</span>
                <span className="text-green-600 font-medium">+{fmt(s.enteredM15)} M15</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Retraits</span>
                <span className="text-red-500 font-medium">−{fmt(s.withdrawnM15)} M15</span>
              </div>
              <div className="flex justify-between pt-1 border-t">
                <span className="font-semibold">Solde</span>
                <span className={`font-bold text-base ${s.balance <= 0 ? "text-red-600" : s.balance < 10000 ? "text-amber-600" : "text-gray-900"}`}>
                  {fmt(s.balance)} M15
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Historique retraits */}
      <Card>
        <CardHeader><CardTitle className="text-sm">Historique des retraits</CardTitle></CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Numéro</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Camion</TableHead>
                <TableHead>Chauffeur</TableHead>
                <TableHead>Détail</TableHead>
                <TableHead>Par</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {withdrawals.map((w) => (
                <TableRow key={w.id}>
                  <TableCell className="font-mono text-sm">{w.number}</TableCell>
                  <TableCell className="text-sm">{new Date(w.date).toLocaleDateString("fr-CI")}</TableCell>
                  <TableCell className="text-sm text-gray-500">{w.truckRef || "—"}</TableCell>
                  <TableCell className="text-sm text-gray-500">{w.driverName || "—"}</TableCell>
                  <TableCell className="text-sm">
                    {w.items.map((i) => (
                      <div key={i.id} className="text-xs text-gray-600">
                        {i.fuel.code} → {i.station.name} : {fmt(i.quantityM15)} M15 / {fmt(i.quantityReel)} L réel
                      </div>
                    ))}
                  </TableCell>
                  <TableCell className="text-sm text-gray-400">{w.user.name}</TableCell>
                </TableRow>
              ))}
              {withdrawals.length === 0 && (
                <TableRow><TableCell colSpan={6} className="text-center text-gray-500 py-8">Aucun retrait.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Modal nouveau retrait */}
      <Dialog open={showNew} onOpenChange={(v) => { if (!v) setShowNew(false); }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Nouveau retrait GESTOCI → Station(s)</DialogTitle></DialogHeader>
          <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label>Date *</Label>
                <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Immat. camion</Label>
                <Input value={truckRef} onChange={(e) => setTruckRef(e.target.value)} placeholder="ex: CI-1234-AA" />
              </div>
              <div className="space-y-1">
                <Label>Chauffeur</Label>
                <Input value={driverName} onChange={(e) => setDriverName(e.target.value)} />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold uppercase tracking-wide">Lignes de retrait</Label>
                <Button variant="outline" size="sm" onClick={addLine}><Plus className="w-3 h-3 mr-1" /> Ligne</Button>
              </div>
              {lines.map((l, idx) => (
                <div key={idx} className="grid grid-cols-6 gap-2 items-end border rounded-lg p-3">
                  <div className="col-span-1 space-y-1">
                    <Label className="text-xs">Produit</Label>
                    <Select value={l.fuelId} onValueChange={(v) => { const n = [...lines]; n[idx] = { ...n[idx], fuelId: v ?? "" }; setLines(n); }}>
                      <SelectTrigger className="h-8"><SelectValue placeholder="—" /></SelectTrigger>
                      <SelectContent>{fuels.map((f) => <SelectItem key={f.id} value={f.id}>{f.code}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-1 space-y-1">
                    <Label className="text-xs">Station</Label>
                    <Select value={l.stationId} onValueChange={(v) => { const n = [...lines]; n[idx] = { ...n[idx], stationId: v ?? "" }; setLines(n); }}>
                      <SelectTrigger className="h-8"><SelectValue placeholder="—" /></SelectTrigger>
                      <SelectContent>{stations.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Qté M15</Label>
                    <Input className="h-8" type="number" placeholder="0" value={l.quantityM15} onChange={(e) => { const n = [...lines]; n[idx] = { ...n[idx], quantityM15: e.target.value }; setLines(n); }} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Qté réelle (L)</Label>
                    <Input className="h-8" type="number" placeholder="0" value={l.quantityReel} onChange={(e) => { const n = [...lines]; n[idx] = { ...n[idx], quantityReel: e.target.value }; setLines(n); }} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">P.U. (FCFA)</Label>
                    <Input className="h-8" type="number" placeholder="0" value={l.unitPrice} onChange={(e) => { const n = [...lines]; n[idx] = { ...n[idx], unitPrice: e.target.value }; setLines(n); }} />
                  </div>
                  <div className="flex items-end">
                    {lines.length > 1 && (
                      <Button variant="ghost" size="sm" className="h-8" onClick={() => removeLine(idx)}><Trash2 className="w-3 h-3 text-red-400" /></Button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 text-xs text-amber-700">
              <strong>Note :</strong> La quantité M15 est le volume de référence à 15°C (GESTOCI). La quantité réelle est le volume mesuré dans la citerne du camion à température ambiante. Les deux valeurs doivent être enregistrées.
            </div>

            <div className="space-y-1">
              <Label>Note</Label>
              <Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowNew(false)}>Annuler</Button>
            <Button className="bg-[#0369A1] hover:bg-blue-700" disabled={loading} onClick={submit}>
              <Truck className="w-4 h-4 mr-2" /> Enregistrer le retrait
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
