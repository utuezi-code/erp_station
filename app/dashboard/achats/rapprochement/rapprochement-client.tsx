"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CheckCircle, XCircle, AlertTriangle, Search, ChevronDown, ChevronRight } from "lucide-react";

function fmt(n: any) {
  return Number(n || 0).toLocaleString("fr-CI", { maximumFractionDigits: 0 });
}

type MatchStatus = "OK" | "ECART_QTE" | "ECART_MONTANT" | "MANQUE_BL" | "MANQUE_FACTURE" | "NON_PAYE";

function computeStatus(order: any): { status: MatchStatus; details: string[] } {
  const details: string[] = [];
  const orderedQty = order.items.reduce((s: number, i: any) => s + Number(i.quantity), 0);
  const receivedQty = order.receipts
    .flatMap((r: any) => r.items)
    .reduce((s: number, i: any) => s + Number(i.quantityReceived), 0);

  const orderedAmount = Number(order.totalHT || 0);
  const invoicedAmount = order.invoices.reduce((s: number, i: any) => s + Number(i.amountHT), 0);

  if (order.receipts.length === 0) {
    details.push("Aucun bon de livraison enregistré");
    return { status: "MANQUE_BL", details };
  }
  if (order.invoices.length === 0) {
    details.push("Aucune facture enregistrée");
    return { status: "MANQUE_FACTURE", details };
  }

  if (Math.abs(orderedQty - receivedQty) > 0.01) {
    details.push(`Qté commandée: ${fmt(orderedQty)} — Qté reçue: ${fmt(receivedQty)}`);
    return { status: "ECART_QTE", details };
  }
  if (orderedAmount > 0 && Math.abs(orderedAmount - invoicedAmount) / orderedAmount > 0.02) {
    details.push(`Montant BC: ${fmt(orderedAmount)} FCFA — Facturé: ${fmt(invoicedAmount)} FCFA`);
    return { status: "ECART_MONTANT", details };
  }

  const unpaid = order.invoices.some((i: any) => !i.paid);
  if (unpaid) {
    details.push("Facture(s) non payée(s)");
    return { status: "NON_PAYE", details };
  }

  return { status: "OK", details: ["Rapprochement complet"] };
}

const STATUS_CONFIG: Record<MatchStatus, { label: string; color: string; icon: React.ReactNode }> = {
  OK: { label: "Conforme", color: "bg-green-100 text-green-700", icon: <CheckCircle className="w-4 h-4 text-green-600" /> },
  ECART_QTE: { label: "Écart quantité", color: "bg-red-100 text-red-700", icon: <XCircle className="w-4 h-4 text-red-600" /> },
  ECART_MONTANT: { label: "Écart montant", color: "bg-red-100 text-red-700", icon: <XCircle className="w-4 h-4 text-red-600" /> },
  MANQUE_BL: { label: "BL manquant", color: "bg-orange-100 text-orange-700", icon: <AlertTriangle className="w-4 h-4 text-orange-600" /> },
  MANQUE_FACTURE: { label: "Facture manquante", color: "bg-amber-100 text-amber-700", icon: <AlertTriangle className="w-4 h-4 text-amber-600" /> },
  NON_PAYE: { label: "Non payé", color: "bg-yellow-100 text-yellow-700", icon: <AlertTriangle className="w-4 h-4 text-yellow-600" /> },
};

