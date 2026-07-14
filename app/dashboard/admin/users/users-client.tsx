"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Pencil, UserX } from "lucide-react";
import { createUser, updateUser, deleteUser } from "./actions";
import { toast } from "sonner";
import { ROLE_LABELS } from "@/lib/rbac";

const ROLES = [
  "ADMIN", "GERANT", "DIRECTION_COMMERCIALE", "DIRECTION_FINANCIERE",
  "DIRECTION_GENERALE", "RESPONSABLE_SERVICE",
] as const;

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  active: boolean;
  station: { id: string; name: string } | null;
}

interface Station {
  id: string;
  name: string;
}

export function UsersClientPage({ users, stations }: { users: User[]; stations: Station[] }) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);

  function openCreate() {
    setEditing(null);
    setOpen(true);
  }

  function openEdit(user: User) {
    setEditing(user);
    setOpen(true);
  }

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
        toast.success("Utilisateur créé.");
      }
      setOpen(false);
    } catch (err: any) {
      toast.error(err.message || "Une erreur est survenue.");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Désactiver cet utilisateur ?")) return;
    try {
      await deleteUser(id);
      toast.success("Utilisateur désactivé.");
    } catch (err: any) {
      toast.error(err.message);
    }
  }

  return (
    <>
      <div className="flex justify-end mb-4">
        <Button onClick={openCreate} className="bg-[#0369A1] hover:bg-blue-700">
          <Plus className="w-4 h-4 mr-2" /> Nouvel utilisateur
        </Button>
      </div>

      <div className="bg-white rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nom</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Rôle</TableHead>
              <TableHead>Station</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((u) => (
              <TableRow key={u.id}>
                <TableCell className="font-medium">{u.name}</TableCell>
                <TableCell>{u.email}</TableCell>
                <TableCell>
                  <Badge variant="outline">{ROLE_LABELS[u.role as keyof typeof ROLE_LABELS]}</Badge>
                </TableCell>
                <TableCell>{u.station?.name || "—"}</TableCell>
                <TableCell>
                  <Badge variant={u.active ? "default" : "secondary"}>
                    {u.active ? "Actif" : "Inactif"}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Button size="sm" variant="ghost" onClick={() => openEdit(u)}>
                    <Pencil className="w-4 h-4" />
                  </Button>
                  {u.active && (
                    <Button size="sm" variant="ghost" onClick={() => handleDelete(u.id)}>
                      <UserX className="w-4 h-4 text-red-500" />
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Modifier l'utilisateur" : "Nouvel utilisateur"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Nom complet</Label>
              <Input name="name" defaultValue={editing?.name} required />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input name="email" type="email" defaultValue={editing?.email} required />
            </div>
            <div className="space-y-2">
              <Label>{editing ? "Nouveau mot de passe (laisser vide pour ne pas changer)" : "Mot de passe"}</Label>
              <Input name="password" type="password" required={!editing} minLength={6} />
            </div>
            <div className="space-y-2">
              <Label>Rôle</Label>
              <Select name="role" defaultValue={editing?.role || "GERANT"}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLES.map((r) => (
                    <SelectItem key={r} value={r}>
                      {ROLE_LABELS[r]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Station (pour les gérants)</Label>
              <Select name="stationId" defaultValue={editing?.station?.id || ""}>
                <SelectTrigger>
                  <SelectValue placeholder="Aucune station" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Aucune station</SelectItem>
                  {stations.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {editing && (
              <input type="hidden" name="active" value={String(editing.active)} />
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
              <Button type="submit" disabled={loading} className="bg-[#0369A1] hover:bg-blue-700">
                {loading ? "Enregistrement..." : "Enregistrer"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
