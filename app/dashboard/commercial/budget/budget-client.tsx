"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, CheckCircle, XCircle } from "lucide-react";
import { toast } from "sonner";
import { createBudgetRequest, respondBudgetRequest } from "./actions";
import { useRouter } from "next/navigation";

function fmt(n: any) { return Number(n || 0).toLocaleString("fr-CI", { maximumFractionDigits: 0 }); }

const STATUS: Record<string, { label: string; color: string }> = {
  EN_ATTENTE: { label: "En attente DF", color: "bg-blue-100 text-blue-700" },
  ACCORDE: { label: "Budget accordé", color: "bg-green-100 text-green-700" },
  REJETE: { label: "Rejeté", color: "bg-red-100 text-red-700" },
};

interface BudgetRequest {
  id: string;
  number: string;
  status: string;
  estimatedQty: number;
  estimatedAmount: number;
  justification: string | null;
  rejectionReason: string | null;
  createdAt: string;
  fuel: { name: string; code: string } | null;
  user: { name: string };
  allocation: { allocatedAmount: number; note: string | null; user: { name: string } } | null;
}

export function BudgetClient({
  requests,
  fuels,
  role,
}: {
  requests: BudgetRequest[];
  fuels: { id: string; name: string; code: string }[];
  role: string;
}) {
  const router = useRouter();
  const isDC = role === "DIRECTION_COMMERCIALE";
  const isDF = role === "DIRECTION_FINANCIERE";
  const isAdmin = role === "ADMIN";

  const [showNew, setShowNew] = useState(false);
  const [selected, setSelected] = useState<BudgetRequest | null>(null);
  const [loading, setLoading] = useState(false);

  // New request form
  const [fuelId, setFuelId] = useState("");
  const [qty, setQty] = useState("");
  const [amount, setAmount] = useState("");
  const [justification, setJustification] = useState("");

  // DF response
  const [allocAmount, setAllocAmount] = useState("");
  const [dfNote, setDfNote] = useState("");

  async function submitNew() {
    if (!qty || !amount) { toast.error("Quantité et montant requis."); return; }
    setLoading(true);
    const r = await createBudgetRequest({
      fuelId: fuelId || undefined,
      estimatedQty: Number(qty),
      estimatedAmount: Number(amount),
      justification: justification || undefined,
    });
    setLoading(false);
    if (r.success) {
      toast.success("Demande de budget envoyée à la Direction Financière.");
      setShowNew(false);
      setFuelId(""); setQty(""); setAmount(""); setJustification("");
      router.refresh();
    } else {
      toast.error("Erreur lors de l'envoi.");
    }
  }

  async function respond(approved: boolean) {
    if (!selected) return;
    if (approved && (!allocAmount || Number(allocAmount) <= 0)) {
      toast.error("Entrez le montant accordé."); return;
    }
    setLoading(true);
    const r = await respondBudgetRequest(selected.id, approved, approved ? Number(allocAmount) : undefined, dfNote || undefined);
    setLoading(false);
    if (r.success) {
      toast.success(approved ? "Budget accordé." : "Demande rejetée.");
      setSelected(null); setAllocAmount(""); setDfNote("");
      router.refresh();
    } else {
      toast.error(r.error || "Erreur.");
    }
  }

  return (
    <>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Demandes de budget</h1>
          <p className="text-gray-500 mt-1">{requests.length} demande(s)</p>
        </div>
        {(isDC || isAdmin) && (
          <Button className="bg-[#0369A1] hover:bg-blue-700" onClick={() => setShowNew(true)}>
            <Plus className="w-4 h-4 mr-2" /> Nouvelle demande
          </Button>
        )}
      </div>

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Numéro</TableHead>
                <TableHead>Produit</TableHead>
                <TableHead className="text-right">Qté estimée (M15)</TableHead>
                <TableHead className="text-right">Montant demandé</TableHead>
                <TableHead className="text-right">Montant accordé</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Date</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {requests.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-mono text-sm">{r.number}</TableCell>
                  <TableCell>{r.fuel ? `${r.fuel.name} (${r.fuel.code})` : "—"}</TableCell>
                  <TableCell className="text-right">{fmt(r.estimatedQty)}</TableCell>
                  <TableCell className="text-right">{fmt(r.estimatedAmount)} FCFA</TableCell>
                  <TableCell className="text-right">
                    {r.allocation ? <span className="font-semibold text-green-700">{fmt(r.allocation.allocatedAmount)} FCFA</span> : "—"}
                  </TableCell>
                  <TableCell>
                    <Badge className={STATUS[r.status]?.color ?? "bg-gray-100 text-gray-600"}>
                      {STATUS[r.status]?.label ?? r.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-gray-400">{new Date(r.createdAt).toLocaleDateString("fr-CI")}</TableCell>
                  <TableCell>
                    {(isDF || isAdmin) && r.status === "EN_ATTENTE" ? (
                      <Button size="sm" className="bg-orange-500 hover:bg-orange-600 text-white" onClick={() => { setSelected(r); setAllocAmount(String(r.estimatedAmount)); setDfNote(""); }}>
                        Répondre
                      </Button>
                    ) : (
                      <Button variant="ghost" size="sm" onClick={() => setSelected(r)}>Voir</Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {requests.length === 0 && (
                <TableRow><TableCell colSpan={8} className="text-center text-gray-500 py-8">Aucune demande de budget.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Modal nouvelle demande (DC) */}
      <Dialog open={showNew} onOpenChange={(v) => { if (!v) setShowNew(false); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Nouvelle demande de budget</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1">
              <Label>Produit</Label>
              <Select value={fuelId} onValueChange={(v) => setFuelId(v ?? "")}>
                <SelectTrigger><SelectValue placeholder="Sélectionner un carburant" /></SelectTrigger>
                <SelectContent>
                  {fuels.map((f) => <SelectItem key={f.id} value={f.id}>{f.name} ({f.code})</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Quantité estimée (M15) *</Label>
                <Input type="number" value={qty} onChange={(e) => setQty(e.target.value)} placeholder="ex: 100000" />
              </div>
              <div className="space-y-1">
                <Label>Montant estimé (FCFA) *</Label>
                <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="ex: 73000000" />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Justification</Label>
              <Textarea rows={3} value={justification} onChange={(e) => setJustification(e.target.value)} placeholder="Motif de la demande..." />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowNew(false)}>Annuler</Button>
            <Button className="bg-[#0369A1] hover:bg-blue-700" disabled={loading} onClick={submitNew}>
              Envoyer à la DF
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal détail / réponse DF */}
      <Dialog open={!!selected} onOpenChange={(v) => { if (!v) { setSelected(null); setAllocAmount(""); setDfNote(""); } }}>
        <DialogContent className="max-w-lg">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-3">
                  <span className="font-mono">{selected.number}</span>
                  <Badge className={STATUS[selected.status]?.color ?? ""}>{STATUS[selected.status]?.label}</Badge>
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="bg-gray-50 rounded-lg px-3 py-2">
                    <p className="text-xs text-gray-400 mb-0.5">Demandeur</p>
                    <p className="font-medium">{selected.user.name}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg px-3 py-2">
                    <p className="text-xs text-gray-400 mb-0.5">Produit</p>
                    <p className="font-medium">{selected.fuel ? selected.fuel.name : "—"}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg px-3 py-2">
                    <p className="text-xs text-gray-400 mb-0.5">Quantité estimée</p>
                    <p className="font-medium">{fmt(selected.estimatedQty)} M15</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg px-3 py-2">
                    <p className="text-xs text-gray-400 mb-0.5">Montant demandé</p>
                    <p className="font-medium">{fmt(selected.estimatedAmount)} FCFA</p>
                  </div>
                </div>
                {selected.justification && (
                  <div className="bg-blue-50 border border-blue-100 rounded-lg px-3 py-2 text-sm text-blue-800">
                    <p className="text-xs font-semibold text-blue-500 mb-1">Justification</p>
                    {selected.justification}
                  </div>
                )}
                {selected.allocation && (
                  <div className="bg-green-50 border border-green-200 rounded-lg px-3 py-2 text-sm">
                    <p className="text-xs font-semibold text-green-600 mb-1">Budget accordé par {selected.allocation.user.name}</p>
                    <p className="font-bold text-green-700 text-base">{fmt(selected.allocation.allocatedAmount)} FCFA</p>
                    {selected.allocation.note && <p className="text-green-700 mt-1">{selected.allocation.note}</p>}
                  </div>
                )}
                {selected.status === "REJETE" && selected.rejectionReason && (
                  <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-sm text-red-700">
                    <p className="text-xs font-semibold text-red-500 mb-1">Motif de rejet</p>
                    {selected.rejectionReason}
                  </div>
                )}

                {/* DF response form */}
                {(isDF || isAdmin) && selected.status === "EN_ATTENTE" && (
                  <div className="border-t pt-4 space-y-3">
                    <div className="space-y-1">
                      <Label>Montant accordé (FCFA)</Label>
                      <Input type="number" value={allocAmount} onChange={(e) => setAllocAmount(e.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <Label>Note (optionnel)</Label>
                      <Textarea rows={2} value={dfNote} onChange={(e) => setDfNote(e.target.value)} placeholder="Conditions, remarques..." />
                    </div>
                  </div>
                )}
              </div>
              <DialogFooter className="gap-2 flex-wrap">
                <Button variant="outline" onClick={() => { setSelected(null); setAllocAmount(""); setDfNote(""); }}>Fermer</Button>
                {(isDF || isAdmin) && selected.status === "EN_ATTENTE" && (
                  <>
                    <Button variant="outline" className="border-red-300 text-red-600 hover:bg-red-50" disabled={loading} onClick={() => respond(false)}>
                      <XCircle className="w-4 h-4 mr-2" /> Rejeter
                    </Button>
                    <Button className="bg-green-600 hover:bg-green-700" disabled={loading} onClick={() => respond(true)}>
                      <CheckCircle className="w-4 h-4 mr-2" /> Accorder le budget
                    </Button>
                  </>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
