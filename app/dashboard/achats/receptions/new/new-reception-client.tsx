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
import { Save } from "lucide-react";
import { toast } from "sonner";
import { createReceipt } from "./actions";

interface OrderItem { description: string; quantity: number; unit: string; }
interface Order { id: string; number: string; supplierName: string; items: OrderItem[]; }

export function NewReceptionClient({
  orders,
  stations,
  preSelectedOrderId,
}: {
  orders: Order[];
  stations: { id: string; name: string }[];
  preSelectedOrderId: string;
}) {
  const router = useRouter();
  const [orderId, setOrderId] = useState(preSelectedOrderId);
  const [stationId, setStationId] = useState("");
  const [receivedQty, setReceivedQty] = useState<Record<number, number>>({});
  const [loading, setLoading] = useState(false);

  const selectedOrder = orders.find((o) => o.id === orderId);

  function selectOrder(id: string) {
    setOrderId(id);
    setReceivedQty({});
  }

  function setQty(idx: number, qty: number) {
    setReceivedQty((p) => ({ ...p, [idx]: qty }));
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!orderId) { toast.error("Sélectionnez un bon de commande."); return; }
    if (!stationId) { toast.error("Sélectionnez une station."); return; }
    const hasQty = Object.values(receivedQty).some((q) => q > 0);
    if (!hasQty) { toast.error("Saisissez au moins une quantité reçue."); return; }

    setLoading(true);
    try {
      const fd = new FormData(e.currentTarget);
      fd.set("orderId", orderId);
      fd.set("stationId", stationId);
      const items = selectedOrder!.items.map((item, idx) => ({
        description: item.description,
        quantityOrdered: item.quantity,
        quantityReceived: receivedQty[idx] || 0,
        unit: item.unit,
      }));
      fd.set("items", JSON.stringify(items));
      await createReceipt(fd);
      toast.success("Réception enregistrée.");
      router.push(`/dashboard/achats/commandes/${orderId}`);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="space-y-4 max-w-2xl">
        <Card>
          <CardHeader><CardTitle className="text-base">Informations réception</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs">Bon de commande *</Label>
              <Select value={orderId} onValueChange={(v) => selectOrder(v || "")}>
                <SelectTrigger><SelectValue placeholder="Choisir un BC..." /></SelectTrigger>
                <SelectContent>
                  {orders.map((o) => (
                    <SelectItem key={o.id} value={o.id}>{o.number} — {o.supplierName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Station destinataire *</Label>
              <Select value={stationId} onValueChange={(v) => setStationId(v || "")}>
                <SelectTrigger><SelectValue placeholder="Choisir une station..." /></SelectTrigger>
                <SelectContent>
                  {stations.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Date réception *</Label>
                <Input name="receiptDate" type="date" defaultValue={new Date().toISOString().split("T")[0]} required />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">N° BL fournisseur</Label>
                <Input name="blNumber" placeholder="BL-XXXX" />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Observations</Label>
              <Textarea name="observations" rows={2} />
            </div>
          </CardContent>
        </Card>

        {selectedOrder && (
          <Card>
            <CardHeader><CardTitle className="text-base">Quantités reçues</CardTitle></CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Article</TableHead>
                    <TableHead className="text-right">Commandé</TableHead>
                    <TableHead className="text-right w-36">Reçu</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {selectedOrder.items.map((item, idx) => (
                    <TableRow key={idx}>
                      <TableCell>{item.description}</TableCell>
                      <TableCell className="text-right">{item.quantity} {item.unit}</TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min="0"
                          max={item.quantity}
                          value={receivedQty[idx] ?? ""}
                          onChange={(e) => setQty(idx, Number(e.target.value))}
                          className="text-right w-full"
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        <Button type="submit" disabled={loading || !orderId} className="bg-orange-500 hover:bg-orange-600">
          <Save className="w-4 h-4 mr-2" /> Enregistrer la réception
        </Button>
      </div>
    </form>
  );
}
