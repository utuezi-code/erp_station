"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Plus, CheckCircle, XCircle, Trash2, AlertTriangle, ChevronDown, ChevronUp,
  Clock,
} from "lucide-react";
import { createVersement, validateVersement, saveFrais, deleteFrais } from "./actions";
import { toast } from "sonner";

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<string, string> = {
  EN_ATTENTE: "En attente",
  VALIDE: "Validé",
  REJETE: "Rejeté",
};
const STATUS_COLORS: Record<string, string> = {
  EN_ATTENTE: "bg-yellow-100 text-yellow-700 border-yellow-200",
  VALIDE: "bg-green-100 text-green-700 border-green-200",
  REJETE: "bg-red-100 text-red-700 border-red-200",
};

const FRAIS_LABELS: Record<string, string> = {
  CARBURANT_INTERNE: "Carburant interne",
  FRAIS_ROUTE: "Frais de route",
  CONTRE_PLEIN: "Contre-plein",
  AVANCE_POMPISTE: "Avance pompiste",
  AUTRE: "Autre",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number) {
  return n.toLocaleString("fr-CI", { maximumFractionDigits: 0 });
}

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function daysDiff(dateA: string, dateB: string) {
  return Math.round((new Date(dateB).getTime() - new Date(dateA).getTime()) / 86400000);
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface Versement {
  id: string;
  date: string;
  dateRecette: string | null;
  amount: number;
  slipNumber: string | null;
  status: string;
  note: string | null;
  user: { name: string } | null;
}

interface Frais {
  id: string;
  date: string;
  type: string;
  libelle: string;
  montant: number;
}

interface Props {
  stationId: string;
  versements: Versement[];
  bankAccounts: { id: string; bankName: string; accountNumber: string }[];
  frais: Frais[];
  caMap: Record<string, number>;
  userRole: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function VersementsClientPage({ stationId, versements, bankAccounts, frais, caMap, userRole }: Props) {
  const router = useRouter();
  const [openVersement, setOpenVersement] = useState(false);
  const [openFrais, setOpenFrais] = useState(false);
  const [fraisDate, setFraisDate] = useState(todayStr());
  const [recetteDate, setRecetteDate] = useState(todayStr());
  const [loading, setLoading] = useState(false);
  const [expandedDates, setExpandedDates] = useState<Record<string, boolean>>({});

  const canValidate = ["ADMIN", "DIRECTION_FINANCIERE"].includes(userRole);
  const isGerant = userRole === "GERANT";

  // ── Computed RAV for a given date ──────────────────────────────────────────
  function getRavData(dateStr: string) {
    const ca = caMap[dateStr] ?? 0;
    const totalFrais = frais
      .filter((f) => f.date.split("T")[0] === dateStr)
      .reduce((s, f) => s + Number(f.montant), 0);
    const verseTotalForDate = versements
      .filter((v) => (v.dateRecette ?? v.date).split("T")[0] === dateStr && v.status !== "REJETE")
      .reduce((s, v) => s + Number(v.amount), 0);
    const rav = ca - totalFrais;
    const ecart = verseTotalForDate - rav;
    return { ca, totalFrais, rav, verseTotalForDate, ecart };
  }

  // ── Last 7 days summary ────────────────────────────────────────────────────
  const last7Days: string[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    last7Days.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`);
  }

  // ── Versement form submit ──────────────────────────────────────────────────
  async function handleVersementSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    const result = await createVersement(fd);
    setLoading(false);
    if (result.success) {
      toast.success("Versement déclaré.");
      setOpenVersement(false);
      router.refresh();
    } else {
      toast.error(result.error || "Une erreur est survenue.");
    }
  }

  // ── Frais form submit ──────────────────────────────────────────────────────
  async function handleFraisSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    const result = await saveFrais(fd);
    setLoading(false);
    if (result.success) {
      toast.success("Frais enregistré.");
      setOpenFrais(false);
      router.refresh();
    } else {
      toast.error(result.error || "Une erreur est survenue.");
    }
  }

  async function handleDeleteFrais(id: string) {
    const result = await deleteFrais(id);
    if (result.success) {
      toast.success("Frais supprimé.");
      router.refresh();
    } else {
      toast.error(result.error || "Erreur.");
    }
  }

  async function handleValidate(id: string, approved: boolean) {
    const result = await validateVersement(id, approved);
    if (result.success) {
      toast.success(approved ? "Versement validé." : "Versement rejeté.");
      router.refresh();
    } else {
      toast.error(result.error || "Une erreur est survenue.");
    }
  }

  const ravForRecette = getRavData(recetteDate);

  return (
    <div className="space-y-6">

      {/* ── Actions rapides ─────────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-3">
        <Button onClick={() => { setFraisDate(todayStr()); setOpenFrais(true); }} variant="outline" className="border-orange-200 text-orange-700 hover:bg-orange-50">
          <Plus className="w-4 h-4 mr-2" /> Ajouter un frais
        </Button>
        <Button onClick={() => { setRecetteDate(todayStr()); setOpenVersement(true); }} className="bg-[#0369A1] hover:bg-blue-700">
          <Plus className="w-4 h-4 mr-2" /> Déclarer un versement
        </Button>
      </div>

      {/* ── Récap 7 jours ───────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-50 flex items-center gap-2">
          <Clock className="w-4 h-4 text-slate-400" />
          <h3 className="text-sm font-bold text-slate-800">Récap 7 derniers jours</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-50 text-[11px] text-slate-400 uppercase tracking-wide">
                <th className="text-left px-4 py-2 font-semibold">Date</th>
                <th className="text-right px-4 py-2 font-semibold">CA</th>
                <th className="text-right px-4 py-2 font-semibold">Frais</th>
                <th className="text-right px-4 py-2 font-semibold">RAV</th>
                <th className="text-right px-4 py-2 font-semibold">Versé</th>
                <th className="text-right px-4 py-2 font-semibold">Écart</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {last7Days.map((dateStr) => {
                const { ca, totalFrais, rav, verseTotalForDate, ecart } = getRavData(dateStr);
                const dayFrais = frais.filter((f) => f.date.split("T")[0] === dateStr);
                const expanded = expandedDates[dateStr];
                const hasData = ca > 0 || totalFrais > 0 || verseTotalForDate > 0;
                const isToday = dateStr === todayStr();
                return (
                  <>
                    <tr
                      key={dateStr}
                      className={`border-b border-slate-50 transition-colors ${hasData ? "hover:bg-slate-50 cursor-pointer" : "opacity-40"}`}
                      onClick={() => hasData && setExpandedDates((p) => ({ ...p, [dateStr]: !p[dateStr] }))}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {hasData && (
                            <span className="text-slate-300">{expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}</span>
                          )}
                          <span className={`font-medium ${isToday ? "text-blue-600" : "text-slate-700"}`}>
                            {new Date(dateStr + "T12:00:00").toLocaleDateString("fr-CI", { weekday: "short", day: "numeric", month: "short" })}
                            {isToday && <span className="ml-1 text-[10px] font-bold text-blue-500 bg-blue-50 px-1.5 py-0.5 rounded-full">Aujourd'hui</span>}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right font-medium tabular-nums text-slate-700">{ca > 0 ? fmt(ca) : "—"}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-orange-600">{totalFrais > 0 ? `− ${fmt(totalFrais)}` : "—"}</td>
                      <td className="px-4 py-3 text-right font-bold tabular-nums text-slate-900">{ca > 0 ? fmt(rav) : "—"}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-emerald-700 font-medium">{verseTotalForDate > 0 ? fmt(verseTotalForDate) : "—"}</td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        {ca > 0 && (
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                            Math.abs(ecart) < 100 ? "bg-emerald-100 text-emerald-700" :
                            ecart > 0 ? "bg-blue-100 text-blue-700" : "bg-red-100 text-red-700"
                          }`}>
                            {ecart > 0 ? "+" : ""}{fmt(ecart)}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {isGerant && hasData && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-xs text-blue-600 hover:bg-blue-50 h-7 px-2"
                            onClick={(e) => { e.stopPropagation(); setRecetteDate(dateStr); setOpenVersement(true); }}
                          >
                            + Versement
                          </Button>
                        )}
                      </td>
                    </tr>
                    {expanded && (
                      <tr key={`${dateStr}-detail`} className="bg-slate-50/60">
                        <td colSpan={7} className="px-8 pb-3 pt-1">
                          {dayFrais.length > 0 && (
                            <div className="space-y-1">
                              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-1">Frais déductibles</p>
                              {dayFrais.map((f) => (
                                <div key={f.id} className="flex items-center justify-between text-xs bg-orange-50 rounded-lg px-3 py-1.5">
                                  <span className="text-orange-600 font-medium">{FRAIS_LABELS[f.type]}</span>
                                  <span className="text-slate-600 mx-2 flex-1">{f.libelle}</span>
                                  <span className="font-semibold text-orange-700 tabular-nums">− {fmt(Number(f.montant))} FCFA</span>
                                  {isGerant && (
                                    <button
                                      onClick={() => handleDeleteFrais(f.id)}
                                      className="ml-2 text-slate-300 hover:text-red-500 transition-colors"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                          {versements.filter((v) => (v.dateRecette ?? v.date).split("T")[0] === dateStr).map((v) => {
                            const retard = v.dateRecette ? daysDiff(v.dateRecette.split("T")[0], v.date.split("T")[0]) : 0;
                            return (
                              <div key={v.id} className="flex items-center justify-between text-xs bg-emerald-50 rounded-lg px-3 py-1.5 mt-1">
                                <span className="text-emerald-700 font-medium">Versement</span>
                                <span className="text-slate-500 mx-2">{new Date(v.date + "T12:00:00").toLocaleDateString("fr-CI")}</span>
                                {retard > 0 && (
                                  <span className="text-amber-600 flex items-center gap-1"><AlertTriangle className="w-3 h-3" />{retard}j de retard</span>
                                )}
                                <span className="font-semibold text-emerald-700 tabular-nums flex-1 text-right">{fmt(Number(v.amount))} FCFA</span>
                                <Badge className={`ml-2 text-[10px] ${STATUS_COLORS[v.status]}`}>{STATUS_LABELS[v.status]}</Badge>
                                {canValidate && v.status === "EN_ATTENTE" && (
                                  <div className="flex gap-1 ml-2">
                                    <button onClick={() => handleValidate(v.id, true)}><CheckCircle className="w-4 h-4 text-green-500 hover:text-green-700" /></button>
                                    <button onClick={() => handleValidate(v.id, false)}><XCircle className="w-4 h-4 text-red-400 hover:text-red-600" /></button>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Historique complet ──────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-50">
          <h3 className="text-sm font-bold text-slate-800">Historique des versements</h3>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50/50">
                <TableHead className="text-xs">Date recette</TableHead>
                <TableHead className="text-xs">Date dépôt</TableHead>
                <TableHead className="text-xs">Retard</TableHead>
                <TableHead className="text-xs text-right">Montant</TableHead>
                <TableHead className="text-xs">N° bordereau</TableHead>
                <TableHead className="text-xs">Déclaré par</TableHead>
                <TableHead className="text-xs">Statut</TableHead>
                {canValidate && <TableHead className="text-xs text-right">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {versements.map((v) => {
                const recetteStr = v.dateRecette ? v.dateRecette.split("T")[0] : null;
                const depositStr = v.date.split("T")[0];
                const retard = recetteStr ? daysDiff(recetteStr, depositStr) : 0;
                return (
                  <TableRow key={v.id}>
                    <TableCell className="text-sm">
                      {recetteStr
                        ? new Date(recetteStr + "T12:00:00").toLocaleDateString("fr-CI", { day: "2-digit", month: "short" })
                        : <span className="text-slate-300">—</span>}
                    </TableCell>
                    <TableCell className="text-sm">{new Date(depositStr + "T12:00:00").toLocaleDateString("fr-CI", { day: "2-digit", month: "short" })}</TableCell>
                    <TableCell>
                      {retard > 0 ? (
                        <span className="text-xs flex items-center gap-1 text-amber-600 font-medium">
                          <AlertTriangle className="w-3 h-3" />{retard}j
                        </span>
                      ) : retard === 0 ? (
                        <span className="text-xs text-emerald-500">Jour J</span>
                      ) : (
                        <span className="text-slate-300 text-xs">—</span>
                      )}
                    </TableCell>
                    <TableCell className="font-semibold tabular-nums text-right">{fmt(Number(v.amount))} FCFA</TableCell>
                    <TableCell className="text-sm">{v.slipNumber || "—"}</TableCell>
                    <TableCell className="text-sm">{v.user?.name || "—"}</TableCell>
                    <TableCell>
                      <Badge className={`text-xs ${STATUS_COLORS[v.status]}`}>{STATUS_LABELS[v.status]}</Badge>
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
                );
              })}
              {versements.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-slate-400 py-8">Aucun versement enregistré.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* ── Dialog : Ajouter frais ──────────────────────────────────────────── */}
      <Dialog open={openFrais} onOpenChange={setOpenFrais}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Ajouter un frais journalier</DialogTitle></DialogHeader>
          <form onSubmit={handleFraisSubmit} className="space-y-4">
            <input type="hidden" name="stationId" value={stationId} />
            <div className="space-y-2">
              <Label>Date</Label>
              <Input
                name="date"
                type="date"
                value={fraisDate}
                max={todayStr()}
                onChange={(e) => setFraisDate(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Catégorie</Label>
              <Select name="type" required>
                <SelectTrigger><SelectValue placeholder="Choisir..." /></SelectTrigger>
                <SelectContent>
                  {Object.entries(FRAIS_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Libellé</Label>
              <Input name="libelle" placeholder="Ex : Carburant tricycle livraison Sirihio" required />
            </div>
            <div className="space-y-2">
              <Label>Montant (FCFA)</Label>
              <Input name="montant" type="number" step="1" min="1" required />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpenFrais(false)}>Annuler</Button>
              <Button type="submit" disabled={loading} className="bg-orange-600 hover:bg-orange-700">
                {loading ? "..." : "Enregistrer"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Dialog : Déclarer versement ─────────────────────────────────────── */}
      <Dialog open={openVersement} onOpenChange={setOpenVersement}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Déclarer un versement</DialogTitle></DialogHeader>
          <form onSubmit={handleVersementSubmit} className="space-y-4">
            <input type="hidden" name="stationId" value={stationId} />

            {/* Date de recette + RAV auto */}
            <div className="space-y-2">
              <Label>Date de recette (jour du CA couvert)</Label>
              <Input
                name="dateRecette"
                type="date"
                value={recetteDate}
                max={todayStr()}
                onChange={(e) => setRecetteDate(e.target.value)}
                required
              />
            </div>

            {/* RAV recap */}
            {recetteDate && (
              <div className="bg-slate-50 rounded-xl p-3 space-y-1 text-sm">
                <div className="flex justify-between text-slate-500">
                  <span>CA du jour</span>
                  <span className="tabular-nums font-medium text-slate-700">{fmt(ravForRecette.ca)} FCFA</span>
                </div>
                {ravForRecette.totalFrais > 0 && (
                  <div className="flex justify-between text-orange-600">
                    <span>Frais à déduire</span>
                    <span className="tabular-nums">− {fmt(ravForRecette.totalFrais)} FCFA</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-slate-900 border-t border-slate-200 pt-1 mt-1">
                  <span>RAV (Reste À Verser)</span>
                  <span className="tabular-nums">{fmt(ravForRecette.rav)} FCFA</span>
                </div>
                {ravForRecette.verseTotalForDate > 0 && (
                  <div className="flex justify-between text-emerald-600">
                    <span>Déjà versé pour ce jour</span>
                    <span className="tabular-nums">− {fmt(ravForRecette.verseTotalForDate)} FCFA</span>
                  </div>
                )}
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Date du dépôt banque</Label>
                <Input
                  name="date"
                  type="date"
                  defaultValue={todayStr()}
                  min={recetteDate}
                  max={todayStr()}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Montant versé (FCFA)</Label>
                <Input
                  name="amount"
                  type="number"
                  step="1"
                  min="1"
                  placeholder={ravForRecette.rav > 0 ? String(Math.max(0, ravForRecette.rav - ravForRecette.verseTotalForDate)) : ""}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Compte bancaire</Label>
              <Select name="bankAccountId">
                <SelectTrigger><SelectValue placeholder="Choisir..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Aucun compte spécifié</SelectItem>
                  {bankAccounts.map((b) => (
                    <SelectItem key={b.id} value={b.id}>{b.bankName} — {b.accountNumber}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>N° de bordereau</Label>
              <Input name="slipNumber" placeholder="BV-2026-001" />
            </div>

            <div className="space-y-2">
              <Label>Note</Label>
              <Textarea name="note" rows={2} placeholder="Espèces déposées, observations..." />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpenVersement(false)}>Annuler</Button>
              <Button type="submit" disabled={loading} className="bg-[#0369A1] hover:bg-blue-700">
                {loading ? "Enregistrement..." : "Déclarer"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

    </div>
  );
}
