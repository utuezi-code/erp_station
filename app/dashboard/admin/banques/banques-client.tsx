"use client";

import { useState } from "react";
import { Plus, Pencil, Trash2, Landmark, X, Loader2 } from "lucide-react";
import { createBankAccount, updateBankAccount, deleteBankAccount } from "./actions";
import { toast } from "sonner";

interface Account {
  id: string;
  bankName: string;
  accountNumber: string;
  rib: string | null;
  station: { name: string; code: string };
  _count: { versements: number };
}

interface Props {
  accounts: Account[];
  stations: { id: string; name: string; code: string }[];
}

const BANKS = ["SGBCI", "Ecobank", "BICICI", "SIB", "BNI", "NSIA Banque", "Coris Bank", "Orabank", "Access Bank", "Autre"];

export function BanquesClient({ accounts, stations }: Props) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Account | null>(null);
  const [loading, setLoading] = useState(false);

  function openCreate() { setEditing(null); setOpen(true); }
  function openEdit(a: Account) { setEditing(a); setOpen(true); }
  function closeModal() { setOpen(false); setEditing(null); }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    try {
      const fd = new FormData(e.currentTarget);
      if (editing) {
        await updateBankAccount(editing.id, fd);
        toast.success("Compte mis à jour");
      } else {
        await createBankAccount(fd);
        toast.success("Compte créé");
      }
      closeModal();
    } catch {
      toast.error("Erreur lors de l'enregistrement");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string, versements: number) {
    if (versements > 0) {
      toast.error(`Impossible : ${versements} versement(s) lié(s) à ce compte`);
      return;
    }
    if (!confirm("Supprimer ce compte bancaire ?")) return;
    try {
      await deleteBankAccount(id);
      toast.success("Compte supprimé");
    } catch {
      toast.error("Erreur lors de la suppression");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 bg-[#0369A1] hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-colors shadow-sm shadow-orange-400/20"
        >
          <Plus className="w-4 h-4" /> Nouveau compte
        </button>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {accounts.length === 0 ? (
          <div className="col-span-3 bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
            <Landmark className="w-10 h-10 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-400 text-sm">Aucun compte bancaire enregistré</p>
          </div>
        ) : (
          accounts.map((a) => (
            <div key={a.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
                    <Landmark className="w-5 h-5 text-blue-500" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 text-sm">{a.bankName}</p>
                    <p className="text-xs text-gray-400">{a.station.name}</p>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => openEdit(a)} className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors">
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => handleDelete(a.id, a._count.versements)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-400">N° Compte</span>
                  <span className="font-mono font-medium text-gray-700">{a.accountNumber}</span>
                </div>
                {a.rib && (
                  <div className="flex justify-between">
                    <span className="text-gray-400">RIB</span>
                    <span className="font-mono text-gray-500">{a.rib}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-400">Versements liés</span>
                  <span className={`font-semibold ${a._count.versements > 0 ? "text-green-600" : "text-gray-400"}`}>
                    {a._count.versements}
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900">{editing ? "Modifier le compte" : "Nouveau compte bancaire"}</h3>
              <button onClick={closeModal} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700">Station *</label>
                <select name="stationId" required defaultValue={editing?.station ? stations.find(s => s.name === editing.station.name)?.id : ""}
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400">
                  <option value="">Sélectionner...</option>
                  {stations.map((s) => <option key={s.id} value={s.id}>{s.name} ({s.code})</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700">Banque *</label>
                <select name="bankName" required defaultValue={editing?.bankName || ""}
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400">
                  <option value="">Sélectionner...</option>
                  {BANKS.map((b) => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700">Numéro de compte *</label>
                <input name="accountNumber" required defaultValue={editing?.accountNumber || ""}
                  placeholder="CI12345600001"
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400" />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700">RIB (optionnel)</label>
                <input name="rib" defaultValue={editing?.rib || ""}
                  placeholder="CI123 00001 12345600001 00"
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400" />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={closeModal}
                  className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-colors">
                  Annuler
                </button>
                <button type="submit" disabled={loading}
                  className="flex items-center gap-2 px-5 py-2 bg-[#0369A1] hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-semibold rounded-xl transition-colors">
                  {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                  {editing ? "Mettre à jour" : "Créer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
