"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, CheckCircle, XCircle } from "lucide-react";
import { createVersement, validateVersement } from "./actions";
import { toast } from "sonner";

const STATUS_LABELS: Record<string, string> = {
  EN_ATTENTE: "En attente",
  VALIDE: "Validé",
  REJETE: "Rejeté",
};

const STATUS_COLORS: Record<string, string> = {
  EN_ATTENTE: "bg-yellow-100 text-yellow-700",
  VALIDE: "bg-green-100 text-green-700",
  REJETE: "bg-red-100 text-red-700",
};

function fmt(n: any) {
  return Number(n).toLocaleString("fr-CI", { minimumFractionDigits: 0 });
}

export function VersementsClientPage({ stationId, versements, bankAccounts, userRole }: any) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const canValidate = ["ADMIN", "DIRECTION_FINANCIERE"].includes(userRole);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    try {
      await createVersement(fd);
      toast.success("Versement déclaré.");
      setOpen(false);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleValidate(id: string, approved: boolean) {
    try {
      await validateVersement(id, approved);
      toast.success(approved ? "Versement validé." : "Versement rejeté.");
    } catch (err: any) {
      toast.error(err.message);
    }
  }

  const totalPending = versements.filter((v: any) => v.status === "EN_ATTENTE").reduce((s: number, v: any) => s + Number(v.amount), 0);
  const totalValidated = versements.filter((v: any) => v.status === "VALIDE").reduce((s: number, v: any) => s + Number(v.amount), 0);

  return (
    <>
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-yellow-50 rounded-xl p-4 border border-yellow-200">
          <p className="text-sm text-yellow-700">En attente de validation</p>
          <p className="text-2xl font-bold text-yellow-800">{fmt(totalPending)} FCFA</p>
        </div>
        <div className="bg-green-50 rounded-xl p-4 border border-green-200">
          <p className="text-sm text-green-700">Total validé (historique)</p>
          <p className="text-2xl font-bold text-green-800">{fmt(totalValidated)} FCFA</p>
        </div>
      </div>

      <div className="flex justify-end mb-4">
        <Button onClick={() => setOpen(true)} className="bg-orange-400 hover:bg-orange-500">
          <Plus className="w-4 h-4 mr-2" /> Déclarer un versement
        </Button>
      </div>

      <div className="bg-white rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Montant</TableHead>
              <TableHead>N° bordereau</TableHead>
              <TableHead>Déclaré par</TableHead>
              <TableHead>Statut</TableHead>
              {canValidate && <TableHead className="text-right">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {versements.map((v: any) => (
              <TableRow key={v.id}>
                <TableCell>{new Date(v.date).toLocaleDateString("fr-CI")}</TableCell>
                <TableCell className="font-medium">{fmt(v.amount)} FCFA</TableCell>
                <TableCell>{v.slipNumber || "—"}</TableCell>
                <TableCell>{v.user?.name || "—"}</TableCell>
                <TableCell>
                  <Badge className={STATUS_COLORS[v.status]}>{STATUS_LABELS[v.status]}</Badge>
                </TableCell>
                {canValidate && (
                  <TableCell className="text-right">
                    {v.status === "EN_ATTENTE" && (
                      <div className="flex gap-1 justify-end">
                        <Button size="sm" variant="ghost" onClick={() => handleValidate(v.id, true)}>
                          <CheckCircle className="w-4 h-4 text-green-600" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => handleValidate(v.id, false)}>
                          <XCircle className="w-4 h-4 text-red-500" />
                        </Button>
                      </div>
                    )}
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Déclarer un versement</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <input type="hidden" name="stationId" value={stationId} />
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Date du versement</Label>
                <Input name="date" type="date" defaultValue={new Date().toISOString().split("T")[0]} required />
              </div>
              <div className="space-y-2">
                <Label>Montant (FCFA)</Label>
                <Input name="amount" type="number" step="1" min="1" required />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Compte bancaire</Label>
              <Select name="bankAccountId">
                <SelectTrigger><SelectValue placeholder="Choisir..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Aucun compte spécifié</SelectItem>
                  {bankAccounts.map((b: any) => (
                    <SelectItem key={b.id} value={b.id}>{b.bankName} — {b.accountNumber}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>N° de bordereau</Label>
              <Input name="slipNumber" placeholder="BV-2025-001" />
            </div>
            <div className="space-y-2">
              <Label>Note</Label>
              <Textarea name="note" rows={2} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
              <Button type="submit" disabled={loading} className="bg-orange-400 hover:bg-orange-500">
                {loading ? "Enregistrement..." : "Déclarer"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
