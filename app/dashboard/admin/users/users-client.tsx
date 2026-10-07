"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Pencil, UserX, Shield, History, Eye, EyeOff, UserCheck, ChevronDown, ChevronRight } from "lucide-react";
import { createUser, updateUser, deleteUser } from "./actions";
import { toast } from "sonner";
import { ROLE_LABELS } from "@/lib/rbac";

const ROLES = [
  "ADMIN", "DIRECTION_GENERALE", "DIRECTION_COMMERCIALE",
  "DIRECTION_FINANCIERE", "RESPONSABLE_SERVICE", "GERANT",
] as const;

const DIRECTION_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  ADMIN:                 { bg: "bg-slate-50",   text: "text-slate-700",  border: "border-slate-200" },
  DIRECTION_GENERALE:    { bg: "bg-purple-50",  text: "text-purple-700", border: "border-purple-200" },
  DIRECTION_COMMERCIALE: { bg: "bg-blue-50",    text: "text-blue-700",   border: "border-blue-200" },
  DIRECTION_FINANCIERE:  { bg: "bg-amber-50",   text: "text-amber-700",  border: "border-amber-200" },
  RESPONSABLE_SERVICE:   { bg: "bg-teal-50",    text: "text-teal-700",   border: "border-teal-200" },
  GERANT:                { bg: "bg-green-50",   text: "text-green-700",  border: "border-green-200" },
};

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  active: boolean;
  createdAt: string;
  station: { id: string; name: string } | null;
  _count?: { auditLogs: number };
}

interface Station { id: string; name: string }