export function RapprochementClient({ orders }: { orders: any[] }) {
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const analyzed = orders.map((o) => ({ ...o, match: computeStatus(o) }));

  const filtered = analyzed.filter((o) => {
    const matchesSearch =
      !search ||
      o.number.toLowerCase().includes(search.toLowerCase()) ||
      o.supplier?.name?.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = !filterStatus || o.match.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const counts = analyzed.reduce((acc: Record<string, number>, o) => {
    acc[o.match.status] = (acc[o.match.status] || 0) + 1;
    return acc;
  }, {});

  return (
    <div>
      {/* Summary KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3 mb-6">
        {(Object.keys(STATUS_CONFIG) as MatchStatus[]).map((s) => (
          <button
            key={s}
            onClick={() => setFilterStatus(filterStatus === s ? "" : s)}
            className={`rounded-xl border p-3 text-left transition-all ${filterStatus === s ? "ring-2 ring-offset-1 ring-blue-400" : ""} ${counts[s] ? "hover:shadow-sm cursor-pointer" : "opacity-50 cursor-default"}`}
          >
            <div className="flex items-center gap-1 mb-1">{STATUS_CONFIG[s].icon}</div>
            <p className="text-xl font-bold text-gray-900">{counts[s] || 0}</p>
            <p className="text-xs text-gray-500">{STATUS_CONFIG[s].label}</p>
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            className="pl-9"
            placeholder="Rechercher BC ou fournisseur..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        {filterStatus && (
          <button
            onClick={() => setFilterStatus("")}
            className="text-xs text-blue-600 hover:underline"
          >
            Effacer filtre
          </button>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-6"></TableHead>
              <TableHead>N° BC</TableHead>
              <TableHead>Fournisseur</TableHead>
              <TableHead className="text-right">Montant BC (HT)</TableHead>
              <TableHead className="text-center">BL(s)</TableHead>
              <TableHead className="text-center">Facture(s)</TableHead>
              <TableHead>Statut rapprochement</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((o) => {
              const cfg = STATUS_CONFIG[o.match.status as MatchStatus];
              const isExpanded = expandedId === o.id;
              return (
                <>
                  <TableRow
                    key={o.id}
                    className="cursor-pointer hover:bg-gray-50"
                    onClick={() => setExpandedId(isExpanded ? null : o.id)}
                  >
                    <TableCell>
                      {isExpanded ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}

                    </TableCell>
                    <TableCell className="font-mono text-sm font-semibold">{o.number}</TableCell>
                    <TableCell className="text-sm">{o.supplier?.name || "—"}</TableCell>
                    <TableCell className="text-right font-medium">{fmt(o.totalHT)} FCFA</TableCell>
                    <TableCell className="text-center">
                      <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${o.receipts.length > 0 ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                        {o.receipts.length}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${o.invoices.length > 0 ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-500"}`}>
                        {o.invoices.length}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {cfg.icon}
                        <Badge className={cfg.color}>{cfg.label}</Badge>
                      </div>
                    </TableCell>
                  </TableRow>
                  {isExpanded && (
                    <TableRow key={`${o.id}-detail`}>
                      <TableCell colSpan={7} className="bg-gray-50 px-8 py-4">
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 text-sm">
                          {/* BC Items */}
                          <div>
                            <p className="font-semibold text-gray-700 mb-2">Lignes BC</p>
                            <div className="space-y-1">
                              {o.items.map((item: any) => (
                                <div key={item.id} className="flex justify-between text-xs">
                                  <span className="text-gray-600 truncate max-w-[60%]">{item.description}</span>
                                  <span className="font-medium">{fmt(item.quantity)} × {fmt(item.unitPrice)} FCFA</span>
                                </div>
                              ))}
                            </div>
                          </div>
                          {/* BL(s) */}
                          <div>
                            <p className="font-semibold text-gray-700 mb-2">Bons de livraison</p>
                            {o.receipts.length === 0 ? (
                              <p className="text-xs text-gray-400 italic">Aucun BL enregistré</p>
                            ) : (
                              <div className="space-y-2">
                                {o.receipts.map((r: any) => {
                                  const totalReceived = r.items.reduce((s: number, i: any) => s + Number(i.quantityReceived), 0);
                                  const totalRejected = r.items.reduce((s: number, i: any) => s + Number(i.quantityRejected), 0);
                                  return (
                                    <div key={r.id} className="text-xs border-l-2 border-green-400 pl-2">
                                      <p className="font-medium">{r.blNumber || "BL sans numéro"}</p>
                                      <p className="text-gray-500">{new Date(r.receiptDate).toLocaleDateString("fr-CI")}</p>
                                      <p>Reçu: {fmt(totalReceived)} | Rejeté: {fmt(totalRejected)}</p>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                          {/* Invoices */}
                          <div>
                            <p className="font-semibold text-gray-700 mb-2">Factures</p>
                            {o.invoices.length === 0 ? (
                              <p className="text-xs text-gray-400 italic">Aucune facture</p>
                            ) : (
                              <div className="space-y-2">
                                {o.invoices.map((inv: any) => (
                                  <div key={inv.id} className="text-xs border-l-2 border-blue-400 pl-2">
                                    <p className="font-medium">{inv.invoiceNumber}</p>
                                    <p className="text-gray-500">{new Date(inv.invoiceDate).toLocaleDateString("fr-CI")}</p>
                                    <p>HT: {fmt(inv.amountHT)} | TTC: {fmt(inv.amountTTC)} FCFA</p>
                                    <Badge className={inv.paid ? "bg-green-100 text-green-700 text-[10px]" : "bg-red-100 text-red-700 text-[10px]"}>
                                      {inv.paid ? "Payée" : "Non payée"}
                                    </Badge>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                        {/* Anomaly details */}
                        {o.match.details.length > 0 && (
                          <div className={`mt-3 rounded-lg px-3 py-2 text-xs ${o.match.status === "OK" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
                            {o.match.details.map((d: string, i: number) => <p key={i}>{d}</p>)}
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  )}
                </>
              );
            })}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-10 text-gray-400">Aucun bon de commande trouvé.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
