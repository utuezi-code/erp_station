"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, ChevronLeft, ChevronRight } from "lucide-react";
import { saveEncaissement } from "./actions";
import { toast } from "sonner";

const TYPES: Record<string, string> = {
  ESPECES: "Espèces",
  MOBILE_MONEY: "Mobile Money",
  CARTE_BANCAIRE: "Carte bancaire",
  BON_CARBURANT: "Bons carburant",
  CREDIT_CLIENT: "Clients crédit",
};

function fmt(n: any) {
  return Number(n).toLocaleString("fr-CI");
}

export function EncaissementsClient({ stationId, selectedDate, collections }: any) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const total = collections.reduce((s: number, c: any) => s + Number(c.amount), 0);
  const byType = collections.reduce((acc: any, c: any) => {
    acc[c.type] = (acc[c.type] || 0) + Number(c.amount);
    return acc;
  }, {});

  function changeDate(delta: number) {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + delta);
    router.push(`?date=${d.toISOString().split("T")[0]}`);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    try {
      await saveEncaissement(fd);
      toast.success("Encaissement enregistré.");
      setOpen(false);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <div className="flex items-center gap-3 mb-6">
        <Button variant="outline" size="sm" onClick={() => changeDate(-1)}><ChevronLeft className="w-4 h-4" /></Button>
        <Input type="date" value={selectedDate} onChange={(e) => router.push(`?date=${e.target.value}`)} className="w-auto" />
        <Button variant="outline" size="sm" onClick={() => changeDate(1)}><ChevronRight className="w-4 h-4" /></Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
        {Object.entries(TYPES).map(([key, label]) => (
          <div key={key} className="bg-white rounded-xl border p-4">
            <p className="text-xs text-gray-500">{label}</p>
            <p className="text-xl font-bold">{fmt(byType[key] || 0)} <span className="text-sm font-normal text-gray-400">FCFA</span></p>
          </div>
        ))}
        <div className="bg-orange-50 rounded-xl border border-orange-200 p-4 lg:col-span-3">
          <p className="text-xs text-orange-700">Total caisse</p>
          <p className="text-2xl font-bold text-orange-800">{fmt(total)} FCFA</p>
        </div>
      </div>

      <div className="flex justify-end mb-4">
        <Button onClick={() => setOpen(true)} className="bg-orange-400 hover:bg-orange-500">
          <Plus className="w-4 h-4 mr-2" /> Ajouter un encaissement
        </Button>
      </div>

      <div className="bg-white rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Type</TableHead>
              <TableHead className="text-right">Montant</TableHead>
              <TableHead>Référence</TableHead>
              <TableHead>Note</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {collections.map((c: any) => (
              <TableRow key={c.id}>
                <TableCell><Badge variant="outline">{TYPES[c.type]}</Badge></TableCell>
                <TableCell className="text-right font-medium">{fmt(c.amount)} FCFA</TableCell>
                <TableCell>{c.reference || "—"}</TableCell>
                <TableCell>{c.note || "—"}</TableCell>
              </TableRow>
            ))}
            {collections.length === 0 && (
              <TableRow><TableCell colSpan={4} className="text-center text-gray-500 py-6">Aucun encaissement pour cette date.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Ajouter un encaissement</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <input type="hidden" name="stationId" value={stationId} />
            <input type="hidden" name="date" value={selectedDate} />
            <div className="space-y-2">
              <Label>Type</Label>
              <Select name="type" required>
                <SelectTrigger><SelectValue placeholder="Choisir..." /></SelectTrigger>
                <SelectContent>
                  {Object.entries(TYPES).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Montant (FCFA)</Label>
              <Input name="amount" type="number" step="1" min="0" required />
            </div>
            <div className="space-y-2">
              <Label>Référence</Label>
              <Input name="reference" placeholder="N° reçu, transaction..." />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
              <Button type="submit" disabled={loading} className="bg-orange-400 hover:bg-orange-500">
                {loading ? "..." : "Ajouter"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
