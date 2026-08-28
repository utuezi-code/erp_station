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
import { Plus, Trash2, CheckCircle, XCircle } from "lucide-react";
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

interface ProposalItem {
  id: string;
  quantityM15: number;
  estimatedUnitPrice: number;
  totalAmount: number;
  fuel: { name: string; code: string };
}

interface Proposal {
  id: string;
  number: string;
  status: string;
  totalAmount: number;
  justification: string | null;
  rejectionReason: string | null;
  createdAt: string;
  user: { name: string };
  items: ProposalItem[];
  budgetAllocation: { allocatedAmount: number };
  sirOrders?: { id: string; number: string }[];
}

interface Allocation {
  id: string;
  allocatedAmount: number;
  budgetRequest: { items: { fuel: { name: string; code: string } }[] };
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

  // New proposal form
  const [allocId, setAllocId] = useState("");
  const [justification, setJustification] = useState("");
  const [lines, setLines] = useState<{ fuelId: string; qty: string; unitPrice: string }[]>([
    { fuelId: "", qty: "", unitPrice: "" },
  ]);

  // DG validation
  const [dgNote, setDgNote] = useState("");

  const selectedAlloc = allocations.find((a) => a.id === allocId);
  const totalPropose = lines.reduce((s, l) => s + Number(l.qty || 0) * Number(l.unitPrice || 0), 0);

  function addLine() { setLines([...lines, { fuelId: "", qty: "", unitPrice: "" }]); }
  function removeLine(idx: number) { setLines(lines.filter((_, i) => i !== idx)); }

  function resetNew() {
    setShowNew(false);
    setAllocId(""); setJustification("");
    setLines([{ fuelId: "", qty: "", unitPrice: "" }]);
  }

