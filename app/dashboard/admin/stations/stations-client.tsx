"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Pencil, Building2 } from "lucide-react";
import { createStation, updateStation } from "./actions";
import { toast } from "sonner";

interface Station {
  id: string;
  name: string;
  code: string;
  address: string | null;
  city: string | null;
  status: string;
  region: { id: string; name: string } | null;
  _count: { users: number; pumps: number; tanks: number };
}

interface Region {
  id: string;
  name: string;
}

export function StationsClientPage({ stations, regions }: { stations: Station[]; regions: Region[] }) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Station | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    try {
      if (editing) {
        await updateStation(editing.id, fd);
        toast.success("Station mise à jour.");
      } else {
        await createStation(fd);
        toast.success("Station créée.");
      }
      setOpen(false);
    } catch (err: any) {
      toast.error(err.message || "Erreur.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <div className="flex justify-end mb-4">
        <Button onClick={() => { setEditing(null); setOpen(true); }} className="bg-orange-500 hover:bg-orange-600">
          <Plus className="w-4 h-4 mr-2" /> Nouvelle station
        </Button>
      </div>

      <div className="bg-white rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Station</TableHead>
              <TableHead>Code</TableHead>
              <TableHead>Ville</TableHead>
              <TableHead>Région</TableHead>
              <TableHead>Pompes</TableHead>
              <TableHead>Cuves</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {stations.map((s) => (
              <TableRow key={s.id}>
                <TableCell className="font-medium flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-orange-500" /> {s.name}
                </TableCell>
                <TableCell><code className="text-xs bg-gray-100 px-1 py-0.5 rounded">{s.code}</code></TableCell>
                <TableCell>{s.city || "—"}</TableCell>
                <TableCell>{s.region?.name || "—"}</TableCell>
                <TableCell>{s._count.pumps}</TableCell>
                <TableCell>{s._count.tanks}</TableCell>
                <TableCell>
                  <Badge variant={s.status === "ACTIVE" ? "default" : "secondary"}>
                    {s.status === "ACTIVE" ? "Active" : "Suspendue"}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Button size="sm" variant="ghost" onClick={() => { setEditing(s); setOpen(true); }}>
                    <Pencil className="w-4 h-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Modifier la station" : "Nouvelle station"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nom de la station</Label>
                <Input name="name" defaultValue={editing?.name} required />
              </div>
              <div className="space-y-2">
                <Label>Code</Label>
                <Input name="code" defaultValue={editing?.code} placeholder="ST001" required />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Adresse</Label>
              <Input name="address" defaultValue={editing?.address || ""} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Ville</Label>
                <Input name="city" defaultValue={editing?.city || ""} />
              </div>
              <div className="space-y-2">
                <Label>Région</Label>
                <Select name="regionId" defaultValue={editing?.region?.id || ""}>
                  <SelectTrigger><SelectValue placeholder="Choisir..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Aucune</SelectItem>
                    {regions.map((r) => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {editing && (
              <div className="space-y-2">
                <Label>Statut</Label>
                <Select name="status" defaultValue={editing.status}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ACTIVE">Active</SelectItem>
                    <SelectItem value="SUSPENDED">Suspendue</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
              <Button type="submit" disabled={loading} className="bg-orange-500 hover:bg-orange-600">
                {loading ? "Enregistrement..." : "Enregistrer"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
