"use client";

import { useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Plus, CheckCircle, XCircle, Eye } from "lucide-react";
import { toast } from "sonner";
import { validatePurchaseRequest } from "./actions";

const STATUS: Record<string, { label: string; color: string }> = {
  EN_ATTENTE: { label: "En attente (DC)", color: "bg-blue-100 text-blue-700" },
  VALIDE_DC: { label: "Validé DC — attente DF", color: "bg-orange-100 text-orange-700" },
  VALIDE_DF: { label: "Validé DF — attente DG", color: "bg-yellow-100 text-yellow-700" },
  VALIDE: { label: "Validé", color: "bg-green-100 text-green-700" },
  REJETE: { label: "Rejeté", color: "bg-red-100 text-red-700" },
  ANNULE: { label: "Annulé", color: "bg-gray-100 text-gray-600" },
};

const PRIORITY: Record<string, string> = {
  URGENT: "text-red-600",
  NORMAL: "text-gray-600",
  FAIBLE: "text-gray-400",
};

function fmt(n: any) { return Number(n || 0).toLocaleString("fr-CI", { maximumFractionDigits: 0 }); }

interface Item {
  id: string;
  description: string;
  quantity: number;
  unit: string;
  estimatedCost: number | null;
}

interface Request {
  id: string;
  number: string;
  service: string;
  priority: string;
  status: string;
  justification: string | null;
  createdAt: string;
  station: { name: string } | null;
  user: { name: string } | null;
  items: Item[];
}

