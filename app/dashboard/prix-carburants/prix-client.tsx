"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { proposePrix, validerPrix, updateFuelPrice } from "./actions";
import { toast } from "sonner";
import {
  Pencil, X, Save, Loader2, TrendingUp, Plus, CheckCircle, XCircle,
  Clock, ArrowRight, History,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

interface Fuel {
  id: string; name: string; code: string;
  salePrice: number; purchasePrice: number; margin: number; unit: string;
}

interface Proposal {
  id: string;
  fuelId: string;
  fuel: { id: string; name: string; code: string };
  user: { name: string } | null;
  salePrice: number;
  purchasePrice: number;
  justification: string | null;
  status: string;
  validatedAt: string | null;
  rejectionReason: string | null;
  effectiveDate: string | null;
  createdAt: string;
}

const STATUS_LABELS: Record<string, string> = {
  EN_ATTENTE: "En attente DF",
  VALIDE: "Validé",
  REJETE: "Rejeté",
  REMPLACE: "Remplacé",
};
const STATUS_COLORS: Record<string, string> = {
  EN_ATTENTE: "bg-yellow-100 text-yellow-700 border-yellow-200",
  VALIDE: "bg-green-100 text-green-700 border-green-200",
  REJETE: "bg-red-100 text-red-700 border-red-200",
  REMPLACE: "bg-slate-100 text-slate-500 border-slate-200",
};

function fmt(n: number) { return n.toLocaleString("fr-CI", { maximumFractionDigits: 0 }); }

export function PrixClient({ fuels, proposals, userRole }: {
  fuels: Fuel[];
  proposals: Proposal[];
  userRole: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [openPropose, setOpenPropose] = useState<string | null>(null); // fuelId
  const [openReject, setOpenReject] = useState<string | null>(null); // proposalId
  const [rejectReason, setRejectReason] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null); // admin direct edit
  const [showHistory, setShowHistory] = useState(false);

  const isDC = userRole === "DIRECTION_COMMERCIALE";
  const isDF = userRole === "DIRECTION_FINANCIERE";
  const isAdmin = userRole === "ADMIN";
  const isDG = userRole === "DIRECTION_GENERALE";

  const pendingProposals = proposals.filter((p) => p.status === "EN_ATTENTE");
  const historyProposals = proposals.filter((p) => p.status !== "EN_ATTENTE");

  async function handlePropose(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const result = await proposePrix(new FormData(e.currentTarget));
    setLoading(false);
    if (result.success) {
      toast.success("Proposition envoyée à la Direction Financière.");
      setOpenPropose(null);
      router.refresh();
    } else {
      toast.error(result.error || "Erreur.");
    }
  }

  async function handleValidate(id: string, approved: boolean) {
    setLoading(true);
    const result = await validerPrix(id, approved, approved ? undefined : rejectReason);
    setLoading(false);
    if (result.success) {
      toast.success(approved ? "Prix validé et appliqué." : "Proposition rejetée.");
      setOpenReject(null);
      setRejectReason("");
      router.refresh();
    } else {
      toast.error(result.error || "Erreur.");
    }
  }

  async function handleDirectUpdate(e: React.FormEvent<HTMLFormElement>, id: string) {
    e.preventDefault();
    setLoading(true);
    const res = await updateFuelPrice(id, new FormData(e.currentTarget));
    setLoading(false);
    if (res?.error) toast.error(res.error);
    else { toast.success("Prix mis à jour."); setEditingId(null); router.refresh(); }
  }

  const fuelForPropose = fuels.find((f) => f.id === openPropose);

  return (
    <div className="space-y-6">

      {/* ── Propositions en attente (DF) ─────────────────────────────────────── */}
      {(isDF || isAdmin) && pendingProposals.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-2xl overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-3.5 border-b border-yellow-200">
            <Clock className="w-4 h-4 text-yellow-600" />
            <h3 className="text-sm font-bold text-yellow-800">
              {pendingProposals.length} proposition{pendingProposals.length > 1 ? "s" : ""} en attente de validation
            </h3>
          </div>
          <div className="divide-y divide-yellow-100">
            {pendingProposals.map((p) => {
              const currentFuel = fuels.find((f) => f.id === p.fuelId);
              return (
                <div key={p.id} className="px-5 py-4">
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-slate-800">{p.fuel.name}</span>
                        <span className="text-[11px] font-mono bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">{p.fuel.code}</span>
                      </div>
                      <p className="text-xs text-slate-500">Proposé par {p.user?.name} · {new Date(p.createdAt).toLocaleDateString("fr-CI", { day: "2-digit", month: "short", year: "numeric" })}</p>
                      {p.justification && <p className="text-xs text-slate-600 italic">"{p.justification}"</p>}
                      {p.effectiveDate && (
                        <p className="text-xs text-blue-600">
                          Entrée en vigueur : {new Date(p.effectiveDate + "T12:00:00").toLocaleDateString("fr-CI", { day: "2-digit", month: "long", year: "numeric" })}
                        </p>
                      )}
                    </div>

                    {/* Price comparison */}
                    <div className="flex items-center gap-3 text-sm">
                      {currentFuel && (
                        <>
                          <div className="text-center">
                            <p className="text-[10px] text-slate-400 uppercase">Actuel</p>
                            <p className="font-semibold text-slate-500">{fmt(currentFuel.salePrice)} / {fmt(currentFuel.purchasePrice)}</p>
                            <p className="text-[10px] text-slate-400">vente / achat</p>
                          </div>
                          <ArrowRight className="w-4 h-4 text-slate-300" />
                        </>
                      )}
                      <div className="text-center">
                        <p className="text-[10px] text-yellow-600 uppercase font-semibold">Proposé</p>
                        <p className="font-bold text-slate-900">{fmt(p.salePrice)} / {fmt(p.purchasePrice)}</p>
                        <p className="text-[10px] text-slate-400">vente / achat</p>
                      </div>
                      {currentFuel && (
                        <div className={`text-center px-2 py-1 rounded-lg ${p.salePrice > currentFuel.salePrice ? "bg-emerald-50" : p.salePrice < currentFuel.salePrice ? "bg-red-50" : "bg-slate-50"}`}>
                          <p className="text-[10px] text-slate-400">Écart</p>
                          <p className={`font-bold text-sm ${p.salePrice > currentFuel.salePrice ? "text-emerald-600" : p.salePrice < currentFuel.salePrice ? "text-red-600" : "text-slate-400"}`}>
                            {p.salePrice > currentFuel.salePrice ? "+" : ""}{fmt(Number(p.salePrice) - currentFuel.salePrice)}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {(isDF || isAdmin) && (
                    <div className="flex gap-2 mt-3">
                      <Button
                        size="sm"
                        className="bg-emerald-600 hover:bg-emerald-700 text-white h-8 text-xs"
                        disabled={loading}
                        onClick={() => handleValidate(p.id, true)}
                      >
                        <CheckCircle className="w-3.5 h-3.5 mr-1" /> Valider et appliquer
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-red-200 text-red-600 hover:bg-red-50 h-8 text-xs"
                        onClick={() => { setOpenReject(p.id); setRejectReason(""); }}
                      >
                        <XCircle className="w-3.5 h-3.5 mr-1" /> Rejeter
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Pending notification for DC */}
      {isDC && pendingProposals.length > 0 && (
        <div className="flex items-center gap-3 bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-3">
          <Clock className="w-4 h-4 text-yellow-600 flex-shrink-0" />
          <p className="text-sm text-yellow-800">
            <span className="font-semibold">{pendingProposals.length} proposition{pendingProposals.length > 1 ? "s" : ""}</span> en attente de validation par la Direction Financière.
          </p>
        </div>
      )}

      {/* ── Prix actuels ─────────────────────────────────────────────────────── */}
      <div className="space-y-3">
        {fuels.map((f) => {
          const pending = pendingProposals.find((p) => p.fuelId === f.id);
          return (
            <div key={f.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-orange-500" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-gray-900">{f.name}</p>
                      {pending && (
                        <Badge className="text-[10px] bg-yellow-100 text-yellow-700 border-yellow-200">
                          <Clock className="w-2.5 h-2.5 mr-1" />Révision en cours
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-gray-400">{f.code} · par {f.unit}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  {isDC && editingId !== f.id && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 text-xs border-orange-200 text-orange-700 hover:bg-orange-50"
                      onClick={() => setOpenPropose(f.id)}
                    >
                      <Plus className="w-3.5 h-3.5 mr-1" /> Proposer révision
                    </Button>
                  )}
                  {(isAdmin || isDG) && editingId !== f.id && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 text-xs text-slate-500"
                      onClick={() => setEditingId(f.id)}
                    >
                      <Pencil className="w-3.5 h-3.5 mr-1" /> Modifier
                    </Button>
                  )}
                  {editingId === f.id && (
                    <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => setEditingId(null)}>
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>

              {editingId !== f.id ? (
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-gray-50 rounded-xl p-3 text-center">
                    <p className="text-[11px] text-gray-400 mb-1">Prix d'achat (SIR)</p>
                    <p className="font-bold text-gray-900">{fmt(f.purchasePrice)}</p>
                    <p className="text-[10px] text-gray-400">FCFA/{f.unit}</p>
                  </div>
                  <div className="bg-orange-50 rounded-xl p-3 text-center">
                    <p className="text-[11px] text-orange-500 mb-1">Prix pompe</p>
                    <p className="font-bold text-orange-700 text-lg">{fmt(f.salePrice)}</p>
                    <p className="text-[10px] text-orange-400">FCFA/{f.unit}</p>
                  </div>
                  <div className="bg-green-50 rounded-xl p-3 text-center">
                    <p className="text-[11px] text-green-500 mb-1">Marge</p>
                    <p className="font-bold text-green-700">{fmt(f.margin)}</p>
                    <p className="text-[10px] text-green-400">FCFA/{f.unit}</p>
                  </div>
                </div>
              ) : (
                <form onSubmit={(e) => handleDirectUpdate(e, f.id)} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-gray-700">Prix d'achat SIR (FCFA/{f.unit})</label>
                      <input name="purchasePrice" type="number" step="1" min="1" defaultValue={f.purchasePrice} required
                        className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-gray-700">Prix pompe (FCFA/{f.unit})</label>
                      <input name="salePrice" type="number" step="1" min="1" defaultValue={f.salePrice} required
                        className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400" />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <button type="button" onClick={() => setEditingId(null)}
                      className="px-4 py-2 text-sm text-gray-500 hover:bg-gray-100 rounded-xl transition-colors">
                      Annuler
                    </button>
                    <button type="submit" disabled={loading}
                      className="flex items-center gap-2 px-4 py-2 bg-[#0369A1] hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-semibold rounded-xl transition-colors">
                      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                      Enregistrer
                    </button>
                  </div>
                </form>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Historique ───────────────────────────────────────────────────────── */}
      {historyProposals.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <button
            className="w-full flex items-center justify-between px-5 py-3.5 text-left hover:bg-slate-50 transition-colors"
            onClick={() => setShowHistory(!showHistory)}
          >
            <div className="flex items-center gap-2">
              <History className="w-4 h-4 text-slate-400" />
              <span className="text-sm font-bold text-slate-800">Historique des propositions</span>
            </div>
            <span className="text-xs text-slate-400">{historyProposals.length} entrées</span>
          </button>
          {showHistory && (
            <div className="divide-y divide-slate-50">
              {historyProposals.map((p) => (
                <div key={p.id} className="flex items-center justify-between px-5 py-3 gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <Badge className={`text-[10px] shrink-0 ${STATUS_COLORS[p.status]}`}>{STATUS_LABELS[p.status]}</Badge>
                    <span className="text-sm font-medium text-slate-700 truncate">{p.fuel.name}</span>
                    <span className="text-sm tabular-nums text-slate-500 shrink-0">{fmt(p.salePrice)} / {fmt(p.purchasePrice)}</span>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs text-slate-500">{p.user?.name}</p>
                    <p className="text-[11px] text-slate-400">{new Date(p.createdAt).toLocaleDateString("fr-CI", { day: "2-digit", month: "short", year: "numeric" })}</p>
                    {p.rejectionReason && <p className="text-[11px] text-red-500 italic">{p.rejectionReason}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Dialog : Proposer révision (DC) ─────────────────────────────────── */}
      <Dialog open={!!openPropose} onOpenChange={(v) => !v && setOpenPropose(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Proposer une révision de prix</DialogTitle>
            {fuelForPropose && (
              <p className="text-sm text-slate-500">{fuelForPropose.name} — prix actuels : {fmt(fuelForPropose.salePrice)} FCFA pompe / {fmt(fuelForPropose.purchasePrice)} FCFA SIR</p>
            )}
          </DialogHeader>
          <form onSubmit={handlePropose} className="space-y-4">
            <input type="hidden" name="fuelId" value={openPropose ?? ""} />
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Prix d'achat SIR</Label>
                <Input name="purchasePrice" type="number" step="1" min="1" defaultValue={fuelForPropose?.purchasePrice} required />
              </div>
              <div className="space-y-1.5">
                <Label>Prix pompe</Label>
                <Input name="salePrice" type="number" step="1" min="1" defaultValue={fuelForPropose?.salePrice} required />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Date d'entrée en vigueur (optionnel)</Label>
              <Input name="effectiveDate" type="date" />
            </div>
            <div className="space-y-1.5">
              <Label>Justification</Label>
              <Textarea name="justification" rows={2} placeholder="Révision tarifaire SIR, ajustement marge..." />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpenPropose(null)}>Annuler</Button>
              <Button type="submit" disabled={loading} className="bg-orange-600 hover:bg-orange-700">
                {loading ? "..." : "Soumettre à la DF"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Dialog : Motif de rejet (DF) ─────────────────────────────────────── */}
      <Dialog open={!!openReject} onOpenChange={(v) => !v && setOpenReject(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Motif de rejet</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <Textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={3}
              placeholder="Expliquez pourquoi cette proposition est rejetée..."
            />
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpenReject(null)}>Annuler</Button>
              <Button
                disabled={loading}
                className="bg-red-600 hover:bg-red-700"
                onClick={() => openReject && handleValidate(openReject, false)}
              >
                {loading ? "..." : "Confirmer le rejet"}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
}
