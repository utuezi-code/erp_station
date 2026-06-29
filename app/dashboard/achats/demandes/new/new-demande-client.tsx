"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2, Send } from "lucide-react";
import { toast } from "sonner";
import { createPurchaseRequest } from "../actions";

interface LineItem {
  description: string;
  quantity: number;
  unit: string;
  estimatedCost: number;
}

function fmt(n: number) { return n.toLocaleString("fr-CI", { maximumFractionDigits: 0 }); }

export function NewDemandeClient({
  stations,
  defaultStationId,
}: {
  stations: { id: string; name: string }[];
  defaultStationId: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [stationId, setStationId] = useState(defaultStationId);
  const [items, setItems] = useState<LineItem[]>([
    { description: "", quantity: 1, unit: "unité", estimatedCost: 0 },
  ]);

  function addItem() {
    setItems((p) => [...p, { description: "", quantity: 1, unit: "unité", estimatedCost: 0 }]);
  }
  function removeItem(i: number) { setItems((p) => p.filter((_, idx) => idx !== i)); }
  function updateItem(i: number, key: keyof LineItem, val: string | number) {
    setItems((p) => p.map((item, idx) => idx === i ? { ...item, [key]: val } : item));
  }

  const total = items.reduce((s, i) => s + i.quantity * i.estimatedCost, 0);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const valid = items.every((i) => i.description.trim().length >= 2 && i.quantity > 0);
    if (!valid) { toast.error("Vérifiez les articles."); return; }
    if (!stationId) { toast.error("Sélectionnez une station."); return; }
    setLoading(true);
    try {
      const fd = new FormData(e.currentTarget);
      fd.set("stationId", stationId);
      fd.set("items", JSON.stringify(items));
      const result = await createPurchaseRequest(fd);
      toast.success("Demande créée.");
      router.push(`/dashboard/achats/demandes/${result.id}`);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Informations générales</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Station *</Label>
                  <Select value={stationId} onValueChange={(v) => setStationId(v || "")}>
                    <SelectTrigger><SelectValue placeholder="Choisir..." /></SelectTrigger>
                    <SelectContent>
                      {stations.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Priorité</Label>
                  <Select name="priority" defaultValue="NORMAL">
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="URGENT">URGENT</SelectItem>
                      <SelectItem value="NORMAL">NORMAL</SelectItem>
                      <SelectItem value="FAIBLE">FAIBLE</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Service / Département *</Label>
                <Input name="service" required placeholder="Ex: Maintenance, Sécurité, Administratif..." />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Justification</Label>
                <Textarea name="justification" rows={3} placeholder="Expliquez le besoin..." />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Articles</CardTitle>
              <Button type="button" variant="outline" size="sm" onClick={addItem}>
                <Plus className="w-3 h-3 mr-1" /> Ajouter
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Description</TableHead>
                    <TableHead className="w-20">Qté</TableHead>
                    <TableHead className="w-20">Unité</TableHead>
                    <TableHead className="w-32">Coût estimé</TableHead>
                    <TableHead className="w-28 text-right">Total</TableHead>
                    <TableHead className="w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item, i) => (
                    <TableRow key={i}>
                      <TableCell><Input value={item.description} onChange={(e) => updateItem(i, "description", e.target.value)} className="text-sm" /></TableCell>
                      <TableCell><Input type="number" min="1" value={item.quantity} onChange={(e) => updateItem(i, "quantity", Number(e.target.value))} className="text-sm text-right" /></TableCell>
                      <TableCell><Input value={item.unit} onChange={(e) => updateItem(i, "unit", e.target.value)} className="text-sm" /></TableCell>
                      <TableCell><Input type="number" min="0" value={item.estimatedCost} onChange={(e) => updateItem(i, "estimatedCost", Number(e.target.value))} className="text-sm text-right" /></TableCell>
                      <TableCell className="text-right text-sm font-medium">{fmt(item.quantity * item.estimatedCost)}</TableCell>
                      <TableCell><Button type="button" variant="ghost" size="sm" onClick={() => removeItem(i)} className="text-red-400"><Trash2 className="w-3 h-3" /></Button></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        <div>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-gray-500">Coût total estimé</p>
              <p className="text-3xl font-bold">{fmt(total)}</p>
              <p className="text-xs text-gray-400 mb-4">FCFA</p>
              <Button type="submit" disabled={loading} className="w-full bg-orange-500 hover:bg-orange-600">
                <Send className="w-4 h-4 mr-2" /> Soumettre la demande
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </form>
  );
}
