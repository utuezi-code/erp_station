"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Pencil } from "lucide-react";
import { createFuel, updateFuel } from "./actions";
import { toast } from "sonner";

interface Fuel {
  id: string;
  name: string;
  code: string;
  salePrice: any;
  purchasePrice: any;
  margin: any;
  tva: any;
  unit: string;
  active: boolean;
}

function fmt(n: any) {
  return Number(n).toLocaleString("fr-CI", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

export function FuelsClientPage({ fuels }: { fuels: Fuel[] }) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Fuel | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    try {
      if (editing) {
        await updateFuel(editing.id, fd);
        toast.success("Carburant mis à jour.");
      } else {
        await createFuel(fd);
        toast.success("Carburant créé.");
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
        <Button onClick={() => { setEditing(null); setOpen(true); }} className="bg-orange-400 hover:bg-orange-500">
          <Plus className="w-4 h-4 mr-2" /> Nouveau carburant
        </Button>
      </div>

      <div className="bg-white rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Produit</TableHead>
              <TableHead>Code</TableHead>
              <TableHead>Unité</TableHead>
              <TableHead className="text-right">Prix achat (FCFA)</TableHead>
              <TableHead className="text-right">Prix vente (FCFA)</TableHead>
              <TableHead className="text-right">Marge (FCFA)</TableHead>
              <TableHead className="text-right">TVA %</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {fuels.map((f) => (
              <TableRow key={f.id}>
                <TableCell className="font-medium">{f.name}</TableCell>
                <TableCell><code className="text-xs bg-gray-100 px-1 py-0.5 rounded">{f.code}</code></TableCell>
                <TableCell>{f.unit}</TableCell>
                <TableCell className="text-right">{fmt(f.purchasePrice)}</TableCell>
                <TableCell className="text-right font-medium">{fmt(f.salePrice)}</TableCell>
                <TableCell className="text-right text-green-600">{fmt(f.margin)}</TableCell>
                <TableCell className="text-right">{Number(f.tva)}%</TableCell>
                <TableCell>
                  <Badge variant={f.active ? "default" : "secondary"}>
                    {f.active ? "Actif" : "Inactif"}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Button size="sm" variant="ghost" onClick={() => { setEditing(f); setOpen(true); }}>
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
            <DialogTitle>{editing ? "Modifier le carburant" : "Nouveau carburant"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nom</Label>
                <Input name="name" defaultValue={editing?.name} placeholder="Super" required />
              </div>
              <div className="space-y-2">
                <Label>Code</Label>
                <Input name="code" defaultValue={editing?.code} placeholder="SP95" required />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Prix d'achat (FCFA)</Label>
                <Input name="purchasePrice" type="number" step="1" defaultValue={editing ? Number(editing.purchasePrice) : ""} required />
              </div>
              <div className="space-y-2">
                <Label>Prix de vente (FCFA)</Label>
                <Input name="salePrice" type="number" step="1" defaultValue={editing ? Number(editing.salePrice) : ""} required />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>TVA (%)</Label>
                <Input name="tva" type="number" step="0.1" defaultValue={editing ? Number(editing.tva) : 18} required />
              </div>
              <div className="space-y-2">
                <Label>Unité</Label>
                <Input name="unit" defaultValue={editing?.unit || "litre"} required />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
              <Button type="submit" disabled={loading} className="bg-orange-400 hover:bg-orange-500">
                {loading ? "Enregistrement..." : "Enregistrer"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
