"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CheckCircle, XCircle, AlertTriangle, Search } from "lucide-react";
import { validateVersement } from "@/app/dashboard/gerant/versements/actions";
import { toast } from "sonner";

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

function fmt(n: number) {
  return n.toLocaleString("fr-CI", { maximumFractionDigits: 0 });
}

function daysDiff(dateA: string, dateB: string) {
  return Math.round((new Date(dateB).getTime() - new Date(dateA).getTime()) / 86400000);
}

interface Versement {
  id: string;
  date: string;
  dateRecette: string | null;
  amount: number;
  slipNumber: string | null;
  status: string;
  note: string | null;
  stationName: string;
  user: { name: string } | null;
}

export function VersementsDFClient({
  versements,
  totalPending,
  totalValidated,
  userRole,
}: {
  versements: Versement[];
  totalPending: number;
  totalValidated: number;
  userRole: string;
}) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [filterRetard, setFilterRetard] = useState("ALL");

  const canValidate = ["ADMIN", "DIRECTION_FINANCIERE"].includes(userRole);

  async function handleValidate(id: string, approved: boolean) {
    const result = await validateVersement(id, approved);
    if (result.success) {
      toast.success(approved ? "Versement validé." : "Versement rejeté.");
      router.refresh();
    } else {
      toast.error(result.error || "Une erreur est survenue.");
    }
  }

  const filtered = versements.filter((v) => {
    const depositStr = v.date.split("T")[0];
    const recetteStr = v.dateRecette ? v.dateRecette.split("T")[0] : null;
    const retard = recetteStr ? daysDiff(recetteStr, depositStr) : 0;

    if (filterStatus !== "ALL" && v.status !== filterStatus) return false;
    if (filterRetard === "RETARD" && retard === 0) return false;
    if (filterRetard === "NORMAL" && retard > 0) return false;
    if (search) {
      const q = search.toLowerCase();
      if (
        !v.stationName.toLowerCase().includes(q) &&
        !(v.user?.name ?? "").toLowerCase().includes(q) &&
        !(v.slipNumber ?? "").toLowerCase().includes(q)
      ) return false;
    }
    return true;
  });

  const pendingCount = versements.filter((v) => v.status === "EN_ATTENTE").length;
  const retardCount = versements.filter((v) => {
    const depositStr = v.date.split("T")[0];
    const recetteStr = v.dateRecette ? v.dateRecette.split("T")[0] : null;
    return recetteStr ? daysDiff(recetteStr, depositStr) > 0 : false;
  }).length;

  return (
    <div className="space-y-5">
      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-yellow-50 rounded-xl p-4 border border-yellow-200">
          <p className="text-xs text-yellow-700">En attente validation</p>
          <p className="text-2xl font-bold text-yellow-800 tabular-nums">{fmt(totalPending)}</p>
          <p className="text-xs text-yellow-600 mt-0.5">{pendingCount} versement{pendingCount > 1 ? "s" : ""}</p>
        </div>
        <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-200">
          <p className="text-xs text-emerald-700">Total validé</p>
          <p className="text-2xl font-bold text-emerald-800 tabular-nums">{fmt(totalValidated)}</p>
          <p className="text-xs text-emerald-600 mt-0.5">FCFA</p>
        </div>
        <div className={`rounded-xl p-4 border ${retardCount > 0 ? "bg-amber-50 border-amber-200" : "bg-slate-50 border-slate-200"}`}>
          <p className={`text-xs ${retardCount > 0 ? "text-amber-700" : "text-slate-500"}`}>Versements en retard</p>
          <p className={`text-2xl font-bold ${retardCount > 0 ? "text-amber-800" : "text-slate-600"} tabular-nums`}>{retardCount}</p>
          <p className={`text-xs mt-0.5 ${retardCount > 0 ? "text-amber-600" : "text-slate-400"}`}>sur {versements.length} total</p>
        </div>
        <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
          <p className="text-xs text-slate-500">Total reçu</p>
          <p className="text-2xl font-bold text-slate-700 tabular-nums">{versements.length}</p>
          <p className="text-xs text-slate-400 mt-0.5">versements</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 bg-white rounded-xl border border-slate-100 p-3 shadow-sm">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            className="pl-9 h-9 text-sm"
            placeholder="Station, gérant, bordereau..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-40 h-9 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Tous statuts</SelectItem>
            <SelectItem value="EN_ATTENTE">En attente</SelectItem>
            <SelectItem value="VALIDE">Validés</SelectItem>
            <SelectItem value="REJETE">Rejetés</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterRetard} onValueChange={setFilterRetard}>
          <SelectTrigger className="w-44 h-9 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Tous délais</SelectItem>
            <SelectItem value="RETARD">En retard seulement</SelectItem>
            <SelectItem value="NORMAL">Jour J seulement</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50/50 text-xs">
                <TableHead>Station</TableHead>
                <TableHead>Date recette</TableHead>
                <TableHead>Date dépôt</TableHead>
                <TableHead>Retard</TableHead>
                <TableHead className="text-right">Montant</TableHead>
                <TableHead>N° bordereau</TableHead>
                <TableHead>Gérant</TableHead>
                <TableHead>Statut</TableHead>
                {canValidate && <TableHead className="text-right">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((v) => {
                const depositStr = v.date.split("T")[0];
                const recetteStr = v.dateRecette ? v.dateRecette.split("T")[0] : null;
                const retard = recetteStr ? daysDiff(recetteStr, depositStr) : 0;
                return (
                  <TableRow key={v.id} className={v.status === "EN_ATTENTE" ? "bg-yellow-50/30" : ""}>
                    <TableCell className="font-medium text-sm">{v.stationName}</TableCell>
                    <TableCell className="text-sm text-slate-500">
                      {recetteStr
                        ? new Date(recetteStr + "T12:00:00").toLocaleDateString("fr-CI", { day: "2-digit", month: "short" })
                        : <span className="text-slate-300">—</span>}
                    </TableCell>
                    <TableCell className="text-sm">
                      {new Date(depositStr + "T12:00:00").toLocaleDateString("fr-CI", { day: "2-digit", month: "short" })}
                    </TableCell>
                    <TableCell>
                      {retard > 0 ? (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                          <AlertTriangle className="w-3 h-3" />{retard}j
                        </span>
                      ) : recetteStr ? (
                        <span className="text-xs text-emerald-500 font-medium">Jour J</span>
                      ) : (
                        <span className="text-slate-300 text-xs">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-semibold tabular-nums">
                      {fmt(Number(v.amount))} FCFA
                    </TableCell>
                    <TableCell className="text-sm font-mono">{v.slipNumber || "—"}</TableCell>
                    <TableCell className="text-sm text-slate-500">{v.user?.name || "—"}</TableCell>
                    <TableCell>
                      <Badge className={`text-xs ${STATUS_COLORS[v.status]}`}>
                        {STATUS_LABELS[v.status]}
                      </Badge>
                    </TableCell>
                    {canValidate && (
                      <TableCell className="text-right">
                        {v.status === "EN_ATTENTE" && (
                          <div className="flex gap-1 justify-end">
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => handleValidate(v.id, true)}>
                              <CheckCircle className="w-4 h-4 text-green-600" />
                            </Button>
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => handleValidate(v.id, false)}>
                              <XCircle className="w-4 h-4 text-red-500" />
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                );
              })}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={9} className="text-center text-slate-400 py-10">
                    Aucun versement ne correspond aux filtres.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
