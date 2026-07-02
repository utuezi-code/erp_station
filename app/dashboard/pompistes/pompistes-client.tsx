"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { UserPlus, Users, TrendingUp, ChevronLeft, ChevronRight } from "lucide-react";
import { savePompiste, saveShift, togglePompiste } from "./actions";
import { toast } from "sonner";

interface Shift {
  id: string;
  shiftType: string;
  volumeSold: number | null;
  revenue: number | null;
  note: string | null;
}

interface Pompiste {
  id: string;
  name: string;
  phone: string | null;
  matricule: string | null;
  stationId: string;
  active: boolean;
  shifts: Shift[];
}

interface Stats { pompisteId: string; volumeSold: number; revenue: number; }

const SHIFT_LABELS: Record<string, string> = { MATIN: "Matin", APRES_MIDI: "Après-midi", NUIT: "Nuit" };
const SHIFT_COLORS: Record<string, string> = {
  MATIN: "bg-amber-100 text-amber-700 border-amber-200",
  APRES_MIDI: "bg-blue-100 text-blue-700 border-blue-200",
  NUIT: "bg-indigo-100 text-indigo-700 border-indigo-200",
};

function fmt(n: number) { return n.toLocaleString("fr-CI", { maximumFractionDigits: 0 }); }

export function PompistesClient({
  pompistes, stations, selectedStation, selectedDate, isGerant, statsParPompiste,
}: {
  pompistes: Pompiste[];
  stations: { id: string; name: string }[];
  selectedStation: string;
  selectedDate: string;
  isGerant: boolean;
  statsParPompiste: Stats[];
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [openPompiste, setOpenPompiste] = useState(false);
  const [openShift, setOpenShift] = useState<string | null>(null);

  function updateParams(key: string, value: string) {
    const p = new URLSearchParams({ stationId: selectedStation, date: selectedDate });
    p.set(key, value);
    router.push(`?${p.toString()}`);
  }

  function changeDate(delta: number) {
    const [y, m, d] = selectedDate.split("-").map(Number);
    const date = new Date(y, m - 1, d);
    date.setDate(date.getDate() + delta);
    const nd = [date.getFullYear(), String(date.getMonth() + 1).padStart(2, "0"), String(date.getDate()).padStart(2, "0")].join("-");
    updateParams("date", nd);
  }

  async function handleSavePompiste(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    try {
      await savePompiste(new FormData(e.currentTarget));
      toast.success("Pompiste enregistré.");
      setOpenPompiste(false);
      router.refresh();
    } catch (err: any) {
      toast.error(err.message);
    } finally { setLoading(false); }
  }

  async function handleSaveShift(e: React.FormEvent<HTMLFormElement>, pompisteId: string) {
    e.preventDefault();
    setLoading(true);
    try {
      await saveShift(new FormData(e.currentTarget));
      toast.success("Shift enregistré.");
      setOpenShift(null);
      router.refresh();
    } catch (err: any) {
      toast.error(err.message);
    } finally { setLoading(false); }
  }

  const totalVolumeMonth = statsParPompiste.reduce((s, p) => s + p.volumeSold, 0);
  const totalRevenueMonth = statsParPompiste.reduce((s, p) => s + p.revenue, 0);

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-wrap gap-3 bg-white border border-slate-100 rounded-xl p-4 shadow-sm">
        {!isGerant && (
          <div className="space-y-1">
            <Label className="text-xs text-slate-500">Station</Label>
            <Select value={selectedStation || "none"} onValueChange={(v) => updateParams("stationId", v === "none" ? "" : (v ?? ""))}>
              <SelectTrigger className="w-52">
                <span>{selectedStation ? (stations.find((s) => s.id === selectedStation)?.name ?? selectedStation) : "Choisir une station..."}</span>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Choisir une station...</SelectItem>
                {stations.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        )}
        <div className="space-y-1">
          <Label className="text-xs text-slate-500">Date</Label>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon" className="h-9 w-9" onClick={() => changeDate(-1)}><ChevronLeft className="w-4 h-4" /></Button>
            <Input type="date" value={selectedDate} onChange={(e) => updateParams("date", e.target.value)} className="w-36 h-9" />
            <Button variant="outline" size="icon" className="h-9 w-9" onClick={() => changeDate(1)}><ChevronRight className="w-4 h-4" /></Button>
          </div>
        </div>
        {selectedStation && (
          <div className="ml-auto flex items-end">
            <Dialog open={openPompiste} onOpenChange={setOpenPompiste}>
              <DialogTrigger asChild>
                <Button size="sm" className="bg-orange-500 hover:bg-orange-600 text-white">
                  <UserPlus className="w-4 h-4 mr-1" /> Ajouter pompiste
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Nouveau pompiste</DialogTitle></DialogHeader>
                <form onSubmit={handleSavePompiste} className="space-y-4 mt-2">
                  <input type="hidden" name="stationId" value={selectedStation} />
                  <div><Label>Nom complet *</Label><Input name="name" required className="mt-1" /></div>
                  <div><Label>Téléphone</Label><Input name="phone" className="mt-1" /></div>
                  <div><Label>Matricule</Label><Input name="matricule" className="mt-1" /></div>
                  <Button type="submit" disabled={loading} className="w-full bg-orange-500 hover:bg-orange-600 text-white">Enregistrer</Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        )}
      </div>

      {/* Monthly KPIs */}
      {selectedStation && statsParPompiste.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <Card className="shadow-sm border-slate-100">
            <CardContent className="pt-4">
              <p className="text-xs text-slate-400 uppercase tracking-wide">Pompistes actifs</p>
              <p className="text-3xl font-bold text-slate-900 mt-1">{pompistes.filter((p) => p.active).length}</p>
            </CardContent>
          </Card>
          <Card className="shadow-sm border-slate-100">
            <CardContent className="pt-4">
              <p className="text-xs text-slate-400 uppercase tracking-wide">Volume mois (L)</p>
              <p className="text-3xl font-bold text-slate-900 mt-1">{fmt(totalVolumeMonth)}</p>
            </CardContent>
          </Card>
          <Card className="shadow-sm border-slate-100">
            <CardContent className="pt-4">
              <p className="text-xs text-slate-400 uppercase tracking-wide">CA mois (FCFA)</p>
              <p className="text-3xl font-bold text-slate-900 mt-1">{fmt(totalRevenueMonth)}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Pompiste list */}
      {!selectedStation ? (
        <div className="text-center py-16 text-slate-400">
          <Users className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p>Sélectionnez une station pour voir les pompistes</p>
        </div>
      ) : pompistes.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <Users className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p>Aucun pompiste enregistré pour cette station</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {pompistes.map((pompiste) => {
            const stats = statsParPompiste.find((s) => s.pompisteId === pompiste.id);
            const todayShifts = pompiste.shifts;
            return (
              <Card key={pompiste.id} className={`shadow-sm border-slate-100 ${!pompiste.active ? "opacity-50" : ""}`}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-base">{pompiste.name}</CardTitle>
                      <p className="text-xs text-slate-400 mt-0.5">{pompiste.matricule || "—"} {pompiste.phone ? `· ${pompiste.phone}` : ""}</p>
                    </div>
                    <Badge variant={pompiste.active ? "default" : "secondary"} className="text-xs">
                      {pompiste.active ? "Actif" : "Inactif"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {/* Today's shifts */}
                  <div>
                    <p className="text-xs font-medium text-slate-500 mb-2">Shifts du jour</p>
                    <div className="flex flex-wrap gap-1">
                      {(["MATIN", "APRES_MIDI", "NUIT"] as const).map((type) => {
                        const shift = todayShifts.find((s) => s.shiftType === type);
                        return (
                          <span
                            key={type}
                            className={`text-xs px-2 py-0.5 rounded-full border font-medium ${shift ? SHIFT_COLORS[type] : "bg-slate-100 text-slate-400 border-slate-200"}`}
                          >
                            {SHIFT_LABELS[type]}{shift?.volumeSold ? ` · ${fmt(shift.volumeSold)}L` : ""}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                  {/* Monthly stats */}
                  {stats && (
                    <div className="grid grid-cols-2 gap-2 p-2 bg-slate-50 rounded-lg">
                      <div>
                        <p className="text-[10px] text-slate-400">Vol. mois</p>
                        <p className="text-sm font-semibold text-slate-700">{fmt(stats.volumeSold)} L</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-400">CA mois</p>
                        <p className="text-sm font-semibold text-slate-700">{fmt(stats.revenue)} F</p>
                      </div>
                    </div>
                  )}
                  {/* Actions */}
                  <div className="flex gap-2 pt-1">
                    <Dialog open={openShift === pompiste.id} onOpenChange={(v) => setOpenShift(v ? pompiste.id : null)}>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm" className="flex-1 text-xs">
                          <TrendingUp className="w-3 h-3 mr-1" /> Saisir shift
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader><DialogTitle>Shift — {pompiste.name}</DialogTitle></DialogHeader>
                        <form onSubmit={(e) => handleSaveShift(e, pompiste.id)} className="space-y-4 mt-2">
                          <input type="hidden" name="pompisteId" value={pompiste.id} />
                          <input type="hidden" name="stationId" value={selectedStation} />
                          <input type="hidden" name="date" value={selectedDate} />
                          <div>
                            <Label>Shift *</Label>
                            <Select name="shiftType">
                              <SelectTrigger className="mt-1 w-full"><span>Choisir...</span></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="MATIN">Matin</SelectItem>
                                <SelectItem value="APRES_MIDI">Après-midi</SelectItem>
                                <SelectItem value="NUIT">Nuit</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div><Label>Volume (L)</Label><Input name="volumeSold" type="number" step="0.01" min="0" className="mt-1" /></div>
                            <div><Label>CA (FCFA)</Label><Input name="revenue" type="number" step="1" min="0" className="mt-1" /></div>
                          </div>
                          <div><Label>Note</Label><Input name="note" className="mt-1" /></div>
                          <Button type="submit" disabled={loading} className="w-full bg-orange-500 hover:bg-orange-600 text-white">Enregistrer</Button>
                        </form>
                      </DialogContent>
                    </Dialog>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs text-slate-400 hover:text-red-500"
                      onClick={async () => {
                        await togglePompiste(pompiste.id, !pompiste.active);
                        router.refresh();
                      }}
                    >
                      {pompiste.active ? "Désactiver" : "Activer"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
