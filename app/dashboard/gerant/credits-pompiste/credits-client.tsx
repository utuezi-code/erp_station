"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, CheckCircle, Trash2, Clock } from "lucide-react";
import { createVenteCredit, encaisserVenteCredit, deleteVenteCredit } from "./actions";

function fmt(n: any) {
  return Number(n || 0).toLocaleString("fr-CI", { maximumFractionDigits: 0 });
}
function fmtDate(d: string | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("fr-CI", { day: "2-digit", month: "2-digit", year: "numeric" });
}

interface Pompiste { id: string; name: string }
interface Vente {
  id: string;
  date: string;
  clientNom: string;
  montant: number;
  volume: number | null;
  description: string | null;
  paid: boolean;
  paidAt: string | null;
  paidAmount: number | null;
  pompiste: { name: string };
}

export function CreditsClient({ stationId, pompistes, ventes }: {
  stationId: string;
  pompistes: Pompiste[];
  ventes: Vente[];
}) {
  const [saving, setSaving] = useState(false);
  const [pompisteId, setPompisteId] = useState(pompistes[0]?.id ?? "");
  const [encaisserVente, setEncaisserVente] = useState<Vente | null>(null);
  const [paidAmount, setPaidAmount] = useState("");
  const [paying, setPaying] = useState(false);
  const [filterStatus, setFilterStatus] = useState<"ALL" | "PENDING" | "PAID">("ALL");

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    fd.set("stationId", stationId);
    fd.set("pompisteId", pompisteId);
    setSaving(true);
    try {
      await createVenteCredit(fd);
      toast.success("Vente à crédit enregistrée.");
      (e.target as HTMLFormElement).reset();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleEncaisser() {
    if (!encaisserVente) return;
    const amt = parseFloat(paidAmount);
    if (isNaN(amt) || amt <= 0) { toast.error("Montant invalide."); return; }
    setPaying(true);
    try {
      await encaisserVenteCredit(encaisserVente.id, amt);
      toast.success("Paiement enregistré.");
      setEncaisserVente(null);
      setPaidAmount("");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setPaying(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Supprimer cette vente à crédit ?")) return;
    try {
      await deleteVenteCredit(id);
      toast.success("Supprimé.");
    } catch (err: any) {
      toast.error(err.message);
    }
  }

  const displayed = ventes.filter((v) =>
    filterStatus === "ALL" ? true : filterStatus === "PAID" ? v.paid : !v.paid
  );

  const totalPending = ventes.filter((v) => !v.paid).reduce((s, v) => s + Number(v.montant), 0);
  const totalPaid = ventes.filter((v) => v.paid).reduce((s, v) => s + Number(v.paidAmount ?? v.montant), 0);

  return (
    <div>
      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <Clock className="w-4 h-4 text-orange-500" />
            <p className="text-xs font-medium text-orange-700">En attente d'encaissement</p>
          </div>
          <p className="text-2xl font-bold text-orange-700 tabular-nums">{fmt(totalPending)} FCFA</p>
          <p className="text-xs text-orange-500 mt-0.5">{ventes.filter((v) => !v.paid).length} vente(s) non réglée(s)</p>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle className="w-4 h-4 text-green-500" />
            <p className="text-xs font-medium text-green-700">Encaissé</p>
          </div>
          <p className="text-2xl font-bold text-green-700 tabular-nums">{fmt(totalPaid)} FCFA</p>
          <p className="text-xs text-green-500 mt-0.5">{ventes.filter((v) => v.paid).length} vente(s) réglée(s)</p>
        </div>
      </div>

      {/* Add form */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 mb-5">
        <h2 className="text-sm font-semibold text-slate-800 mb-4">Enregistrer une vente à crédit</h2>
        <form onSubmit={handleCreate} className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Date</label>
              <Input name="date" type="date" defaultValue={new Date().toISOString().slice(0, 10)} required />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Pompiste</label>
              <Select value={pompisteId} onValueChange={(v) => setPompisteId(v ?? "")}>
                <SelectTrigger>
                  <SelectValue placeholder="Choisir un pompiste" />
                </SelectTrigger>
                <SelectContent>
                  {pompistes.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Nom du client</label>
              <Input name="clientNom" placeholder="Ex: M. Koné" required />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Montant (FCFA)</label>
              <Input name="montant" type="number" min="1" step="1" placeholder="0" required />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Volume (L) — optionnel</label>
              <Input name="volume" type="number" min="0" step="0.01" placeholder="0" />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Observation</label>
              <Input name="description" placeholder="Remarque..." />
            </div>
          </div>
          <div className="flex justify-end">
            <Button type="submit" disabled={saving || !pompisteId} className="bg-[#0369A1] hover:bg-blue-700">
              <Plus className="w-4 h-4 mr-1" />{saving ? "..." : "Enregistrer"}
            </Button>
          </div>
        </form>
      </div>

      {/* Filter + List */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-50 flex items-center justify-between">
          <span className="text-sm font-semibold text-slate-800">Historique des ventes à crédit</span>
          <Select value={filterStatus} onValueChange={(v) => setFilterStatus((v ?? "ALL") as any)}>
            <SelectTrigger className="w-36 h-7 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Toutes</SelectItem>
              <SelectItem value="PENDING">En attente</SelectItem>
              <SelectItem value="PAID">Réglées</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {displayed.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-8">Aucune vente à crédit.</p>
        ) : (
          <div className="divide-y divide-slate-50">
            {displayed.map((v) => (
              <div key={v.id} className="flex items-start justify-between px-5 py-3 gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-slate-800">{v.clientNom}</span>
                    <Badge variant="outline" className="text-[10px]">{v.pompiste.name}</Badge>
                    <span className="text-xs text-slate-400">{fmtDate(v.date)}</span>
                    {v.paid ? (
                      <Badge className="bg-green-100 text-green-700 text-[10px]">Réglé le {fmtDate(v.paidAt)}</Badge>
                    ) : (
                      <Badge className="bg-orange-100 text-orange-700 text-[10px]">En attente</Badge>
                    )}
                  </div>
                  {v.description && <p className="text-xs text-slate-400 mt-0.5">{v.description}</p>}
                  {v.volume != null && <p className="text-xs text-slate-500 mt-0.5">{fmt(v.volume)} L</p>}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <div className="text-right">
                    <p className="text-sm font-bold text-slate-900 tabular-nums">{fmt(v.montant)} FCFA</p>
                    {v.paid && v.paidAmount != null && Number(v.paidAmount) !== Number(v.montant) && (
                      <p className="text-xs text-green-600 tabular-nums">Payé: {fmt(v.paidAmount)}</p>
                    )}
                  </div>
                  {!v.paid && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-green-400 text-green-600 hover:bg-green-50 text-xs"
                      onClick={() => { setEncaisserVente(v); setPaidAmount(String(v.montant)); }}
                    >
                      <CheckCircle className="w-3.5 h-3.5 mr-1" /> Encaisser
                    </Button>
                  )}
                  {!v.paid && (
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(v.id)} className="text-red-400 hover:text-red-600 hover:bg-red-50">
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Encaisser dialog */}
      <Dialog open={!!encaisserVente} onOpenChange={(o) => { if (!o) { setEncaisserVente(null); setPaidAmount(""); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Encaisser le paiement</DialogTitle>
          </DialogHeader>
          {encaisserVente && (
            <div className="space-y-4">
              <div className="bg-slate-50 rounded-lg p-3 text-sm">
                <p><span className="text-slate-500">Client :</span> <strong>{encaisserVente.clientNom}</strong></p>
                <p><span className="text-slate-500">Montant dû :</span> <strong>{fmt(encaisserVente.montant)} FCFA</strong></p>
                <p><span className="text-slate-500">Pompiste :</span> {encaisserVente.pompiste.name}</p>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Montant encaissé (FCFA)</label>
                <Input
                  type="number"
                  min="1"
                  value={paidAmount}
                  onChange={(e) => setPaidAmount(e.target.value)}
                  autoFocus
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => { setEncaisserVente(null); setPaidAmount(""); }}>Annuler</Button>
                <Button onClick={handleEncaisser} disabled={paying} className="bg-green-600 hover:bg-green-700">
                  <CheckCircle className="w-4 h-4 mr-1" />{paying ? "..." : "Confirmer"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
