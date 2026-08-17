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
import { createBudgetRequest, respondBudgetRequest } from "./actions";
import { useRouter } from "next/navigation";

function fmt(n: any) { return Number(n || 0).toLocaleString("fr-CI", { maximumFractionDigits: 0 }); }

const STATUS: Record<string, { label: string; color: string }> = {
  EN_ATTENTE: { label: "En attente DF", color: "bg-blue-100 text-blue-700" },
  ACCORDE: { label: "Budget accordé", color: "bg-green-100 text-green-700" },
  REJETE: { label: "Rejeté", color: "bg-red-100 text-red-700" },
};

interface BudgetItem {
  id: string;
  estimatedQty: number;
  estimatedAmount: number;
  fuel: { name: string; code: string };
}

interface BudgetRequest {
  id: string;
  number: string;
  status: string;
  justification: string | null;
  rejectionReason: string | null;
  createdAt: string;
  user: { name: string };
  items: BudgetItem[];
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

  // New request form — multi-lignes produits
  const [justification, setJustification] = useState("");
  const [lines, setLines] = useState<{ fuelId: string; qty: string; amount: string }[]>([
    { fuelId: "", qty: "", amount: "" },
  ]);

  // DF response
  const [allocAmount, setAllocAmount] = useState("");
  const [dfNote, setDfNote] = useState("");

  function addLine() { setLines([...lines, { fuelId: "", qty: "", amount: "" }]); }
  function removeLine(idx: number) { setLines(lines.filter((_, i) => i !== idx)); }

  const totalDemande = lines.reduce((s, l) => s + Number(l.amount || 0), 0);

  function resetNew() {
    setShowNew(false);
    setJustification("");
    setLines([{ fuelId: "", qty: "", amount: "" }]);
  }

  async function submitNew() {
    const valid = lines.filter((l) => l.fuelId && Number(l.qty) > 0 && Number(l.amount) > 0);
    if (valid.length === 0) { toast.error("Au moins un produit avec quantité et montant requis."); return; }
    setLoading(true);
    const r = await createBudgetRequest({
      justification: justification || undefined,
      items: valid.map((l) => ({ fuelId: l.fuelId, estimatedQty: Number(l.qty), estimatedAmount: Number(l.amount) })),
    });
    setLoading(false);
    if (r.success) {
      toast.success("Demande de budget envoyée à la Direction Financière.");
      resetNew();
      router.refresh();
    } else {
      toast.error(r.error || "Erreur.");
    }
  }

  async function respond(approved: boolean) {
    if (!selected) return;
    if (approved && (!allocAmount || Number(allocAmount) <= 0)) { toast.error("Entrez le montant accordé."); return; }
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
                <TableHead>Produits demandés</TableHead>
                <TableHead className="text-right">Total estimé</TableHead>
                <TableHead className="text-right">Budget accordé</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Date</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {requests.map((r) => {
                const total = r.items.reduce((s, i) => s + Number(i.estimatedAmount), 0);
                return (
                  <TableRow key={r.id}>
                    <TableCell className="font-mono text-sm">{r.number}</TableCell>
                    <TableCell className="text-sm text-gray-600">
                      {r.items.map((i) => `${i.fuel.code} (${fmt(i.estimatedQty)} M15)`).join(" · ")}
                    </TableCell>
                    <TableCell className="text-right">{fmt(total)} FCFA</TableCell>
                    <TableCell className="text-right">
                      {r.allocation
                        ? <span className="font-semibold text-green-700">{fmt(r.allocation.allocatedAmount)} FCFA</span>
                        : "—"}
                    </TableCell>
                    <TableCell>
                      <Badge className={STATUS[r.status]?.color ?? "bg-gray-100 text-gray-600"}>
                        {STATUS[r.status]?.label ?? r.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-gray-400">{new Date(r.createdAt).toLocaleDateString("fr-CI")}</TableCell>
                    <TableCell>
                      {(isDF || isAdmin) && r.status === "EN_ATTENTE" ? (
                        <Button size="sm" className="bg-orange-500 hover:bg-orange-600 text-white"
                          onClick={() => { setSelected(r); setAllocAmount(String(r.items.reduce((s, i) => s + Number(i.estimatedAmount), 0))); setDfNote(""); }}>
                          Répondre
                        </Button>
                      ) : (
                        <Button variant="ghost" size="sm" onClick={() => setSelected(r)}>Voir</Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
              {requests.length === 0 && (
                <TableRow><TableCell colSpan={7} className="text-center text-gray-500 py-8">Aucune demande de budget.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Modal nouvelle demande (DC) */}
      <Dialog open={showNew} onOpenChange={(v) => { if (!v) resetNew(); }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Nouvelle demande de budget SIR</DialogTitle></DialogHeader>
          <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">

            {/* Lignes produits */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-semibold text-gray-700">Produits demandés</Label>
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
                      {fuels.map((f) => (
                        <option key={f.id} value={f.id}>{f.name} ({f.code})</option>
                      ))}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs text-gray-600">Quantité estimée (M15) *</Label>
                      <Input
                        type="number"
                        placeholder="ex : 100 000"
                        value={l.qty}
                        onChange={(e) => { const n = [...lines]; n[idx] = { ...n[idx], qty: e.target.value }; setLines(n); }}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-gray-600">Montant estimé (FCFA) *</Label>
                      <Input
                        type="number"
                        placeholder="ex : 73 000 000"
                        value={l.amount}
                        onChange={(e) => { const n = [...lines]; n[idx] = { ...n[idx], amount: e.target.value }; setLines(n); }}
                      />
                    </div>
                  </div>
                </div>
              ))}

              {totalDemande > 0 && (
                <div className="flex justify-end">
                  <div className="bg-white border border-gray-200 rounded-lg px-4 py-2 text-sm">
                    <span className="text-gray-500">Total demandé : </span>
                    <span className="font-bold text-gray-900">{fmt(totalDemande)} FCFA</span>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-1">
              <Label>Justification</Label>
              <Textarea rows={3} value={justification} onChange={(e) => setJustification(e.target.value)}
                placeholder="Motif de la demande, contexte marché, urgence..." />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={resetNew}>Annuler</Button>
            <Button className="bg-[#0369A1] hover:bg-blue-700" disabled={loading} onClick={submitNew}>
              Envoyer à la Direction Financière
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
                    <p className="text-xs text-gray-400 mb-0.5">Date</p>
                    <p className="font-medium">{new Date(selected.createdAt).toLocaleDateString("fr-CI")}</p>
                  </div>
                </div>

                {/* Détail des produits */}
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Produit</TableHead>
                        <TableHead className="text-right">Qté M15</TableHead>
                        <TableHead className="text-right">Montant estimé</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selected.items.map((i) => (
                        <TableRow key={i.id}>
                          <TableCell className="font-medium">{i.fuel.name} ({i.fuel.code})</TableCell>
                          <TableCell className="text-right">{fmt(i.estimatedQty)}</TableCell>
                          <TableCell className="text-right">{fmt(i.estimatedAmount)} FCFA</TableCell>
                        </TableRow>
                      ))}
                      <TableRow>
                        <TableCell colSpan={2} className="text-right font-bold">Total</TableCell>
                        <TableCell className="text-right font-bold">
                          {fmt(selected.items.reduce((s, i) => s + Number(i.estimatedAmount), 0))} FCFA
                        </TableCell>
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

                {(isDF || isAdmin) && selected.status === "EN_ATTENTE" && (
                  <div className="border-t pt-4 space-y-3">
                    <div className="space-y-1">
                      <Label>Montant accordé (FCFA) *</Label>
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
