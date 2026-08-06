"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Truck, Link as LinkIcon } from "lucide-react";
import { saveLivraison } from "./actions";
import { toast } from "sonner";

function fmt(n: any) { return Number(n || 0).toLocaleString("fr-CI", { maximumFractionDigits: 1 }); }

interface MD {
  id: string;
  number: string;
  date: string | Date;
  quantity: number;
  fuel: { name: string; code: string; unit: string };
}

interface Delivery {
  id: string;
  date: string | Date;
  quantity: number;
  blNumber?: string | null;
  truckNumber?: string | null;
  depot?: string | null;
  fuel: { name: string };
  miseADispo?: { number: string; status: string } | null;
}

export function LivraisonsClient({ stationId, deliveries, fuels, pendingMDs }: {
  stationId: string;
  deliveries: Delivery[];
  fuels: { id: string; name: string }[];
  pendingMDs: MD[];
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [linkedMD, setLinkedMD] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    if (linkedMD) fd.set("miseADispoId", linkedMD);
    try {
      await saveLivraison(fd);
      toast.success("Livraison enregistrée." + (linkedMD ? " Mise à disposition marquée livrée." : ""));
      setOpen(false);
      setLinkedMD("");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }

  const selectedMD = pendingMDs.find((m) => m.id === linkedMD);

  return (
    <>
      {/* MDs en attente */}
      {pendingMDs.length > 0 && (
        <div className="mb-6 bg-blue-50 border border-blue-200 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <Truck className="w-4 h-4 text-blue-600" />
            <p className="text-sm font-semibold text-blue-800">
              {pendingMDs.length} mise{pendingMDs.length > 1 ? "s" : ""} à disposition en attente de livraison
            </p>
          </div>
          <div className="space-y-2">
            {pendingMDs.map((md) => (
              <div key={md.id} className="flex items-center justify-between bg-white rounded-xl px-4 py-2.5 border border-blue-100">
                <div>
                  <p className="text-sm font-semibold text-gray-800">{md.number}</p>
                  <p className="text-xs text-gray-500">
                    {md.fuel.name} · {fmt(md.quantity)} {md.fuel.unit} · {new Date(md.date).toLocaleDateString("fr-CI")}
                  </p>
                </div>
                <button
                  onClick={() => { setLinkedMD(md.id); setOpen(true); }}
                  className="text-xs px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-1"
                >
                  <LinkIcon className="w-3 h-3" /> Confirmer réception
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex justify-end mb-4">
        <Button onClick={() => { setLinkedMD(""); setOpen(true); }} className="bg-[#0369A1] hover:bg-blue-700">
          <Plus className="w-4 h-4 mr-2" /> Nouvelle livraison
        </Button>
      </div>

      <div className="bg-white rounded-xl border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Carburant</TableHead>
              <TableHead className="text-right">Quantité (L)</TableHead>
              <TableHead>N° BL</TableHead>
              <TableHead>Camion</TableHead>
              <TableHead>Dépôt</TableHead>
              <TableHead>MD liée</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {deliveries.map((d) => (
              <TableRow key={d.id}>
                <TableCell>{new Date(d.date).toLocaleDateString("fr-CI")}</TableCell>
                <TableCell>{d.fuel.name}</TableCell>
                <TableCell className="text-right font-medium">{fmt(d.quantity)}</TableCell>
                <TableCell>{d.blNumber || "—"}</TableCell>
                <TableCell>{d.truckNumber || "—"}</TableCell>
                <TableCell>{d.depot || "—"}</TableCell>
                <TableCell>
                  {d.miseADispo ? (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-medium">
                      {d.miseADispo.number}
                    </span>
                  ) : "—"}
                </TableCell>
              </TableRow>
            ))}
            {deliveries.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-gray-500 py-6">Aucune livraison enregistrée.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setLinkedMD(""); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {selectedMD ? `Confirmer réception — ${selectedMD.number}` : "Enregistrer une livraison"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <input type="hidden" name="stationId" value={stationId} />

            {/* Lier à une MD */}
            <div className="space-y-2">
              <Label>Mise à disposition GESTOCI</Label>
              <Select value={linkedMD} onValueChange={(v) => setLinkedMD(v ?? "")}>
                <SelectTrigger>
                  <SelectValue placeholder="Aucune MD liée (livraison directe)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Aucune MD liée</SelectItem>
                  {pendingMDs.map((md) => (
                    <SelectItem key={md.id} value={md.id}>
                      {md.number} — {md.fuel.name} {fmt(md.quantity)} {md.fuel.unit}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedMD && (
                <p className="text-xs text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg">
                  En liant cette livraison, la MD {selectedMD.number} sera automatiquement marquée <strong>Livrée</strong>.
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Date</Label>
                <Input name="date" type="date" defaultValue={new Date().toISOString().split("T")[0]} required />
              </div>
              <div className="space-y-2">
                <Label>Carburant</Label>
                <Select name="fuelId" required defaultValue={selectedMD?.fuel?.name ? undefined : undefined}>
                  <SelectTrigger><SelectValue placeholder="Choisir..." /></SelectTrigger>
                  <SelectContent>{fuels.map((f) => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Quantité livrée (L)</Label>
              <Input
                name="quantity"
                type="number"
                step="0.001"
                min="1"
                required
                defaultValue={selectedMD ? String(selectedMD.quantity) : undefined}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>N° BL</Label><Input name="blNumber" /></div>
              <div className="space-y-2"><Label>N° Camion</Label><Input name="truckNumber" /></div>
            </div>
            <div className="space-y-2"><Label>Dépôt</Label><Input name="depot" defaultValue="GESTOCI" /></div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => { setOpen(false); setLinkedMD(""); }}>Annuler</Button>
              <Button type="submit" disabled={loading} className="bg-[#0369A1] hover:bg-blue-700">
                {loading ? "..." : "Enregistrer"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
