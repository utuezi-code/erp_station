"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus } from "lucide-react";

function fmt(n: any) { return Number(n || 0).toLocaleString("fr-CI", { maximumFractionDigits: 0 }); }

const STATUS: Record<string, { label: string; color: string }> = {
  BROUILLON: { label: "Brouillon", color: "bg-gray-100 text-gray-600" },
  ENVOYE: { label: "Envoyé à SIR", color: "bg-blue-100 text-blue-700" },
  OFFRE_RECUE: { label: "Offre reçue", color: "bg-purple-100 text-purple-700" },
  PAYE: { label: "Payé", color: "bg-yellow-100 text-yellow-700" },
  LIVRE: { label: "Livré — en stock GESTOCI", color: "bg-green-100 text-green-700" },
  ANNULE: { label: "Annulé", color: "bg-red-100 text-red-700" },
};

interface SIROrder {
  id: string;
  number: string;
  version: number;
  status: string;
  createdAt: string;
  sentAt: string | null;
  supplier: { name: string } | null;
  user: { name: string };
  items: { fuelId: string; quantityM15: number; unitPrice: number; totalAmount: number; fuel: { name: string; code: string } }[];
  offers: { id: string }[];
  payments: { amount: number }[];
  deliveryOrders: { id: string }[];
}

export function SIROrdersClient({ orders, role }: { orders: SIROrder[]; role: string }) {
  const isDC = role === "DIRECTION_COMMERCIALE";
  const isAdmin = role === "ADMIN";

  return (
    <>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Bons de commande SIR</h1>
          <p className="text-gray-500 mt-1">{orders.length} BC</p>
        </div>
        {(isDC || isAdmin) && (
          <Link href="/dashboard/commercial/propositions">
            <Button className="bg-[#0369A1] hover:bg-blue-700">
              <Plus className="w-4 h-4 mr-2" /> Créer un BC
            </Button>
          </Link>
        )}
      </div>

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Numéro BC</TableHead>
                <TableHead>Produits</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Offre SIR</TableHead>
                <TableHead>Paiements</TableHead>
                <TableHead>Date</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.map((o) => {
                const total = o.items.reduce((s, i) => s + Number(i.totalAmount), 0);
                const paid = o.payments.reduce((s, p) => s + Number(p.amount), 0);
                return (
                  <TableRow key={o.id}>
                    <TableCell className="font-mono text-sm">
                      {o.number}
                      {o.version > 1 && <span className="ml-1 text-xs text-amber-600">(v{o.version})</span>}
                    </TableCell>
                    <TableCell className="text-sm">
                      {o.items.map((i) => `${i.fuel.code} ${fmt(i.quantityM15)}L`).join(", ")}
                    </TableCell>
                    <TableCell className="text-right font-medium">{fmt(total)} FCFA</TableCell>
                    <TableCell><Badge className={STATUS[o.status]?.color ?? "bg-gray-100 text-gray-600"}>{STATUS[o.status]?.label ?? o.status}</Badge></TableCell>
                    <TableCell className="text-sm text-gray-500">{o.offers.length > 0 ? `${o.offers.length} offre(s)` : "—"}</TableCell>
                    <TableCell className="text-sm">
                      {o.payments.length > 0 ? (
                        <span className={paid >= total ? "text-green-600 font-medium" : "text-amber-600"}>
                          {fmt(paid)} FCFA
                        </span>
                      ) : "—"}
                    </TableCell>
                    <TableCell className="text-sm text-gray-400">{new Date(o.createdAt).toLocaleDateString("fr-CI")}</TableCell>
                    <TableCell>
                      <Link href={`/dashboard/commercial/sir-orders/${o.id}`}>
                        <Button variant="ghost" size="sm">Voir</Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                );
              })}
              {orders.length === 0 && (
                <TableRow><TableCell colSpan={8} className="text-center text-gray-500 py-8">Aucun bon de commande SIR.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </>
  );
}
