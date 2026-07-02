"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2, Send } from "lucide-react";
import { toast } from "sonner";
import { createPurchaseOrder } from "../actions";

interface LineItem { description: string; quantity: number; unit: string; unitPrice: number; tva: number; }
interface DAOption { id: string; number: string; stationName: string; items: LineItem[]; }

function fmt(n: number) { return n.toLocaleString("fr-CI", { maximumFractionDigits: 0 }); }

export function NewCommandeClient({
  suppliers,
  approvedRequests,
  preSelectedDA,
}: {
  suppliers: { id: string; name: string }[];
  approvedRequests: DAOption[];
  preSelectedDA: string;
}) {
  const [requestId, setRequestId] = useState(preSelectedDA);
  const [items, setItems] = useState<LineItem[]>([{ description: "", quantity: 1, unit: "unité", unitPrice: 0, tva: 18 }]);
  const [loading, setLoading] = useState(false);

  function selectDA(id: string) {
    setRequestId(id);
    if (id) {
      const da = approvedRequests.find((r) => r.id === id);
      if (da) setItems(da.items.map((i) => ({ ...i })));
    }
  }

  function addItem() { setItems((p) => [...p, { description: "", quantity: 1, unit: "unité", unitPrice: 0, tva: 18 }]); }
  function removeItem(i: number) { setItems((p) => p.filter((_, idx) => idx !== i)); }
  function updateItem(i: number, key: keyof LineItem, val: string | number) {
    setItems((p) => p.map((item, idx) => idx === i ? { ...item, [key]: val } : item));
  }

  const totalHT = items.reduce((s, i) => s + i.quantity * i.unitPrice, 0);
  const totalTVA = items.reduce((s, i) => s + i.quantity * i.unitPrice * (i.tva / 100), 0);
  const totalTTC = totalHT + totalTVA;

  async function submit(form: HTMLFormElement) {
    const valid = items.every((i) => i.description.trim().length >= 2);
    if (!valid) { toast.error("Vérifiez les articles."); return; }
    setLoading(true);
    try {
      const fd = new FormData(form);
      fd.set("requestId", requestId);
      fd.set("items", JSON.stringify(items));
      await createPurchaseOrder(fd);
    } catch (err: any) {
      if (!err.message?.includes("NEXT_REDIRECT")) toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={(e) => { e.preventDefault(); submit(e.currentTarget); }}>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Informations BC</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1">
                <Label className="text-xs">Fournisseur *</Label>
                <Select name="supplierId" required>
                  <SelectTrigger><SelectValue placeholder="Choisir un fournisseur..." /></SelectTrigger>
                  <SelectContent>
                    {suppliers.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">DA liée (optionnel)</Label>
                <Select value={requestId} onValueChange={(v) => selectDA(v || "")}>
                  <SelectTrigger><SelectValue placeholder="Aucune" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Aucune</SelectItem>
                    {approvedRequests.map((r) => (
                      <SelectItem key={r.id} value={r.id}>{r.number} — {r.stationName}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Date livraison souhaitée</Label>
                  <Input name="expectedDelivery" type="date" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Délai paiement</Label>
                  <Input name="paymentTerms" defaultValue="30 jours" />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Note</Label>
                <Textarea name="note" rows={2} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Articles</CardTitle>
              <Button type="button" variant="outline" size="sm" onClick={addItem}><Plus className="w-3 h-3 mr-1" /> Ajouter</Button>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Description</TableHead>
                    <TableHead className="w-20">Qté</TableHead>
                    <TableHead className="w-20">Unité</TableHead>
                    <TableHead className="w-28">Prix HT</TableHead>
                    <TableHead className="w-16">TVA %</TableHead>
                    <TableHead className="w-28 text-right">TTC</TableHead>
                    <TableHead className="w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item, i) => (
                    <TableRow key={i}>
                      <TableCell><Input value={item.description} onChange={(e) => updateItem(i, "description", e.target.value)} className="text-sm" /></TableCell>
                      <TableCell><Input type="number" min="1" value={item.quantity} onChange={(e) => updateItem(i, "quantity", Number(e.target.value))} className="text-sm text-right" /></TableCell>
                      <TableCell><Input value={item.unit} onChange={(e) => updateItem(i, "unit", e.target.value)} className="text-sm" /></TableCell>
                      <TableCell><Input type="number" min="0" value={item.unitPrice} onChange={(e) => updateItem(i, "unitPrice", Number(e.target.value))} className="text-sm text-right" /></TableCell>
                      <TableCell><Input type="number" min="0" max="100" value={item.tva} onChange={(e) => updateItem(i, "tva", Number(e.target.value))} className="text-sm text-right" /></TableCell>
                      <TableCell className="text-right text-sm font-medium">{fmt(item.quantity * item.unitPrice * (1 + item.tva / 100))}</TableCell>
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
            <CardContent className="pt-6 space-y-2 text-sm">
              <div className="flex justify-between text-gray-500"><span>Total HT</span><span>{fmt(totalHT)} FCFA</span></div>
              <div className="flex justify-between text-gray-500"><span>TVA</span><span>{fmt(totalTVA)} FCFA</span></div>
              <div className="flex justify-between font-bold text-lg border-t pt-2"><span>Total TTC</span><span>{fmt(totalTTC)} FCFA</span></div>
              <Button type="submit" disabled={loading} className="w-full mt-4 bg-orange-400 hover:bg-orange-500">
                <Send className="w-4 h-4 mr-2" /> Créer le BC
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </form>
  );
}
