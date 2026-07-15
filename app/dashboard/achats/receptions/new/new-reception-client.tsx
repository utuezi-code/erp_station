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

interface OrderItem { description: string; quantity: number; unit: string; unitPrice: number; tva: number; }
interface Order { id: string; number: string; supplierName: string; supplierId: string; items: OrderItem[]; }

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
  const [commentaireEcart, setCommentaireEcart] = useState("");
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
        unitPrice: item.unitPrice,
        tva: item.tva,
      }));
      fd.set("items", JSON.stringify(items));
      fd.set("supplierId", selectedOrder!.supplierId);
      if (commentaireEcart) fd.set("commentaireEcart", commentaireEcart);
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
          <>
            <Card>
              <CardHeader><CardTitle className="text-base">Quantités reçues</CardTitle></CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Article</TableHead>
                      <TableHead className="text-right">Commandé</TableHead>
                      <TableHead className="text-right w-36">Reçu</TableHead>
                      <TableHead className="text-center w-24">Écart</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedOrder.items.map((item, idx) => {
                      const recu = receivedQty[idx] ?? null;
                      const ecart = recu !== null ? recu - item.quantity : null;
                      return (
                        <TableRow key={idx}>
                          <TableCell>{item.description}</TableCell>
                          <TableCell className="text-right text-gray-500">{item.quantity} {item.unit}</TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              min="0"
                              value={recu ?? ""}
                              onChange={(e) => setQty(idx, Number(e.target.value))}
                              className="text-right w-full"
                            />
                          </TableCell>
                          <TableCell className="text-center text-sm font-medium">
                            {ecart !== null && ecart !== 0 && (
                              <span className={ecart < 0 ? "text-red-600" : "text-green-600"}>
                                {ecart > 0 ? "+" : ""}{ecart} {item.unit}
                              </span>
                            )}
                            {ecart === 0 && <span className="text-green-500">✓</span>}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Commentaire sur écart */}
            {Object.entries(receivedQty).some(([idx, qty]) => qty !== selectedOrder.items[Number(idx)]?.quantity) && (
              <Card className="border-orange-200 bg-orange-50">
                <CardHeader>
                  <CardTitle className="text-sm text-orange-800">Commentaire sur l'écart constaté</CardTitle>
                  <p className="text-xs text-orange-600">Des quantités diffèrent du bon de commande. Précisez le motif (article manquant, refusé, endommagé…).</p>
                </CardHeader>
                <CardContent>
                  <Textarea
                    value={commentaireEcart}
                    onChange={(e) => setCommentaireEcart(e.target.value)}
                    rows={3}
                    placeholder="Ex: 5 unités refusées car emballage endommagé. Fournisseur informé le …"
                    className="bg-white"
                  />
                </CardContent>
              </Card>
            )}

            {/* Résumé facture automatique */}
            <Card className="border-blue-200 bg-blue-50">
              <CardContent className="pt-4">
                <p className="text-xs font-semibold text-blue-700 mb-2">Facture générée automatiquement à la validation</p>
                {(() => {
                  let totalHT = 0;
                  let totalTVA = 0;
                  selectedOrder.items.forEach((item, idx) => {
                    const qty = receivedQty[idx] || 0;
                    const ht = qty * item.unitPrice;
                    totalHT += ht;
                    totalTVA += ht * (item.tva / 100);
                  });
                  return (
                    <div className="grid grid-cols-3 gap-2 text-sm">
                      <div><p className="text-xs text-blue-500">Total HT</p><p className="font-bold text-blue-800">{totalHT.toLocaleString("fr-CI")} FCFA</p></div>
                      <div><p className="text-xs text-blue-500">TVA</p><p className="font-bold text-blue-800">{totalTVA.toLocaleString("fr-CI")} FCFA</p></div>
                      <div><p className="text-xs text-blue-500">Total TTC</p><p className="font-bold text-blue-800">{(totalHT + totalTVA).toLocaleString("fr-CI")} FCFA</p></div>
                    </div>
                  );
                })()}
              </CardContent>
            </Card>
          </>
        )}

        <Button type="submit" disabled={loading || !orderId} className="bg-[#0369A1] hover:bg-blue-700">
          <Save className="w-4 h-4 mr-2" /> Enregistrer la réception et générer la facture
        </Button>
      </div>
    </form>
  );
}
