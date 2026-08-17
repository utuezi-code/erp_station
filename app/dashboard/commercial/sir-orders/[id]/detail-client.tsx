"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle, FileText, CreditCard, Truck, Send } from "lucide-react";
import { toast } from "sonner";
import { sendSIROrder, recordSIROffer, recordSIRPayment, recordDeliveryOrder } from "../actions";
import { useRouter } from "next/navigation";

function fmt(n: any) { return Number(n || 0).toLocaleString("fr-CI", { maximumFractionDigits: 0 }); }

const STATUS: Record<string, { label: string; color: string }> = {
  BROUILLON: { label: "Brouillon", color: "bg-gray-100 text-gray-600" },
  ENVOYE: { label: "Envoyé à SIR", color: "bg-blue-100 text-blue-700" },
  OFFRE_RECUE: { label: "Offre reçue", color: "bg-purple-100 text-purple-700" },
  PAYE: { label: "Payé", color: "bg-yellow-100 text-yellow-700" },
  LIVRE: { label: "Livré — GESTOCI", color: "bg-green-100 text-green-700" },
  ANNULE: { label: "Annulé", color: "bg-red-100 text-red-700" },
};

interface SIROrder {
  id: string;
  number: string;
  version: number;
  status: string;
  createdAt: string;
  sentAt: string | null;
  note: string | null;
  user: { name: string };
  supplier: { name: string; email: string | null } | null;
  items: { id: string; quantityM15: number; unitPrice: number; totalAmount: number; fuel: { id: string; name: string; code: string } }[];
  offers: { id: string; offerNumber: string | null; pdfUrl: string | null; validFrom: string | null; validTo: string | null; totalAmount: number | null; note: string | null }[];
  payments: { id: string; beneficiary: string; checkNumber: string; bankName: string | null; amount: number; paidAt: string; note: string | null; user: { name: string } }[];
  deliveryOrders: {
    id: string; reference: string | null; depotName: string | null; deliveryDate: string | null; note: string | null;
    gestociEntries: { id: string; quantityM15: number; fuel: { name: string; code: string } }[];
  }[];
}