export function DemandesClient({
  requests,
  role,
  statusFilter,
}: {
  requests: Request[];
  role: string;
  statusFilter: string;
}) {
  const [selected, setSelected] = useState<Request | null>(null);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);

  const isDC = role === "DIRECTION_COMMERCIALE";
  const canCreate = !["DIRECTION_COMMERCIALE", "DIRECTION_FINANCIERE", "DIRECTION_GENERALE"].includes(role);

  async function handle(approved: boolean) {
    if (!selected) return;
    setLoading(true);
    const result = await validatePurchaseRequest(selected.id, approved, comment || undefined);
    setLoading(false);
    if (result.success) {
      toast.success(approved ? "Demande validée." : "Demande rejetée.");
      setSelected(null);
      setComment("");
    } else {
      toast.error(result.error || "Une erreur est survenue.");
    }
  }

  const filters = ["", "EN_ATTENTE", "VALIDE_DC", "VALIDE_DF", "VALIDE", "REJETE"] as const;

  return (
    <>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Demandes d'achat</h1>
          <p className="text-gray-500 mt-1">{requests.length} demande(s)</p>
        </div>
        {canCreate && (
          <Link href="/dashboard/achats/demandes/new">
            <Button className="bg-[#0369A1] hover:bg-blue-700">
              <Plus className="w-4 h-4 mr-2" /> Nouvelle DA
            </Button>
          </Link>
        )}
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        {filters.map((s) => (
          <Link key={s} href={s ? `?status=${s}` : "?"}>
            <button className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${(statusFilter || "") === s ? "bg-orange-400 text-white border-orange-400" : "bg-white text-gray-600 border-gray-200 hover:border-orange-300"}`}>
              {s ? (STATUS[s]?.label ?? s) : "Tous"}
            </button>
          </Link>
        ))}
      </div>

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Numéro</TableHead>
                <TableHead>Service</TableHead>
                <TableHead>Station</TableHead>
                <TableHead>Demandeur</TableHead>
                <TableHead>Priorité</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Date</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {requests.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-mono text-sm">{r.number}</TableCell>
                  <TableCell className="font-medium">{r.service}</TableCell>
                  <TableCell className="text-sm text-gray-500">{r.station?.name || "—"}</TableCell>
                  <TableCell className="text-sm text-gray-500">{r.user?.name}</TableCell>
                  <TableCell className={`text-sm font-medium ${PRIORITY[r.priority]}`}>{r.priority}</TableCell>
                  <TableCell><Badge className={STATUS[r.status]?.color ?? "bg-gray-100 text-gray-600"}>{STATUS[r.status]?.label ?? r.status}</Badge></TableCell>
                  <TableCell className="text-sm text-gray-400">{new Date(r.createdAt).toLocaleDateString("fr-CI")}</TableCell>
                  <TableCell>
                    {isDC && r.status === "EN_ATTENTE" ? (
                      <Button
                        size="sm"
                        className="bg-orange-500 hover:bg-orange-600 text-white"
                        onClick={() => { setSelected(r); setComment(""); }}
                      >
                        <Eye className="w-3 h-3 mr-1" /> Valider
                      </Button>
                    ) : (
                      <Link href={`/dashboard/achats/demandes/${r.id}`}>
                        <Button variant="ghost" size="sm">Voir</Button>
                      </Link>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {requests.length === 0 && (
                <TableRow><TableCell colSpan={8} className="text-center text-gray-500 py-8">Aucune demande d'achat.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Modal détail + validation DC */}
      <Dialog open={!!selected} onOpenChange={(v) => { if (!v) { setSelected(null); setComment(""); } }}>
        <DialogContent className="max-w-2xl">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-3">
                  <span className="font-mono text-base">{selected.number}</span>
                  <Badge className={STATUS[selected.status]?.color ?? ""}>{STATUS[selected.status]?.label}</Badge>
                  <Badge className={selected.priority === "URGENT" ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-600"}>
                    {selected.priority}
                  </Badge>
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
                {/* Infos */}
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="bg-gray-50 rounded-lg px-3 py-2">
                    <p className="text-xs text-gray-400 mb-0.5">Station</p>
                    <p className="font-medium">{selected.station?.name || "—"}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg px-3 py-2">
                    <p className="text-xs text-gray-400 mb-0.5">Service</p>
                    <p className="font-medium">{selected.service}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg px-3 py-2">
                    <p className="text-xs text-gray-400 mb-0.5">Demandeur</p>
                    <p className="font-medium">{selected.user?.name}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg px-3 py-2">
                    <p className="text-xs text-gray-400 mb-0.5">Date</p>
                    <p className="font-medium">{new Date(selected.createdAt).toLocaleDateString("fr-CI")}</p>
                  </div>
                </div>

                {/* Justification */}
                {selected.justification && (
                  <div className="bg-blue-50 border border-blue-100 rounded-lg px-3 py-2 text-sm text-blue-800">
                    <p className="text-xs font-semibold text-blue-500 mb-1">Justification</p>
                    {selected.justification}
                  </div>
                )}

                {/* Articles */}
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Articles demandés</p>
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Description</TableHead>
                          <TableHead className="text-right">Qté</TableHead>
                          <TableHead>Unité</TableHead>
                          <TableHead className="text-right">Coût estimé</TableHead>
                          <TableHead className="text-right">Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selected.items.map((item) => (
                          <TableRow key={item.id}>
                            <TableCell>{item.description}</TableCell>
                            <TableCell className="text-right">{item.quantity}</TableCell>
                            <TableCell>{item.unit}</TableCell>
                            <TableCell className="text-right">{item.estimatedCost ? `${fmt(item.estimatedCost)} FCFA` : "—"}</TableCell>
                            <TableCell className="text-right font-medium">
                              {item.estimatedCost ? `${fmt(item.quantity * item.estimatedCost)} FCFA` : "—"}
                            </TableCell>
                          </TableRow>
                        ))}
                        {(() => {
                          const total = selected.items.reduce((s, i) => s + (i.estimatedCost ? i.quantity * i.estimatedCost : 0), 0);
                          return total > 0 ? (
                            <TableRow>
                              <TableCell colSpan={4} className="text-right font-bold">Total estimé</TableCell>
                              <TableCell className="text-right font-bold">{fmt(total)} FCFA</TableCell>
                            </TableRow>
                          ) : null;
                        })()}
                      </TableBody>
                    </Table>
                  </div>
                </div>

                {/* Commentaire */}
                <div className="space-y-1">
                  <Label className="text-xs">Commentaire (optionnel)</Label>
                  <Textarea
                    rows={2}
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Motif de validation ou de rejet..."
                  />
                </div>
              </div>

              <DialogFooter className="gap-2 flex-wrap">
                <Button variant="outline" onClick={() => { setSelected(null); setComment(""); }}>
                  Fermer
                </Button>
                <Button
                  variant="outline"
                  className="border-red-300 text-red-600 hover:bg-red-50"
                  disabled={loading}
                  onClick={() => handle(false)}
                >
                  <XCircle className="w-4 h-4 mr-2" /> Rejeter
                </Button>
                <Button
                  className="bg-green-600 hover:bg-green-700"
                  disabled={loading}
                  onClick={() => handle(true)}
                >
                  <CheckCircle className="w-4 h-4 mr-2" /> Valider — transmettre à la DF
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
