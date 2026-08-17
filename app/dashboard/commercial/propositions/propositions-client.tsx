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
import { createProposal, validateProposal } from "./actions";
import { useRouter } from "next/navigation";
import Link from "next/link";

function fmt(n: any) { return Number(n || 0).toLocaleString("fr-CI", { maximumFractionDigits: 0 }); }

const STATUS: Record<string, { label: string; color: string }> = {
  EN_ATTENTE: { label: "En attente DG", color: "bg-blue-100 text-blue-700" },
  VALIDE: { label: "Validée — BC à créer", color: "bg-green-100 text-green-700" },
  REJETE: { label: "Rejetée", color: "bg-red-100 text-red-700" },
};

interface Proposal {
  id: string;
  number: string;
  status: string;
  quantityM15: number;
  estimatedUnitPrice: number;
  totalAmount: number;
  justification: string | null;
  rejectionReason: string | null;
  createdAt: string;
  fuel: { name: string; code: string };
  user: { name: string };
  budgetAllocation: { allocatedAmount: number };
  sirOrders?: { id: string; number: string }[];
}

interface Allocation {
  id: string;
  allocatedAmount: number;
  budgetRequest: { fuel: { name: string; code: string } | null };
}

export function PropositionsClient({
  proposals,
  allocations,
  fuels,
  role,
}: {
  proposals: Proposal[];
  allocations: Allocation[];
  fuels: { id: string; name: string; code: string }[];
  role: string;
}) {
  const router = useRouter();
  const isDC = role === "DIRECTION_COMMERCIALE";
  const isDG = role === "DIRECTION_GENERALE";
  const isAdmin = role === "ADMIN";

  const [showNew, setShowNew] = useState(false);
  const [selected, setSelected] = useState<Proposal | null>(null);
  const [loading, setLoading] = useState(false);

  const [allocId, setAllocId] = useState("");
  const [fuelId, setFuelId] = useState("");
  const [qty, setQty] = useState("");
  const [unitPrice, setUnitPrice] = useState("");
  const [justification, setJustification] = useState("");
  const [dgNote, setDgNote] = useState("");

  const total = Number(qty || 0) * Number(unitPrice || 0);

  async function submitNew() {
    if (!allocId || !fuelId || !qty || !unitPrice) { toast.error("Tous les champs obligatoires."); return; }
    setLoading(true);
    const r = await createProposal({ budgetAllocationId: allocId, fuelId, quantityM15: Number(qty), estimatedUnitPrice: Number(unitPrice), justification: justification || undefined });
    setLoading(false);
    if (r.success) {
      toast.success("Proposition envoyée au Directeur Général.");
      setShowNew(false);
      setAllocId(""); setFuelId(""); setQty(""); setUnitPrice(""); setJustification("");
      router.refresh();
    } else {
      toast.error("Erreur.");
    }
  }

  async function respond(approved: boolean) {
    if (!selected) return;
    setLoading(true);
    const r = await validateProposal(selected.id, approved, dgNote || undefined);
    setLoading(false);
    if (r.success) {
      toast.success(approved ? "Proposition approuvée. La DC peut créer le bon de commande SIR." : "Proposition rejetée.");
      setSelected(null); setDgNote("");
      router.refresh();
    } else {
      toast.error(r.error || "Erreur.");
    }
  }

  return (
    <>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Propositions d'achat SIR</h1>
          <p className="text-gray-500 mt-1">{proposals.length} proposition(s)</p>
        </div>
        {(isDC || isAdmin) && allocations.length > 0 && (
          <Button className="bg-[#0369A1] hover:bg-blue-700" onClick={() => setShowNew(true)}>
            <Plus className="w-4 h-4 mr-2" /> Nouvelle proposition
          </Button>
        )}
      </div>

      {(isDC || isAdmin) && allocations.length === 0 && (
        <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800">
          Aucun budget accordé disponible. <Link href="/dashboard/commercial/budget" className="font-semibold underline">Faire une demande de budget</Link> d'abord.
        </div>
      )}

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Numéro</TableHead>
                <TableHead>Produit</TableHead>
                <TableHead className="text-right">Qté (M15)</TableHead>
                <TableHead className="text-right">P.U.</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead>Budget alloué</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Date</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {proposals.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-mono text-sm">{p.number}</TableCell>
                  <TableCell>{p.fuel.name} ({p.fuel.code})</TableCell>
                  <TableCell className="text-right">{fmt(p.quantityM15)}</TableCell>
                  <TableCell className="text-right">{fmt(p.estimatedUnitPrice)}</TableCell>
                  <TableCell className="text-right font-medium">{fmt(p.totalAmount)} FCFA</TableCell>
                  <TableCell className="text-sm text-gray-500">{fmt(p.budgetAllocation.allocatedAmount)} FCFA</TableCell>
                  <TableCell><Badge className={STATUS[p.status]?.color ?? "bg-gray-100 text-gray-600"}>{STATUS[p.status]?.label ?? p.status}</Badge></TableCell>
                  <TableCell className="text-sm text-gray-400">{new Date(p.createdAt).toLocaleDateString("fr-CI")}</TableCell>
                  <TableCell>
                    {(isDG || isAdmin) && p.status === "EN_ATTENTE" ? (
                      <Button size="sm" className="bg-purple-600 hover:bg-purple-700 text-white" onClick={() => { setSelected(p); setDgNote(""); }}>
                        Valider
                      </Button>
                    ) : p.status === "VALIDE" ? (
                      <Link href={`/dashboard/commercial/sir-orders/new?proposalId=${p.id}`}>
                        <Button size="sm" className="bg-orange-500 hover:bg-orange-600 text-white" style={{ display: isDC || isAdmin ? undefined : "none" }}>
                          Créer BC
                        </Button>
                      </Link>
                    ) : (
                      <Button variant="ghost" size="sm" onClick={() => setSelected(p)}>Voir</Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {proposals.length === 0 && (
                <TableRow><TableCell colSpan={9} className="text-center text-gray-500 py-8">Aucune proposition d'achat.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Modal nouvelle proposition */}
      <Dialog open={showNew} onOpenChange={(v) => { if (!v) setShowNew(false); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Nouvelle proposition d'achat SIR</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1">
              <Label>Budget alloué *</Label>
              <Select value={allocId} onValueChange={(v) => setAllocId(v ?? "")}>
                <SelectTrigger><SelectValue placeholder="Sélectionner un budget accordé" /></SelectTrigger>
                <SelectContent>
                  {allocations.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.budgetRequest.fuel?.name ?? "—"} — {fmt(a.allocatedAmount)} FCFA
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Produit *</Label>
              <Select value={fuelId} onValueChange={(v) => setFuelId(v ?? "")}>
                <SelectTrigger><SelectValue placeholder="Carburant" /></SelectTrigger>
                <SelectContent>
                  {fuels.map((f) => <SelectItem key={f.id} value={f.id}>{f.name} ({f.code})</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Quantité M15 *</Label>
                <Input type="number" value={qty} onChange={(e) => setQty(e.target.value)} placeholder="ex: 100000" />
              </div>
              <div className="space-y-1">
                <Label>Prix unitaire (FCFA/L) *</Label>
                <Input type="number" value={unitPrice} onChange={(e) => setUnitPrice(e.target.value)} placeholder="ex: 730.717" />
              </div>
            </div>
            {total > 0 && (
              <div className="bg-gray-50 rounded-lg px-3 py-2 text-sm">
                <span className="text-gray-500">Total estimé : </span>
                <span className="font-bold">{fmt(total)} FCFA</span>
              </div>
            )}
            <div className="space-y-1">
              <Label>Justification</Label>
              <Textarea rows={2} value={justification} onChange={(e) => setJustification(e.target.value)} placeholder="Motif, contexte..." />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowNew(false)}>Annuler</Button>
            <Button className="bg-[#0369A1] hover:bg-blue-700" disabled={loading} onClick={submitNew}>
              Soumettre au DG
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal détail / validation DG */}
      <Dialog open={!!selected} onOpenChange={(v) => { if (!v) { setSelected(null); setDgNote(""); } }}>
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
                    <p className="text-xs text-gray-400 mb-0.5">Produit</p>
                    <p className="font-medium">{selected.fuel.name} ({selected.fuel.code})</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg px-3 py-2">
                    <p className="text-xs text-gray-400 mb-0.5">Demandeur</p>
                    <p className="font-medium">{selected.user.name}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg px-3 py-2">
                    <p className="text-xs text-gray-400 mb-0.5">Quantité M15</p>
                    <p className="font-medium">{fmt(selected.quantityM15)} L</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg px-3 py-2">
                    <p className="text-xs text-gray-400 mb-0.5">Prix unitaire</p>
                    <p className="font-medium">{fmt(selected.estimatedUnitPrice)} FCFA/L</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg px-3 py-2 col-span-2">
                    <p className="text-xs text-gray-400 mb-0.5">Montant total</p>
                    <p className="font-bold text-lg">{fmt(selected.totalAmount)} FCFA</p>
                  </div>
                </div>
                {selected.justification && (
                  <div className="bg-blue-50 border border-blue-100 rounded-lg px-3 py-2 text-sm text-blue-800">
                    <p className="text-xs font-semibold text-blue-500 mb-1">Justification</p>
                    {selected.justification}
                  </div>
                )}
                {selected.status === "REJETE" && selected.rejectionReason && (
                  <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-sm text-red-700">
                    <p className="text-xs font-semibold text-red-500 mb-1">Motif de rejet</p>
                    {selected.rejectionReason}
                  </div>
                )}
                {(isDG || isAdmin) && selected.status === "EN_ATTENTE" && (
                  <div className="border-t pt-4 space-y-1">
                    <Label>Commentaire (optionnel)</Label>
                    <Textarea rows={2} value={dgNote} onChange={(e) => setDgNote(e.target.value)} placeholder="Observations..." />
                  </div>
                )}
              </div>
              <DialogFooter className="gap-2 flex-wrap">
                <Button variant="outline" onClick={() => { setSelected(null); setDgNote(""); }}>Fermer</Button>
                {(isDG || isAdmin) && selected.status === "EN_ATTENTE" && (
                  <>
                    <Button variant="outline" className="border-red-300 text-red-600 hover:bg-red-50" disabled={loading} onClick={() => respond(false)}>
                      <XCircle className="w-4 h-4 mr-2" /> Rejeter
                    </Button>
                    <Button className="bg-green-600 hover:bg-green-700" disabled={loading} onClick={() => respond(true)}>
                      <CheckCircle className="w-4 h-4 mr-2" /> Approuver
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