export function UsersClientPage({ users, stations }: { users: User[]; stations: Station[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [search, setSearch] = useState("");

  function openCreate() { setEditing(null); setShowPassword(false); setOpen(true); }
  function openEdit(u: User) { setEditing(u); setShowPassword(false); setOpen(true); }
  function toggleDir(dir: string) { setCollapsed((c) => ({ ...c, [dir]: !c[dir] })); }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    try {
      if (editing) {
        await updateUser(editing.id, fd);
        toast.success("Utilisateur mis à jour.");
      } else {
        await createUser(fd);
        toast.success("Utilisateur créé avec succès.");
      }
      setOpen(false);
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "Une erreur est survenue.");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Désactiver le compte de ${name} ?`)) return;
    try {
      await deleteUser(id);
      toast.success("Compte désactivé.");
      router.refresh();
    } catch (err: any) {
      toast.error(err.message);
    }
  }

  // Group by role/direction
  const filtered = users.filter((u) =>
    !search || u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase())
  );

  const groups = ROLES.map((role) => ({
    role,
    users: filtered.filter((u) => u.role === role),
  })).filter((g) => g.users.length > 0);

  const activeCount = users.filter((u) => u.active).length;

  return (
    <>
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-[#0369A1]/10">
            <Shield className="w-5 h-5 text-[#0369A1]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Gestion des utilisateurs</h1>
            <p className="text-sm text-gray-400">{activeCount} compte{activeCount > 1 ? "s" : ""} actif{activeCount > 1 ? "s" : ""} · {users.length} au total</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Input
            placeholder="Rechercher un employé..."
            className="w-56 h-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Button onClick={openCreate} className="bg-[#0369A1] hover:bg-blue-700 h-9">
            <Plus className="w-4 h-4 mr-2" /> Nouvel employé
          </Button>
        </div>
      </div>

      {/* Groups by direction */}
      <div className="space-y-4">
        {groups.map(({ role, users: groupUsers }) => {
          const colors = DIRECTION_COLORS[role] || DIRECTION_COLORS.GERANT;
          const isCollapsed = collapsed[role];
          const activeInGroup = groupUsers.filter((u) => u.active).length;
          return (
            <div key={role} className={`rounded-xl border ${colors.border} overflow-hidden`}>
              {/* Group header */}
              <button
                className={`w-full flex items-center justify-between px-4 py-3 ${colors.bg} hover:brightness-95 transition-all`}
                onClick={() => toggleDir(role)}
              >
                <div className="flex items-center gap-3">
                  {isCollapsed ? <ChevronRight className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                  <span className={`font-semibold text-sm ${colors.text}`}>
                    {ROLE_LABELS[role as keyof typeof ROLE_LABELS] || role}
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${colors.bg} ${colors.text} border ${colors.border}`}>
                    {activeInGroup} actif{activeInGroup > 1 ? "s" : ""} / {groupUsers.length}
                  </span>
                </div>
                <span className="text-xs text-gray-400">Mêmes droits d'accès</span>
              </button>

              {!isCollapsed && (
                <div className="divide-y divide-gray-50">
                  {groupUsers.map((u) => (
                    <div key={u.id} className={`flex items-center gap-4 px-5 py-3 bg-white hover:bg-gray-50 transition-colors ${!u.active ? "opacity-50" : ""}`}>
                      {/* Avatar */}
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${colors.bg} ${colors.text}`}>
                        {u.name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase()}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm text-gray-900">{u.name}</span>
                          {!u.active && <Badge className="bg-red-100 text-red-600 text-xs py-0">Inactif</Badge>}
                        </div>
                        <div className="text-xs text-gray-400 truncate">{u.email}</div>
                        {u.station && <div className="text-xs text-gray-400">Station : {u.station.name}</div>}
                      </div>

                      {/* Meta */}
                      <div className="text-right text-xs text-gray-400 hidden lg:block">
                        <div className="text-gray-300">Créé le {new Date(u.createdAt).toLocaleDateString("fr-CI")}</div>
                        {u._count && u._count.auditLogs > 0 && (
                          <div className="text-blue-400">{u._count.auditLogs} action{u._count.auditLogs > 1 ? "s" : ""} enregistrée{u._count.auditLogs > 1 ? "s" : ""}</div>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <Button
                          size="sm" variant="ghost"
                          className="h-8 w-8 p-0 text-gray-400 hover:text-blue-600"
                          title="Voir les actions de cet employé"
                          onClick={() => router.push(`/dashboard/admin/audit?userId=${u.id}`)}
                        >
                          <History className="w-3.5 h-3.5" />
                        </Button>
                        <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-gray-400 hover:text-gray-700" onClick={() => openEdit(u)}>
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        {u.active && (
                          <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-gray-300 hover:text-red-500" onClick={() => handleDelete(u.id, u.name)}>
                            <UserX className="w-3.5 h-3.5" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {groups.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            <UserCheck className="w-10 h-10 mx-auto mb-3 text-gray-200" />
            <p>Aucun utilisateur trouvé</p>
          </div>
        )}
      </div>

      {/* Dialog création / édition */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {editing ? <><Pencil className="w-4 h-4" /> Modifier le profil</> : <><Plus className="w-4 h-4" /> Nouvel employé</>}
            </DialogTitle>
            {editing && (
              <p className="text-sm text-gray-500 mt-1">
                Les droits d'accès sont déterminés par la direction assignée.
              </p>
            )}
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">

            {/* Identité */}
            <div className="rounded-xl bg-gray-50 border border-gray-100 p-4 space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Identité</p>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Nom complet *</Label>
                <Input name="name" defaultValue={editing?.name} required placeholder="ex: Kouassi Amara" className="h-10" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Adresse email *</Label>
                <Input name="email" type="email" defaultValue={editing?.email} required placeholder="prenom.nom@ivoryenergies.ci" className="h-10" />
              </div>
            </div>

            {/* Direction & droits */}
            <div className="rounded-xl bg-gray-50 border border-gray-100 p-4 space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Direction & droits</p>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Direction assignée *</Label>
                <Select name="role" defaultValue={editing?.role || "DIRECTION_COMMERCIALE"}>
                  <SelectTrigger className="h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLES.map((r) => (
                      <SelectItem key={r} value={r}>
                        {ROLE_LABELS[r as keyof typeof ROLE_LABELS]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-[11px] text-gray-400">Tous les employés d'une même direction ont les mêmes droits d'accès.</p>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Station rattachée (gérants)</Label>
                <Select name="stationId" defaultValue={editing?.station?.id || ""}>
                  <SelectTrigger className="h-10">
                    <SelectValue placeholder="Aucune station (siège)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Aucune station (siège)</SelectItem>
                    {stations.map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Sécurité */}
            <div className="rounded-xl bg-gray-50 border border-gray-100 p-4 space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Sécurité</p>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">
                  {editing ? "Nouveau mot de passe (laisser vide pour ne pas changer)" : "Mot de passe *"}
                </Label>
                <div className="relative">
                  <Input
                    name="password"
                    type={showPassword ? "text" : "password"}
                    required={!editing}
                    minLength={6}
                    className="h-10 pr-10"
                    placeholder={editing ? "••••••••" : "6 caractères minimum"}
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    onClick={() => setShowPassword((v) => !v)}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              {editing && (
                <div className="flex items-center gap-2">
                  <input type="hidden" name="active" value={String(editing.active)} />
                  <button
                    type="button"
                    className={`text-xs flex items-center gap-1.5 px-3 py-1.5 rounded-lg border transition-colors ${editing.active ? "border-red-200 text-red-600 hover:bg-red-50" : "border-green-200 text-green-600 hover:bg-green-50"}`}
                    onClick={() => {
                      const fd = new FormData();
                      fd.set("name", editing.name);
                      fd.set("email", editing.email);
                      fd.set("role", editing.role);
                      fd.set("stationId", editing.station?.id || "");
                      fd.set("active", String(!editing.active));
                      setLoading(true);
                      updateUser(editing.id, fd)
                        .then(() => { toast.success(`Compte ${editing.active ? "désactivé" : "réactivé"}.`); setOpen(false); router.refresh(); })
                        .catch((e) => toast.error(e.message))
                        .finally(() => setLoading(false));
                    }}
                  >
                    {editing.active ? <UserX className="w-3 h-3" /> : <UserCheck className="w-3 h-3" />}
                    {editing.active ? "Désactiver ce compte" : "Réactiver ce compte"}
                  </button>
                </div>
              )}
            </div>

            <DialogFooter className="gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
              <Button type="submit" disabled={loading} className="bg-[#0369A1] hover:bg-blue-700">
                {loading ? "Enregistrement..." : editing ? "Mettre à jour" : "Créer le compte"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