export function SIROrderDetailClient({ order, role }: { order: SIROrder; role: string }) {
  const router = useRouter();
  const isDC = role === "DIRECTION_COMMERCIALE";
  const isDF = role === "DIRECTION_FINANCIERE";
  const isAdmin = role === "ADMIN";

  const [loading, setLoading] = useState(false);
  const [showOffer, setShowOffer] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [showDelivery, setShowDelivery] = useState(false);

  // Offer form
  const [offerNum, setOfferNum] = useState("");
  const [offerValidFrom, setOfferValidFrom] = useState("");
  const [offerValidTo, setOfferValidTo] = useState("");
  const [offerTotal, setOfferTotal] = useState("");
  const [offerNote, setOfferNote] = useState("");

  // Payment form
  const [payBenef, setPayBenef] = useState("SIR");
  const [payCheck, setPayCheck] = useState("");
  const [payBank, setPayBank] = useState("");
  const [payAmount, setPayAmount] = useState("");
  const [payDate, setPayDate] = useState(new Date().toISOString().slice(0, 10));
  const [payNote, setPayNote] = useState("");

  // Delivery form
  const [dlRef, setDlRef] = useState("");
  const [dlDepot, setDlDepot] = useState("GESTOCI");
  const [dlDate, setDlDate] = useState(new Date().toISOString().slice(0, 10));
  const [dlNote, setDlNote] = useState("");
  const [dlEntries, setDlEntries] = useState<{ fuelId: string; quantityM15: string }[]>(
    order.items.map((i) => ({ fuelId: i.fuel.id, quantityM15: String(i.quantityM15) }))
  );

  const total = order.items.reduce((s, i) => s + Number(i.totalAmount), 0);
  const paid = order.payments.reduce((s, p) => s + Number(p.amount), 0);

  async function doSend() {
    setLoading(true);
    const r = await sendSIROrder(order.id);
    setLoading(false);
    if (r.success) { toast.success("BC marqué comme envoyé à SIR."); router.refresh(); }
    else toast.error("Erreur.");
  }

  async function doOffer() {
    setLoading(true);
    const r = await recordSIROffer({
      sirOrderId: order.id,
      offerNumber: offerNum || undefined,
      validFrom: offerValidFrom || undefined,
      validTo: offerValidTo || undefined,
      totalAmount: offerTotal ? Number(offerTotal) : undefined,
      note: offerNote || undefined,
    });
    setLoading(false);
    if (r.success) { toast.success("Offre SIR enregistrée."); setShowOffer(false); router.refresh(); }
    else toast.error("Erreur.");
  }

  async function doPayment() {
    if (!payCheck || !payAmount || !payDate) { toast.error("Numéro de chèque, montant et date requis."); return; }
    setLoading(true);
    const r = await recordSIRPayment({
      sirOrderId: order.id,
      beneficiary: payBenef,
      checkNumber: payCheck,
      bankName: payBank || undefined,
      amount: Number(payAmount),
      paidAt: payDate,
      note: payNote || undefined,
    });
    setLoading(false);
    if (r.success) { toast.success("Paiement enregistré."); setShowPayment(false); setPayCheck(""); setPayAmount(""); setPayNote(""); router.refresh(); }
    else toast.error("Erreur.");
  }

  async function doDelivery() {
    setLoading(true);
    const entries = dlEntries.filter((e) => Number(e.quantityM15) > 0).map((e) => ({ fuelId: e.fuelId, quantityM15: Number(e.quantityM15) }));
    if (entries.length === 0) { toast.error("Au moins une ligne de quantité requise."); setLoading(false); return; }
    const r = await recordDeliveryOrder({
      sirOrderId: order.id,
      reference: dlRef || undefined,
      depotName: dlDepot || undefined,
      deliveryDate: dlDate || undefined,
      note: dlNote || undefined,
      entries,
    });
    setLoading(false);
    if (r.success) { toast.success("Ordre de livraison enregistré. Stock GESTOCI mis à jour."); setShowDelivery(false); router.refresh(); }
    else toast.error("Erreur.");
  }

  return (
    <div>
      <div className="mb-6 flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-400">Bon de commande SIR</p>
          <h1 className="text-2xl font-bold text-gray-900">
            {order.number}
            {order.version > 1 && <span className="ml-2 text-base text-amber-600 font-medium">(version {order.version})</span>}
          </h1>
          <p className="text-gray-500 mt-1">
            Par {order.user.name} · {new Date(order.createdAt).toLocaleDateString("fr-CI")}
            {order.supplier && ` · Fournisseur : ${order.supplier.name}`}
          </p>
        </div>
        <Badge className={`text-sm ${STATUS[order.status]?.color ?? ""}`}>{STATUS[order.status]?.label}</Badge>
      </div>

      {/* Actions rapides */}
      <div className="flex flex-wrap gap-2 mb-6">
        {(isDC || isAdmin) && order.status === "BROUILLON" && (
          <Button className="bg-blue-600 hover:bg-blue-700" disabled={loading} onClick={doSend}>
            <Send className="w-4 h-4 mr-2" /> Marquer envoyé à SIR
          </Button>
        )}
        {(isDC || isAdmin) && ["ENVOYE", "OFFRE_RECUE"].includes(order.status) && (
          <Button variant="outline" className="border-purple-300 text-purple-700 hover:bg-purple-50" onClick={() => setShowOffer(true)}>
            <FileText className="w-4 h-4 mr-2" /> Enregistrer offre SIR
          </Button>
        )}
        {(isDF || isAdmin) && ["OFFRE_RECUE", "ENVOYE"].includes(order.status) && (
          <Button variant="outline" className="border-yellow-400 text-yellow-700 hover:bg-yellow-50" onClick={() => setShowPayment(true)}>
            <CreditCard className="w-4 h-4 mr-2" /> Enregistrer un chèque
          </Button>
        )}
        {(isDF || isAdmin) && order.status === "PAYE" && (
          <Button variant="outline" className="border-yellow-400 text-yellow-700 hover:bg-yellow-50" onClick={() => setShowPayment(true)}>
            <CreditCard className="w-4 h-4 mr-2" /> Ajouter un chèque
          </Button>
        )}
        {(isDC || isAdmin) && ["PAYE", "OFFRE_RECUE"].includes(order.status) && (
          <Button className="bg-green-600 hover:bg-green-700" onClick={() => setShowDelivery(true)}>
            <Truck className="w-4 h-4 mr-2" /> Enregistrer ordre de livraison
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          {/* Articles */}
          <Card>
            <CardHeader><CardTitle className="text-sm">Articles commandés</CardTitle></CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Produit</TableHead>
                    <TableHead className="text-right">Qté M15</TableHead>
                    <TableHead className="text-right">P.U. (FCFA)</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {order.items.map((i) => (
                    <TableRow key={i.id}>
                      <TableCell>{i.fuel.name} ({i.fuel.code})</TableCell>
                      <TableCell className="text-right">{fmt(i.quantityM15)}</TableCell>
                      <TableCell className="text-right">{fmt(i.unitPrice)}</TableCell>
                      <TableCell className="text-right font-medium">{fmt(i.totalAmount)} FCFA</TableCell>
                    </TableRow>
                  ))}
                  <TableRow>
                    <TableCell colSpan={3} className="text-right font-bold">Total</TableCell>
                    <TableCell className="text-right font-bold">{fmt(total)} FCFA</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Offres SIR */}
          {order.offers.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-sm flex items-center gap-2"><FileText className="w-4 h-4 text-purple-500" />Offres SIR reçues</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {order.offers.map((o, idx) => (
                  <div key={o.id} className="bg-purple-50 border border-purple-100 rounded-lg px-3 py-2 text-sm">
                    <p className="font-semibold text-purple-700">Offre {o.offerNumber ? `n°${o.offerNumber}` : `#${idx + 1}`}</p>
                    {o.validFrom && o.validTo && (
                      <p className="text-purple-600 text-xs">Validité : {new Date(o.validFrom).toLocaleDateString("fr-CI")} → {new Date(o.validTo).toLocaleDateString("fr-CI")}</p>
                    )}
                    {o.totalAmount && <p className="text-purple-700">Montant offre : {fmt(o.totalAmount)} FCFA</p>}
                    {o.note && <p className="text-gray-500 mt-1">{o.note}</p>}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Paiements */}
          {order.payments.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center justify-between">
                  <span className="flex items-center gap-2"><CreditCard className="w-4 h-4 text-yellow-500" />Paiements par chèque</span>
                  <span className={`text-sm font-bold ${paid >= total ? "text-green-600" : "text-amber-600"}`}>{fmt(paid)} / {fmt(total)} FCFA</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Bénéficiaire</TableHead>
                      <TableHead>N° Chèque</TableHead>
                      <TableHead>Banque</TableHead>
                      <TableHead className="text-right">Montant</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Par</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {order.payments.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell className="font-medium">{p.beneficiary}</TableCell>
                        <TableCell className="font-mono text-sm">{p.checkNumber}</TableCell>
                        <TableCell className="text-sm text-gray-500">{p.bankName || "—"}</TableCell>
                        <TableCell className="text-right">{fmt(p.amount)} FCFA</TableCell>
                        <TableCell className="text-sm text-gray-400">{new Date(p.paidAt).toLocaleDateString("fr-CI")}</TableCell>
                        <TableCell className="text-sm text-gray-400">{p.user.name}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {/* Ordres de livraison */}
          {order.deliveryOrders.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Truck className="w-4 h-4 text-green-500" />Ordres de livraison GESTOCI</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                {order.deliveryOrders.map((dl) => (
                  <div key={dl.id} className="border rounded-lg p-3 space-y-2">
                    <div className="flex items-center gap-3 text-sm">
                      <span className="font-semibold">Réf. {dl.reference || "—"}</span>
                      <span className="text-gray-500">{dl.depotName}</span>
                      {dl.deliveryDate && <span className="text-gray-400">{new Date(dl.deliveryDate).toLocaleDateString("fr-CI")}</span>}
                    </div>
                    <div className="space-y-1">
                      {dl.gestociEntries.map((e) => (
                        <div key={e.id} className="flex justify-between text-sm bg-green-50 rounded px-2 py-1">
                          <span className="font-medium">{e.fuel.name} ({e.fuel.code})</span>
                          <span className="text-green-700 font-semibold">+{fmt(e.quantityM15)} M15</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Résumé statut */}
        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-sm">Résumé</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <Step done={true} label="BC créé" />
              <Step done={["ENVOYE","OFFRE_RECUE","PAYE","LIVRE"].includes(order.status)} label="Envoyé à SIR" active={order.status === "BROUILLON"} />
              <Step done={["OFFRE_RECUE","PAYE","LIVRE"].includes(order.status)} label="Offre SIR reçue" active={order.status === "ENVOYE"} />
              <Step done={["PAYE","LIVRE"].includes(order.status)} label="Paiement effectué" active={order.status === "OFFRE_RECUE"} />
              <Step done={order.status === "LIVRE"} label="Livré — stock GESTOCI" active={order.status === "PAYE"} />
            </CardContent>
          </Card>
          {order.note && (
            <Card>
              <CardHeader><CardTitle className="text-sm">Note</CardTitle></CardHeader>
              <CardContent className="text-sm text-gray-600">{order.note}</CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Modal Offre SIR */}
      <Dialog open={showOffer} onOpenChange={(v) => { if (!v) setShowOffer(false); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Enregistrer offre SIR</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>N° Offre SIR</Label>
                <Input value={offerNum} onChange={(e) => setOfferNum(e.target.value)} placeholder="ex: 20017668" />
              </div>
              <div className="space-y-1">
                <Label>Montant total offre (FCFA)</Label>
                <Input type="number" value={offerTotal} onChange={(e) => setOfferTotal(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Valide du</Label>
                <Input type="date" value={offerValidFrom} onChange={(e) => setOfferValidFrom(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Valide au</Label>
                <Input type="date" value={offerValidTo} onChange={(e) => setOfferValidTo(e.target.value)} />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Note</Label>
              <Textarea rows={2} value={offerNote} onChange={(e) => setOfferNote(e.target.value)} />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowOffer(false)}>Annuler</Button>
            <Button className="bg-purple-600 hover:bg-purple-700" disabled={loading} onClick={doOffer}>
              <CheckCircle className="w-4 h-4 mr-2" /> Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Paiement chèque */}
      <Dialog open={showPayment} onOpenChange={(v) => { if (!v) setShowPayment(false); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Enregistrer un paiement par chèque</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Bénéficiaire *</Label>
                <Input value={payBenef} onChange={(e) => setPayBenef(e.target.value)} placeholder="ex: SIR ou CNQ" />
              </div>
              <div className="space-y-1">
                <Label>N° Chèque *</Label>
                <Input value={payCheck} onChange={(e) => setPayCheck(e.target.value)} placeholder="ex: 0000343" />
              </div>
              <div className="space-y-1">
                <Label>Banque</Label>
                <Input value={payBank} onChange={(e) => setPayBank(e.target.value)} placeholder="ex: SGCI" />
              </div>
              <div className="space-y-1">
                <Label>Montant (FCFA) *</Label>
                <Input type="number" value={payAmount} onChange={(e) => setPayAmount(e.target.value)} />
              </div>
              <div className="space-y-1 col-span-2">
                <Label>Date *</Label>
                <Input type="date" value={payDate} onChange={(e) => setPayDate(e.target.value)} />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Note</Label>
              <Textarea rows={2} value={payNote} onChange={(e) => setPayNote(e.target.value)} />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowPayment(false)}>Annuler</Button>
            <Button className="bg-yellow-600 hover:bg-yellow-700" disabled={loading} onClick={doPayment}>
              <CreditCard className="w-4 h-4 mr-2" /> Enregistrer le chèque
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Ordre de livraison */}
      <Dialog open={showDelivery} onOpenChange={(v) => { if (!v) setShowDelivery(false); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Enregistrer ordre de livraison GESTOCI</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Référence OL</Label>
                <Input value={dlRef} onChange={(e) => setDlRef(e.target.value)} placeholder="ex: 17568" />
              </div>
              <div className="space-y-1">
                <Label>Dépôt</Label>
                <Input value={dlDepot} onChange={(e) => setDlDepot(e.target.value)} />
              </div>
              <div className="space-y-1 col-span-2">
                <Label>Date de livraison</Label>
                <Input type="date" value={dlDate} onChange={(e) => setDlDate(e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wide">Quantités livrées (M15)</Label>
              {dlEntries.map((e, idx) => {
                const item = order.items.find((i) => i.fuel.id === e.fuelId);
                return (
                  <div key={e.fuelId} className="flex items-center gap-3">
                    <span className="text-sm text-gray-600 flex-1">{item?.fuel.name} ({item?.fuel.code})</span>
                    <Input
                      type="number"
                      className="w-36"
                      value={e.quantityM15}
                      onChange={(v) => {
                        const next = [...dlEntries];
                        next[idx] = { ...next[idx], quantityM15: v.target.value };
                        setDlEntries(next);
                      }}
                    />
                    <span className="text-sm text-gray-400">M15</span>
                  </div>
                );
              })}
            </div>
            <div className="space-y-1">
              <Label>Note</Label>
              <Textarea rows={2} value={dlNote} onChange={(e) => setDlNote(e.target.value)} />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowDelivery(false)}>Annuler</Button>
            <Button className="bg-green-600 hover:bg-green-700" disabled={loading} onClick={doDelivery}>
              <Truck className="w-4 h-4 mr-2" /> Confirmer livraison GESTOCI
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Step({ done, active, label }: { done: boolean; active?: boolean; label: string }) {
  return (
    <div className={`flex items-center gap-2 text-sm ${done ? "text-green-700" : active ? "text-blue-600 font-medium" : "text-gray-400"}`}>
      <div className={`w-4 h-4 rounded-full flex-shrink-0 border-2 flex items-center justify-center ${done ? "bg-green-500 border-green-500" : active ? "border-blue-400 bg-blue-50" : "border-gray-300"}`}>
        {done && <CheckCircle className="w-3 h-3 text-white" />}
      </div>
      {label}
    </div>
  );
}
