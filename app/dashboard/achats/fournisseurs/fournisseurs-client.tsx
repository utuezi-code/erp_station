"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Edit, Power } from "lucide-react";
import { toast } from "sonner";
import { saveSupplier, toggleSupplierActive } from "./actions";

interface Supplier {
  id: string;
  name: string;
  code: string;
  category: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  contactName: string | null;
  paymentTerms: string | null;
  bankName: string | null;
  bankAccount: string | null;
  active: boolean;
  ordersCount: number;
}

export function FournisseursClient({ suppliers }: { suppliers: Supplier[] }) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Supplier | null>(null);
  const [loading, setLoading] = useState(false);

  function openCreate() { setEditing(null); setOpen(true); }
  function openEdit(s: Supplier) { setEditing(s); setOpen(true); }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    try {
      await saveSupplier(new FormData(e.currentTarget));
      toast.success(editing ? "Fournisseur mis à jour." : "Fournisseur créé.");
      setOpen(false);
    } catch (err: any) { toast.error(err.message); }
    finally { setLoading(false); }
  }

  async function handleToggle(s: Supplier) {
    await toggleSupplierActive(s.id, !s.active);
    toast.success(s.active ? "Désactivé." : "Réactivé.");
  }

  return (
    <div>
      <div className="flex justify-end mb-4">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger>
            <Button className="bg-orange-500 hover:bg-orange-600" onClick={openCreate}>
              <Plus className="w-4 h-4 mr-2" /> Nouveau fournisseur
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editing ? "Modifier" : "Nouveau fournisseur"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-3">
              {editing && <input type="hidden" name="id" value={editing.id} />}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Nom *</Label>
                  <Input name="name" required defaultValue={editing?.name} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Code *</Label>
                  <Input name="code" required defaultValue={editing?.code} />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Catégorie *</Label>
                <Input name="category" required defaultValue={editing?.category || "GENERAL"} placeholder="Ex: CARBURANT, LUBRIFIANTS, MAINTENANCE..." />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Contact</Label>
                <Input name="contactName" defaultValue={editing?.contactName || ""} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Email</Label>
                  <Input name="email" type="email" defaultValue={editing?.email || ""} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Téléphone</Label>
                  <Input name="phone" defaultValue={editing?.phone || ""} />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Adresse</Label>
                <Input name="address" defaultValue={editing?.address || ""} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Délai paiement</Label>
                  <Input name="paymentTerms" defaultValue={editing?.paymentTerms || "30 jours"} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Banque</Label>
                  <Input name="bankName" defaultValue={editing?.bankName || ""} />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Compte bancaire</Label>
                <Input name="bankAccount" defaultValue={editing?.bankAccount || ""} />
              </div>
              <Button type="submit" disabled={loading} className="w-full bg-orange-500 hover:bg-orange-600">
                {loading ? "Enregistrement..." : "Enregistrer"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Nom</TableHead>
                <TableHead>Catégorie</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Email</TableHead>
                <TableHead className="text-right">BC</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {suppliers.map((s) => (
                <TableRow key={s.id} className={s.active ? "" : "opacity-50"}>
                  <TableCell className="font-mono text-sm">{s.code}</TableCell>
                  <TableCell className="font-medium">{s.name}</TableCell>
                  <TableCell className="text-sm text-gray-500">{s.category}</TableCell>
                  <TableCell className="text-sm text-gray-500">{s.contactName || "—"}</TableCell>
                  <TableCell className="text-sm text-gray-500">{s.email || "—"}</TableCell>
                  <TableCell className="text-right">{s.ordersCount}</TableCell>
                  <TableCell>
                    <Badge className={s.active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}>
                      {s.active ? "Actif" : "Inactif"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" onClick={() => openEdit(s)}><Edit className="w-3 h-3" /></Button>
                      <Button variant="ghost" size="sm" onClick={() => handleToggle(s)}><Power className="w-3 h-3" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {suppliers.length === 0 && (
                <TableRow><TableCell colSpan={8} className="text-center text-gray-500 py-8">Aucun fournisseur.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
