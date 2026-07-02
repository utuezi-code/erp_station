"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus } from "lucide-react";
import { saveLivraison } from "./actions";
import { toast } from "sonner";

function fmt(n: any) { return Number(n || 0).toLocaleString("fr-CI", { maximumFractionDigits: 1 }); }

export function LivraisonsClient({ stationId, deliveries, fuels }: any) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    try {
      await saveLivraison(fd);
      toast.success("Livraison enregistrée.");
      setOpen(false);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <div className="flex justify-end mb-4">
        <Button onClick={() => setOpen(true)} className="bg-orange-400 hover:bg-orange-500">
          <Plus className="w-4 h-4 mr-2" /> Nouvelle livraison
        </Button>
      </div>
      <div className="bg-white rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Carburant</TableHead>
              <TableHead className="text-right">Quantité (L)</TableHead>
              <TableHead>N° BL</TableHead>
              <TableHead>Camion</TableHead>
              <TableHead>Dépôt</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {deliveries.map((d: any) => (
              <TableRow key={d.id}>
                <TableCell>{new Date(d.date).toLocaleDateString("fr-CI")}</TableCell>
                <TableCell>{d.fuel.name}</TableCell>
                <TableCell className="text-right font-medium">{fmt(d.quantity)}</TableCell>
                <TableCell>{d.blNumber || "—"}</TableCell>
                <TableCell>{d.truckNumber || "—"}</TableCell>
                <TableCell>{d.depot || "—"}</TableCell>
              </TableRow>
            ))}
            {deliveries.length === 0 && (
              <TableRow><TableCell colSpan={6} className="text-center text-gray-500 py-6">Aucune livraison enregistrée.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Enregistrer une livraison</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <input type="hidden" name="stationId" value={stationId} />
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Date</Label>
                <Input name="date" type="date" defaultValue={new Date().toISOString().split("T")[0]} required />
              </div>
              <div className="space-y-2">
                <Label>Carburant</Label>
                <Select name="fuelId" required>
                  <SelectTrigger><SelectValue placeholder="Choisir..." /></SelectTrigger>
                  <SelectContent>{fuels.map((f: any) => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Quantité livrée (L)</Label>
              <Input name="quantity" type="number" step="0.001" min="1" required />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>N° BL</Label><Input name="blNumber" /></div>
              <div className="space-y-2"><Label>N° Camion</Label><Input name="truckNumber" /></div>
            </div>
            <div className="space-y-2"><Label>Dépôt</Label><Input name="depot" /></div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
              <Button type="submit" disabled={loading} className="bg-orange-400 hover:bg-orange-500">
                {loading ? "..." : "Enregistrer"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
