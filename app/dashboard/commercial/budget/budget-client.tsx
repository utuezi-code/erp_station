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
import { Plus, Send } from "lucide-react";
import { toast } from "sonner";
import { createBudgetRequest, communicateBudget } from "./actions";
import { useRouter } from "next/navigation";

function fmt(n: any) { return Number(n || 0).toLocaleString("fr-CI", { maximumFractionDigits: 0 }); }

const STATUS: Record<string, { label: string; color: string }> = {
  EN_ATTENTE: { label: "En attente DF", color: "bg-blue-100 text-blue-700" },
  ACCORDE: { label: "Budget communiqué", color: "bg-green-100 text-green-700" },
};

interface BudgetRequest {
  id: string;
  number: string;
  status: string;
  estimatedAmount: number | null;
  justification: string | null;
  createdAt: string;
  user: { name: string };
  allocation: { allocatedAmount: number; note: string | null; user: { name: string } } | null;
}

export function BudgetClient({
  requests,
  role,
}: {
  requests: BudgetRequest[];
  role: string;
}) {
  const router = useRouter();
  const isDC = role === "DIRECTION_COMMERCIALE";
  const isDF = role === "DIRECTION_FINANCIERE";
  const isAdmin = role === "ADMIN";

  const [showNew, setShowNew] = useState(false);
  const [selected, setSelected] = useState<BudgetRequest | null>(null);
  const [loading, setLoading] = useState(false);

  // Nouveau formulaire demande (simple)
  const [estimatedAmount, setEstimatedAmount] = useState("");
  const [justification, setJustification] = useState("");

  // DF — communiquer le budget disponible
  const [availableAmount, setAvailableAmount] = useState("");
  const [dfNote, setDfNote] = useState("");

  function resetNew() {
    setShowNew(false);
    setEstimatedAmount("");
    setJustification("");
  }

  async function submitNew() {
    setLoading(true);
    const r = await createBudgetRequest({
      estimatedAmount: estimatedAmount ? Number(estimatedAmount) : undefined,
      justification: justification || undefined,
    });
    setLoading(false);
    if (r.success) {
      toast.success("Demande de budget envoyée à la Direction Financière.");
      resetNew();
      router.refresh();
    } else {
      toast.error("Erreur.");
    }
  }

  async function doCommunicate() {
    if (!selected) return;
    if (!availableAmount || Number(availableAmount) <= 0) { toast.error("Entrez le montant disponible."); return; }
    setLoading(true);
    const r = await communicateBudget(selected.id, Number(availableAmount), dfNote || undefined);
    setLoading(false);
    if (r.success) {
      toast.success("Budget disponible communiqué à la Direction Commerciale.");
      setSelected(null); setAvailableAmount(""); setDfNote("");
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
                <TableHead>Demandeur</TableHead>
                <TableHead className="text-right">Montant estimé</TableHead>
                <TableHead className="text-right">Budget communiqué</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Date</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {requests.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-mono text-sm">{r.number}</TableCell>
                  <TableCell className="text-sm">{r.user.name}</TableCell>
                  <TableCell className="text-right text-sm text-gray-500">
                    {r.estimatedAmount ? `${fmt(r.estimatedAmount)} FCFA` : "—"}
                  </TableCell>
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
                        onClick={() => { setSelected(r); setAvailableAmount(""); setDfNote(""); }}>
                        Communiquer
                      </Button>
                    ) : (
                      <Button variant="ghost" size="sm" onClick={() => setSelected(r)}>Voir</Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {requests.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-gray-500 py-8">Aucune demande de budget.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Modal nouvelle demande (DC) — simple */}
      <Dialog open={showNew} onOpenChange={(v) => { if (!v) resetNew(); }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Nouvelle demande de budget</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1">
              <Label>Montant estimé (FCFA)</Label>
              <Input
                type="number"
                value={estimatedAmount}
                onChange={(e) => setEstimatedAmount(e.target.value)}
                placeholder="ex : 100 000 000 (optionnel)"
              />
              <p className="text-xs text-gray-400">Estimation indicative — la DF communiquera le montant disponible.</p>
            </div>
            <div className="space-y-1">
              <Label>Justification / contexte</Label>
              <Textarea
                rows={3}
                value={justification}
                onChange={(e) => setJustification(e.target.value)}
                placeholder="Motif de la demande, urgence, période concernée..."
              />
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
      <Dialog open={!!selected} onOpenChange={(v) => { if (!v) { setSelected(null); setAvailableAmount(""); setDfNote(""); } }}>
        <DialogContent className="max-w-md">
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
                  {selected.estimatedAmount && (
                    <div className="bg-gray-50 rounded-lg px-3 py-2 col-span-2">
                      <p className="text-xs text-gray-400 mb-0.5">Montant estimé par la DC</p>
                      <p className="font-semibold">{fmt(selected.estimatedAmount)} FCFA</p>
                    </div>
                  )}
                </div>

                {selected.justification && (
                  <div className="bg-blue-50 border border-blue-100 rounded-lg px-3 py-2 text-sm text-blue-800">
                    <p className="text-xs font-semibold text-blue-500 mb-1">Justification</p>
                    {selected.justification}
                  </div>
                )}

                {selected.allocation && (
                  <div className="bg-green-50 border border-green-200 rounded-lg px-3 py-2 text-sm">
                    <p className="text-xs font-semibold text-green-600 mb-1">Budget communiqué par {selected.allocation.user.name}</p>
                    <p className="font-bold text-green-700 text-base">{fmt(selected.allocation.allocatedAmount)} FCFA</p>
                    {selected.allocation.note && <p className="text-green-700 mt-1">{selected.allocation.note}</p>}
                  </div>
                )}

                {(isDF || isAdmin) && selected.status === "EN_ATTENTE" && (
                  <div className="border-t pt-4 space-y-3">
                    <div className="space-y-1">
                      <Label>Montant disponible (FCFA) *</Label>
                      <Input
                        type="number"
                        value={availableAmount}
                        onChange={(e) => setAvailableAmount(e.target.value)}
                        placeholder="ex : 95 000 000"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>Note (optionnel)</Label>
                      <Textarea rows={2} value={dfNote} onChange={(e) => setDfNote(e.target.value)} placeholder="Conditions, remarques..." />
                    </div>
                  </div>
                )}
              </div>
              <DialogFooter className="gap-2">
                <Button variant="outline" onClick={() => { setSelected(null); setAvailableAmount(""); setDfNote(""); }}>Fermer</Button>
                {(isDF || isAdmin) && selected.status === "EN_ATTENTE" && (
                  <Button className="bg-orange-500 hover:bg-orange-600" disabled={loading} onClick={doCommunicate}>
                    <Send className="w-4 h-4 mr-2" /> Communiquer le budget disponible
                  </Button>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
