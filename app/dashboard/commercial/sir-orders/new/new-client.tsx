"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { createSIROrder } from "../actions";
import { useRouter } from "next/navigation";

function fmt(n: any) { return Number(n || 0).toLocaleString("fr-CI", { maximumFractionDigits: 0 }); }

interface Proposal {
  id: string;
  number: string;
  totalAmount: number;
  items: { fuelId?: string; quantityM15: number; estimatedUnitPrice: number; fuel: { id: string; name: string; code: string } }[];
  budgetAllocation: { allocatedAmount: number };
}

export function NewSIROrderClient({
  proposals,
  fuels,
  suppliers,
  preselectedProposalId,
}: {
  proposals: Proposal[];
  fuels: { id: string; name: string; code: string }[];
  suppliers: { id: string; name: string; code: string }[];
  preselectedProposalId?: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [proposalId, setProposalId] = useState(preselectedProposalId || "");
  const [supplierId, setSupplierId] = useState("");
  const [note, setNote] = useState("");
  const [items, setItems] = useState<{ fuelId: string; quantityM15: string; unitPrice: string }[]>([
    { fuelId: "", quantityM15: "", unitPrice: "" },
  ]);

  const selectedProposal = proposals.find((p) => p.id === proposalId);

  // Pre-fill items when proposal changes
  function selectProposal(id: string) {
    setProposalId(id);
    const p = proposals.find((pr) => pr.id === id);
    if (p && p.items.length > 0) {
      setItems(p.items.map((i) => ({ fuelId: i.fuel.id, quantityM15: String(i.quantityM15), unitPrice: String(i.estimatedUnitPrice) })));
    }
  }

  function addLine() {
    setItems([...items, { fuelId: "", quantityM15: "", unitPrice: "" }]);
  }

  function removeLine(idx: number) {
    setItems(items.filter((_, i) => i !== idx));
  }

  const total = items.reduce((s, i) => s + Number(i.quantityM15 || 0) * Number(i.unitPrice || 0), 0);

  async function submit() {
    if (!proposalId) { toast.error("Sélectionnez une proposition."); return; }
    const lines = items.filter((i) => i.fuelId && Number(i.quantityM15) > 0 && Number(i.unitPrice) > 0);
    if (lines.length === 0) { toast.error("Au moins une ligne article valide requise."); return; }
    setLoading(true);
    const r = await createSIROrder({
      proposalId,
      supplierId: supplierId || undefined,
      items: lines.map((l) => ({ fuelId: l.fuelId, quantityM15: Number(l.quantityM15), unitPrice: Number(l.unitPrice) })),
      note: note || undefined,
    });
    setLoading(false);
    if (r.success && r.id) {
      toast.success("Bon de commande SIR créé.");
      router.push(`/dashboard/commercial/sir-orders/${r.id}`);
    } else {
      toast.error("Erreur lors de la création.");
    }
  }

  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <p className="text-sm text-gray-400">Module Commercial</p>
        <h1 className="text-2xl font-bold text-gray-900">Nouveau bon de commande SIR</h1>
      </div>

      <div className="space-y-4">
        <Card>
          <CardHeader><CardTitle className="text-sm">Informations générales</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <Label>Proposition d'achat validée *</Label>
              <Select value={proposalId} onValueChange={(v) => selectProposal(v ?? "")}>
                <SelectTrigger><SelectValue placeholder="Sélectionner une proposition approuvée par le DG" /></SelectTrigger>
                <SelectContent>
                  {proposals.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.number} — {p.items.map((i) => i.fuel.code).join(", ")} · {fmt(p.totalAmount)} FCFA
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {proposals.length === 0 && (
                <p className="text-xs text-amber-600 mt-1">Aucune proposition approuvée sans BC actif.</p>
              )}
            </div>
            {selectedProposal && (
              <div className="bg-blue-50 border border-blue-100 rounded-lg px-3 py-2 text-sm text-blue-700">
                Budget alloué : <strong>{fmt(selectedProposal.budgetAllocation.allocatedAmount)} FCFA</strong>
              </div>
            )}
            <div className="space-y-1">
              <Label>Fournisseur (SIR)</Label>
              <Select value={supplierId} onValueChange={(v) => setSupplierId(v ?? "")}>
                <SelectTrigger><SelectValue placeholder="Sélectionner le fournisseur" /></SelectTrigger>
                <SelectContent>
                  {suppliers.map((s) => <SelectItem key={s.id} value={s.id}>{s.name} ({s.code})</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center justify-between">
              Articles
              <Button variant="outline" size="sm" onClick={addLine}><Plus className="w-3 h-3 mr-1" /> Ligne</Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Produit *</TableHead>
                  <TableHead className="text-right">Qté M15 *</TableHead>
                  <TableHead className="text-right">P.U. (FCFA/L) *</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item, idx) => (
                  <TableRow key={idx}>
                    <TableCell>
                      <Select value={item.fuelId} onValueChange={(v) => { const n = [...items]; n[idx] = { ...n[idx], fuelId: v ?? "" }; setItems(n); }}>
                        <SelectTrigger className="h-8"><SelectValue placeholder="Carburant" /></SelectTrigger>
                        <SelectContent>
                          {fuels.map((f) => <SelectItem key={f.id} value={f.id}>{f.name} ({f.code})</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Input className="h-8 text-right" type="number" value={item.quantityM15} onChange={(e) => { const n = [...items]; n[idx] = { ...n[idx], quantityM15: e.target.value }; setItems(n); }} />
                    </TableCell>
                    <TableCell>
                      <Input className="h-8 text-right" type="number" value={item.unitPrice} onChange={(e) => { const n = [...items]; n[idx] = { ...n[idx], unitPrice: e.target.value }; setItems(n); }} />
                    </TableCell>
                    <TableCell className="text-right text-sm font-medium">
                      {item.quantityM15 && item.unitPrice ? `${fmt(Number(item.quantityM15) * Number(item.unitPrice))} FCFA` : "—"}
                    </TableCell>
                    <TableCell>
                      {items.length > 1 && (
                        <Button variant="ghost" size="sm" onClick={() => removeLine(idx)}><Trash2 className="w-3 h-3 text-red-400" /></Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {total > 0 && (
                  <TableRow>
                    <TableCell colSpan={3} className="text-right font-bold">Total</TableCell>
                    <TableCell className="text-right font-bold">{fmt(total)} FCFA</TableCell>
                    <TableCell />
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 space-y-1">
            <Label>Note interne</Label>
            <Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Observations, conditions spéciales..." />
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => router.back()}>Annuler</Button>
          <Button className="bg-[#0369A1] hover:bg-blue-700" disabled={loading} onClick={submit}>
            Créer le bon de commande
          </Button>
        </div>
      </div>
    </div>
  );
}
