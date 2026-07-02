"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, CreditCard, Building2, Fuel, ArrowRight } from "lucide-react";
import { saveClient, saveCarte, saveTransaction } from "./actions";
import { toast } from "sonner";

interface Transaction {
  id: string;
  date: string;
  volume: number;
  unitPrice: number;
  amount: number;
  reference: string | null;
}

interface Carte {
  id: string;
  cardNumber: string;
  holderName: string;
  solde: number;
  plafond: number | null;
  active: boolean;
  transactions: Transaction[];
}

interface Client {
  id: string;
  name: string;
  code: string;
  phone: string | null;
  email: string | null;
  cartes: Carte[];
}

function fmt(n: number) { return n.toLocaleString("fr-CI", { maximumFractionDigits: 0 }); }

export function CartesClient({
  clients, stations, fuels, selectedClientId,
}: {
  clients: Client[];
  stations: { id: string; name: string }[];
  fuels: { id: string; name: string; salePrice: number }[];
  selectedClientId: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [openClient, setOpenClient] = useState(false);
  const [openCarte, setOpenCarte] = useState<string | null>(null);
  const [openTx, setOpenTx] = useState<string | null>(null);
  const [selectedFuelPrice, setSelectedFuelPrice] = useState<number>(0);

  const selectedClient = clients.find((c) => c.id === selectedClientId) || null;

  async function handle(fn: () => Promise<any>, onSuccess: () => void) {
    setLoading(true);
    try { await fn(); onSuccess(); router.refresh(); }
    catch (err: any) { toast.error(err.message); }
    finally { setLoading(false); }
  }

  const totalCartes = clients.reduce((s, c) => s + c.cartes.length, 0);
  const totalSolde = clients.reduce((s, c) => s + c.cartes.reduce((ss, k) => ss + k.solde, 0), 0);

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <Card className="shadow-sm border-slate-100">
          <CardContent className="pt-4">
            <p className="text-xs text-slate-400 uppercase tracking-wide">Clients</p>
            <p className="text-3xl font-bold text-slate-900 mt-1">{clients.length}</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm border-slate-100">
          <CardContent className="pt-4">
            <p className="text-xs text-slate-400 uppercase tracking-wide">Cartes actives</p>
            <p className="text-3xl font-bold text-slate-900 mt-1">{totalCartes}</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm border-slate-100">
          <CardContent className="pt-4">
            <p className="text-xs text-slate-400 uppercase tracking-wide">Consommé (FCFA)</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{fmt(totalSolde)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Header actions */}
      <div className="flex justify-end">
        <Dialog open={openClient} onOpenChange={setOpenClient}>
          <DialogTrigger className="inline-flex items-center justify-center rounded-md bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium px-4 py-2 transition-colors">
            <Plus className="w-4 h-4 mr-1" /> Nouveau client
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Nouveau compte client</DialogTitle></DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); handle(() => saveClient(new FormData(e.currentTarget)), () => setOpenClient(false)); }} className="space-y-3 mt-2">
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Raison sociale *</Label><Input name="name" required className="mt-1" /></div>
                <div><Label>Code *</Label><Input name="code" required className="mt-1" placeholder="CLI001" /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Téléphone</Label><Input name="phone" className="mt-1" /></div>
                <div><Label>Email</Label><Input name="email" type="email" className="mt-1" /></div>
              </div>
              <div><Label>Adresse</Label><Input name="address" className="mt-1" /></div>
              <Button type="submit" disabled={loading} className="w-full bg-orange-500 hover:bg-orange-600 text-white">Créer</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Clients list */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: client list */}
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-slate-600 uppercase tracking-wide">Clients</h2>
          {clients.length === 0 ? (
            <div className="text-center py-10 text-slate-400">
              <Building2 className="w-10 h-10 mx-auto mb-2 opacity-40" />
              <p className="text-sm">Aucun client enregistré</p>
            </div>
          ) : (
            clients.map((client) => (
              <button
                key={client.id}
                onClick={() => router.push(`?clientId=${client.id}`)}
                className={`w-full text-left p-3 rounded-xl border transition-all ${selectedClientId === client.id ? "border-orange-300 bg-orange-50 shadow-sm" : "border-slate-100 bg-white hover:border-slate-200 hover:shadow-sm"}`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-sm text-slate-800">{client.name}</p>
                    <p className="text-xs text-slate-400">{client.code} · {client.cartes.length} carte(s)</p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-300" />
                </div>
              </button>
            ))
          )}
        </div>

        {/* Right: cartes & transactions */}
        <div className="lg:col-span-2 space-y-4">
          {!selectedClient ? (
            <div className="text-center py-16 text-slate-400">
              <CreditCard className="w-12 h-12 mx-auto mb-3 opacity-40" />
              <p>Sélectionnez un client pour voir ses cartes</p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <h2 className="text-base font-semibold text-slate-800">{selectedClient.name}</h2>
                <Dialog open={openCarte === selectedClient.id} onOpenChange={(v) => setOpenCarte(v ? selectedClient.id : null)}>
                  <DialogTrigger className="inline-flex items-center justify-center rounded-md border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-sm font-medium px-3 py-1.5 transition-colors">
                    <CreditCard className="w-4 h-4 mr-1" /> Créer une carte
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader><DialogTitle>Nouvelle carte — {selectedClient.name}</DialogTitle></DialogHeader>
                    <form onSubmit={(e) => { e.preventDefault(); handle(() => saveCarte(new FormData(e.currentTarget)), () => setOpenCarte(null)); }} className="space-y-3 mt-2">
                      <input type="hidden" name="clientId" value={selectedClient.id} />
                      <div><Label>Numéro de carte *</Label><Input name="cardNumber" required className="mt-1" placeholder="CARTE-001" /></div>
                      <div><Label>Titulaire *</Label><Input name="holderName" required className="mt-1" /></div>
                      <div><Label>Plafond mensuel (FCFA)</Label><Input name="plafond" type="number" min="0" className="mt-1" /></div>
                      <Button type="submit" disabled={loading} className="w-full bg-orange-500 hover:bg-orange-600 text-white">Créer</Button>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>

              {selectedClient.cartes.length === 0 ? (
                <div className="text-center py-10 text-slate-400 border border-dashed border-slate-200 rounded-xl">
                  <p className="text-sm">Aucune carte pour ce client</p>
                </div>
              ) : (
                selectedClient.cartes.map((carte) => {
                  const pct = carte.plafond ? Math.min((carte.solde / carte.plafond) * 100, 100) : null;
                  return (
                    <Card key={carte.id} className="shadow-sm border-slate-100">
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-semibold text-sm text-slate-800">{carte.holderName}</p>
                            <p className="text-xs text-slate-400 font-mono">{carte.cardNumber}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant={carte.active ? "default" : "secondary"} className="text-xs">
                              {carte.active ? "Active" : "Inactive"}
                            </Badge>
                            <Dialog open={openTx === carte.id} onOpenChange={(v) => setOpenTx(v ? carte.id : null)}>
                              <DialogTrigger className="inline-flex items-center justify-center rounded-md bg-orange-500 hover:bg-orange-600 text-white text-xs font-medium px-2.5 py-1.5 transition-colors">
                                <Fuel className="w-3 h-3 mr-1" /> Transaction
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader><DialogTitle>Transaction — {carte.holderName}</DialogTitle></DialogHeader>
                                <form onSubmit={(e) => { e.preventDefault(); handle(() => saveTransaction(new FormData(e.currentTarget)), () => setOpenTx(null)); }} className="space-y-3 mt-2">
                                  <input type="hidden" name="carteId" value={carte.id} />
                                  <div><Label>Station *</Label>
                                    <Select name="stationId">
                                      <SelectTrigger className="mt-1 w-full"><span>Choisir...</span></SelectTrigger>
                                      <SelectContent>{stations.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                                    </Select>
                                  </div>
                                  <div><Label>Carburant</Label>
                                    <Select name="fuelId" onValueChange={(v) => { const f = fuels.find((f) => f.id === v); setSelectedFuelPrice(f?.salePrice ?? 0); }}>
                                      <SelectTrigger className="mt-1 w-full"><span>Choisir...</span></SelectTrigger>
                                      <SelectContent>{fuels.map((f) => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}</SelectContent>
                                    </Select>
                                  </div>
                                  <div><Label>Date *</Label><Input name="date" type="date" required className="mt-1" defaultValue={new Date().toISOString().split("T")[0]} /></div>
                                  <div className="grid grid-cols-2 gap-3">
                                    <div><Label>Volume (L) *</Label><Input name="volume" type="number" step="0.01" min="0.01" required className="mt-1" /></div>
                                    <div><Label>Prix unitaire *</Label><Input name="unitPrice" type="number" step="1" min="1" required className="mt-1" defaultValue={selectedFuelPrice || ""} /></div>
                                  </div>
                                  <div><Label>Référence</Label><Input name="reference" className="mt-1" /></div>
                                  <Button type="submit" disabled={loading} className="w-full bg-orange-500 hover:bg-orange-600 text-white">Enregistrer</Button>
                                </form>
                              </DialogContent>
                            </Dialog>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="grid grid-cols-2 gap-3 p-2 bg-slate-50 rounded-lg">
                          <div>
                            <p className="text-[10px] text-slate-400">Consommé</p>
                            <p className="text-sm font-bold text-slate-800">{fmt(carte.solde)} FCFA</p>
                          </div>
                          <div>
                            <p className="text-[10px] text-slate-400">Plafond</p>
                            <p className="text-sm font-bold text-slate-800">{carte.plafond ? fmt(carte.plafond) + " FCFA" : "Illimité"}</p>
                          </div>
                        </div>
                        {pct !== null && (
                          <div>
                            <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                              <span>Utilisation</span><span>{pct.toFixed(0)}%</span>
                            </div>
                            <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                              <div className={`h-full rounded-full transition-all ${pct > 90 ? "bg-red-500" : pct > 70 ? "bg-orange-400" : "bg-emerald-500"}`} style={{ width: `${pct}%` }} />
                            </div>
                          </div>
                        )}
                        {carte.transactions.length > 0 && (
                          <div>
                            <p className="text-[10px] text-slate-400 mb-1 uppercase tracking-wide">Dernières transactions</p>
                            <div className="space-y-1">
                              {carte.transactions.slice(0, 3).map((tx) => (
                                <div key={tx.id} className="flex items-center justify-between text-xs text-slate-600 py-1 border-b border-slate-50 last:border-0">
                                  <span>{new Date(tx.date).toLocaleDateString("fr-CI")}</span>
                                  <span className="font-medium">{tx.volume.toFixed(2)} L</span>
                                  <span className="text-orange-600 font-semibold">{fmt(tx.amount)} F</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
