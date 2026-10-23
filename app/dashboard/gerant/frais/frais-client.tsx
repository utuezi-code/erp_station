"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Trash2, ChevronLeft, ChevronRight } from "lucide-react";
import { saveFrais, deleteFrais } from "./actions";

const FRAIS_TYPES: Record<string, string> = {
  CONTRE_PLEIN: "Contre-plein",
  SALAIRE: "Salaire",
  EAU: "Eau",
  ELECTRICITE: "Électricité",
  SECURITE: "Sécurité",
  MAINTENANCE: "Maintenance",
  TRANSPORT: "Transport",
  TAXE: "Taxe / Impôt",
  COMMISSION: "Commission",
  AUTRE: "Autre",
};

function fmt(n: any) {
  return Number(n || 0).toLocaleString("fr-CI", { maximumFractionDigits: 0 });
}

interface Frais {
  id: string;
  type: string;
  libelle: string;
  montant: number;
  date: string;
  user: { name: string | null };
}

export function FraisClient({ stationId, selectedDate, frais }: {
  stationId: string;
  selectedDate: string;
  frais: Frais[];
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [type, setType] = useState("CONTRE_PLEIN");

  function changeDate(delta: number) {
    const [y, m, d] = selectedDate.split("-").map(Number);
    const date = new Date(y, m - 1, d);
    date.setDate(date.getDate() + delta);
    const nd = [date.getFullYear(), String(date.getMonth() + 1).padStart(2, "0"), String(date.getDate()).padStart(2, "0")].join("-");
    router.push(`?date=${nd}`);
  }

  async function handleSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    fd.set("stationId", stationId);
    fd.set("date", selectedDate);
    fd.set("type", type);
    setSaving(true);
    try {
      await saveFrais(fd);
      toast.success("Frais enregistré.");
      (e.target as HTMLFormElement).reset();
      setType("CONTRE_PLEIN");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Supprimer ce frais ?")) return;
    setDeleting(id);
    try {
      await deleteFrais(id);
      toast.success("Frais supprimé.");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setDeleting(null);
    }
  }

  const total = frais.reduce((s, f) => s + Number(f.montant), 0);

  return (
    <div>
      {/* Date nav */}
      <div className="flex items-center gap-3 mb-6">
        <Button variant="outline" size="sm" onClick={() => changeDate(-1)}><ChevronLeft className="w-4 h-4" /></Button>
        <Input
          type="date"
          value={selectedDate}
          onChange={(e) => router.push(`?date=${e.target.value}`)}
          className="w-auto"
        />
        <Button variant="outline" size="sm" onClick={() => changeDate(1)}><ChevronRight className="w-4 h-4" /></Button>
      </div>

      {/* Add form */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 mb-5">
        <h2 className="text-sm font-semibold text-slate-800 mb-4">Ajouter un frais</h2>
        <form onSubmit={handleSave} className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Type</label>
            <Select value={type} onValueChange={(v) => setType(v ?? "AUTRE")}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(FRAIS_TYPES).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Libellé</label>
            <Input name="libelle" placeholder="Ex: Salaire gardien" required />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Montant (FCFA)</label>
            <Input name="montant" type="number" min="1" step="1" placeholder="0" required />
          </div>
          <Button type="submit" disabled={saving} className="bg-[#0369A1] hover:bg-blue-700">
            <Plus className="w-4 h-4 mr-1" />{saving ? "..." : "Ajouter"}
          </Button>
        </form>
      </div>

      {/* List */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-50 flex items-center justify-between">
          <span className="text-sm font-semibold text-slate-800">
            Frais du {new Date(selectedDate + "T12:00:00").toLocaleDateString("fr-CI", { day: "2-digit", month: "long", year: "numeric" })}
          </span>
          {frais.length > 0 && (
            <span className="text-sm font-bold text-red-600">{fmt(total)} FCFA</span>
          )}
        </div>
        {frais.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-8">Aucun frais pour cette date.</p>
        ) : (
          <div className="divide-y divide-slate-50">
            {frais.map((f) => (
              <div key={f.id} className="flex items-center justify-between px-5 py-3">
                <div className="flex items-center gap-3">
                  <Badge variant="outline" className="text-[10px] shrink-0">{FRAIS_TYPES[f.type] ?? f.type}</Badge>
                  <div>
                    <p className="text-sm font-medium text-slate-800">{f.libelle}</p>
                    <p className="text-xs text-slate-400">Saisi par {f.user.name ?? "—"}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-bold text-red-600 tabular-nums">{fmt(f.montant)} FCFA</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(f.id)}
                    disabled={deleting === f.id}
                    className="text-red-400 hover:text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            ))}
            <div className="px-5 py-3 bg-red-50 flex items-center justify-between">
              <span className="text-xs font-bold text-red-700 uppercase tracking-wide">Total frais du jour</span>
              <span className="text-base font-bold text-red-700 tabular-nums">{fmt(total)} FCFA</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