  async function submitNew() {
    const valid = lines.filter((l) => l.fuelId && Number(l.qty) > 0 && Number(l.unitPrice) > 0);
    if (!allocId) { toast.error("Sélectionner un budget disponible."); return; }
    if (valid.length === 0) { toast.error("Au moins un produit avec quantité et prix requis."); return; }
    setLoading(true);
    const r = await createProposal({
      budgetAllocationId: allocId,
      justification: justification || undefined,
      items: valid.map((l) => ({ fuelId: l.fuelId, quantityM15: Number(l.qty), estimatedUnitPrice: Number(l.unitPrice) })),
    });
    setLoading(false);
    if (r.success) {
      toast.success("Proposition soumise au Directeur Général.");
      resetNew();
      router.refresh();
    } else {
      toast.error(r.error || "Erreur.");
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
          Aucun budget disponible communiqué par la DF. <Link href="/dashboard/commercial/budget" className="font-semibold underline">Faire une demande de budget</Link> d'abord.
        </div>
      )}

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Numéro</TableHead>
                <TableHead>Produits</TableHead>
                <TableHead className="text-right">Total proposé</TableHead>
                <TableHead className="text-right">Budget DF</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Date</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {proposals.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-mono text-sm">{p.number}</TableCell>
                  <TableCell className="text-sm text-gray-600">
                    {p.items.map((i) => `${i.fuel.code} (${fmt(i.quantityM15)} L)`).join(" · ")}
                  </TableCell>
                  <TableCell className="text-right font-medium">{fmt(p.totalAmount)} FCFA</TableCell>
                  <TableCell className="text-right text-sm text-gray-500">{fmt(p.budgetAllocation.allocatedAmount)} FCFA</TableCell>
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
                <TableRow><TableCell colSpan={7} className="text-center text-gray-500 py-8">Aucune proposition d'achat.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Modal nouvelle proposition (DC) */}
      <Dialog open={showNew} onOpenChange={(v) => { if (!v) resetNew(); }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Nouvelle proposition d'achat SIR</DialogTitle></DialogHeader>
          <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">

            {/* Sélection budget DF */}
            <div className="space-y-1">
              <Label>Budget disponible (DF) *</Label>
              <select
                value={allocId}
                onChange={(e) => setAllocId(e.target.value)}
                className="w-full h-9 rounded-md border border-gray-200 bg-white px-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Sélectionner un budget disponible</option>
                {allocations.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.budgetRequest.items.map((i) => i.fuel.code).join(", ")} — {fmt(a.allocatedAmount)} FCFA disponibles
                  </option>
                ))}
              </select>
              {selectedAlloc && (
                <p className="text-xs text-green-700 font-medium mt-1">
                  Budget disponible : {fmt(selectedAlloc.allocatedAmount)} FCFA
                </p>
              )}
            </div>

            {/* Répartition par produit */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-semibold text-gray-700">Répartition par produit</Label>
                <Button variant="outline" size="sm" onClick={addLine}>
                  <Plus className="w-3 h-3 mr-1" /> Ajouter un produit
                </Button>
              </div>

              {lines.map((l, idx) => (
                <div key={idx} className="rounded-xl border border-gray-200 bg-gray-50 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-gray-500">Produit {idx + 1}</span>
                    {lines.length > 1 && (
                      <button onClick={() => removeLine(idx)} className="text-red-400 hover:text-red-600 transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-gray-600">Carburant *</Label>
                    <select
                      value={l.fuelId}
                      onChange={(e) => { const n = [...lines]; n[idx] = { ...n[idx], fuelId: e.target.value }; setLines(n); }}
                      className="w-full h-9 rounded-md border border-gray-200 bg-white px-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Sélectionner un carburant</option>
                      {fuels.map((f) => <option key={f.id} value={f.id}>{f.name} ({f.code})</option>)}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs text-gray-600">Quantité M15 (litres) *</Label>
                      <Input type="number" placeholder="ex : 100 000" value={l.qty}
                        onChange={(e) => { const n = [...lines]; n[idx] = { ...n[idx], qty: e.target.value }; setLines(n); }} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-gray-600">Prix unitaire (FCFA/L) *</Label>
                      <Input type="number" placeholder="ex : 730.72" value={l.unitPrice}
                        onChange={(e) => { const n = [...lines]; n[idx] = { ...n[idx], unitPrice: e.target.value }; setLines(n); }} />
                    </div>
                  </div>
                  {Number(l.qty) > 0 && Number(l.unitPrice) > 0 && (
                    <p className="text-xs text-gray-500 text-right">
                      Sous-total : <span className="font-semibold text-gray-800">{fmt(Number(l.qty) * Number(l.unitPrice))} FCFA</span>
                    </p>
                  )}
                </div>
              ))}

              {totalPropose > 0 && (
                <div className={`flex justify-end`}>
                  <div className={`rounded-lg px-4 py-2 text-sm border ${selectedAlloc && totalPropose > Number(selectedAlloc.allocatedAmount) ? "bg-red-50 border-red-200" : "bg-white border-gray-200"}`}>
                    <span className="text-gray-500">Total proposé : </span>
                    <span className={`font-bold ${selectedAlloc && totalPropose > Number(selectedAlloc.allocatedAmount) ? "text-red-600" : "text-gray-900"}`}>
                      {fmt(totalPropose)} FCFA
                    </span>
                    {selectedAlloc && totalPropose > Number(selectedAlloc.allocatedAmount) && (
                      <span className="ml-2 text-xs text-red-500">⚠ dépasse le budget disponible</span>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-1">
              <Label>Justification / observations</Label>
              <Textarea rows={2} value={justification} onChange={(e) => setJustification(e.target.value)} placeholder="Contexte, urgence, conditions de marché..." />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={resetNew}>Annuler</Button>
            <Button className="bg-[#0369A1] hover:bg-blue-700" disabled={loading} onClick={submitNew}>
              Soumettre au Directeur Général
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
                    <p className="text-xs text-gray-400 mb-0.5">Demandeur</p>
                    <p className="font-medium">{selected.user.name}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg px-3 py-2">
                    <p className="text-xs text-gray-400 mb-0.5">Budget DF disponible</p>
                    <p className="font-medium">{fmt(selected.budgetAllocation.allocatedAmount)} FCFA</p>
                  </div>
                </div>

                {/* Tableau répartition produits */}
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Produit</TableHead>
                        <TableHead className="text-right">Qté M15 (L)</TableHead>
                        <TableHead className="text-right">P.U. (FCFA)</TableHead>
                        <TableHead className="text-right">Montant</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selected.items.map((i) => (
                        <TableRow key={i.id}>
                          <TableCell className="font-medium">{i.fuel.name} <span className="text-gray-400 text-xs">({i.fuel.code})</span></TableCell>
                          <TableCell className="text-right tabular-nums">{fmt(i.quantityM15)}</TableCell>
                          <TableCell className="text-right tabular-nums">{fmt(i.estimatedUnitPrice)}</TableCell>
                          <TableCell className="text-right tabular-nums">{fmt(i.totalAmount)} FCFA</TableCell>
                        </TableRow>
                      ))}
                      <TableRow className="bg-gray-50">
                        <TableCell colSpan={3} className="text-right font-bold text-sm">Total</TableCell>
                        <TableCell className="text-right font-bold tabular-nums">{fmt(selected.totalAmount)} FCFA</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
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
                    <Textarea rows={2} value={dgNote} onChange={(e) => setDgNote(e.target.value)} placeholder="Observations du Directeur Général..." />
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
