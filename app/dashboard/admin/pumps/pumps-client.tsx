"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus } from "lucide-react";
import { createPump, createNozzle, createTank } from "./actions";
import { toast } from "sonner";

interface Props {
  stations: { id: string; name: string }[];
  fuels: { id: string; name: string }[];
  pumps: any[];
  tanks: any[];
}

export function PumpsClientPage({ stations, fuels, pumps, tanks }: Props) {
  const [pumpOpen, setPumpOpen] = useState(false);
  const [nozzleOpen, setNozzleOpen] = useState(false);
  const [tankOpen, setTankOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  async function submit(action: (fd: FormData) => Promise<any>, fd: FormData, msg: string, close: () => void) {
    setLoading(true);
    try {
      await action(fd);
      toast.success(msg);
      close();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Tabs defaultValue="pumps">
      <TabsList className="mb-4">
        <TabsTrigger value="pumps">Pompes & Pistolets</TabsTrigger>
        <TabsTrigger value="tanks">Cuves</TabsTrigger>
      </TabsList>

      <TabsContent value="pumps">
        <div className="flex gap-2 justify-end mb-4">
          <Button variant="outline" onClick={() => setNozzleOpen(true)}><Plus className="w-4 h-4 mr-1" />Pistolet</Button>
          <Button className="bg-[#0369A1] hover:bg-blue-700" onClick={() => setPumpOpen(true)}><Plus className="w-4 h-4 mr-1" />Pompe</Button>
        </div>
        <div className="bg-white rounded-xl border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Station</TableHead>
                <TableHead>Pompe</TableHead>
                <TableHead>N°</TableHead>
                <TableHead>Pistolets</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pumps.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>{p.station.name}</TableCell>
                  <TableCell className="font-medium">{p.name}</TableCell>
                  <TableCell>{p.number}</TableCell>
                  <TableCell>
                    {p.nozzles.map((n: any) => (
                      <span key={n.id} className="inline-block bg-orange-100 text-orange-700 text-xs px-2 py-0.5 rounded mr-1">
                        #{n.number} {n.fuel.name}
                      </span>
                    ))}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </TabsContent>

      <TabsContent value="tanks">
        <div className="flex justify-end mb-4">
          <Button className="bg-[#0369A1] hover:bg-blue-700" onClick={() => setTankOpen(true)}><Plus className="w-4 h-4 mr-1" />Nouvelle cuve</Button>
        </div>
        <div className="bg-white rounded-xl border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Station</TableHead>
                <TableHead>Cuve</TableHead>
                <TableHead>Carburant</TableHead>
                <TableHead className="text-right">Capacité (L)</TableHead>
                <TableHead className="text-right">Seuil alerte (L)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tanks.map((t: any) => (
                <TableRow key={t.id}>
                  <TableCell>{t.station.name}</TableCell>
                  <TableCell className="font-medium">{t.name}</TableCell>
                  <TableCell>{t.fuel.name}</TableCell>
                  <TableCell className="text-right">{Number(t.capacity).toLocaleString("fr-CI")}</TableCell>
                  <TableCell className="text-right">{Number(t.alertLevel).toLocaleString("fr-CI")}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </TabsContent>

      {/* Pump dialog */}
      <Dialog open={pumpOpen} onOpenChange={setPumpOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Nouvelle pompe</DialogTitle></DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); submit(createPump, new FormData(e.currentTarget), "Pompe créée.", () => setPumpOpen(false)); }} className="space-y-4">
            <div className="space-y-2">
              <Label>Station</Label>
              <Select name="stationId" required>
                <SelectTrigger><SelectValue placeholder="Choisir..." /></SelectTrigger>
                <SelectContent>{stations.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2"><Label>Nom</Label><Input name="name" placeholder="Pompe 1" required /></div>
              <div className="space-y-2"><Label>N°</Label><Input name="number" type="number" min="1" required /></div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setPumpOpen(false)}>Annuler</Button>
              <Button type="submit" disabled={loading} className="bg-[#0369A1] hover:bg-blue-700">Créer</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Nozzle dialog */}
      <Dialog open={nozzleOpen} onOpenChange={setNozzleOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Nouveau pistolet</DialogTitle></DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); submit(createNozzle, new FormData(e.currentTarget), "Pistolet créé.", () => setNozzleOpen(false)); }} className="space-y-4">
            <div className="space-y-2">
              <Label>Pompe</Label>
              <Select name="pumpId" required>
                <SelectTrigger><SelectValue placeholder="Choisir..." /></SelectTrigger>
                <SelectContent>{pumps.map(p => <SelectItem key={p.id} value={p.id}>{p.station.name} — {p.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Carburant</Label>
              <Select name="fuelId" required>
                <SelectTrigger><SelectValue placeholder="Choisir..." /></SelectTrigger>
                <SelectContent>{fuels.map(f => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>N° pistolet</Label><Input name="number" type="number" min="1" required /></div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setNozzleOpen(false)}>Annuler</Button>
              <Button type="submit" disabled={loading} className="bg-[#0369A1] hover:bg-blue-700">Créer</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Tank dialog */}
      <Dialog open={tankOpen} onOpenChange={setTankOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Nouvelle cuve</DialogTitle></DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); submit(createTank, new FormData(e.currentTarget), "Cuve créée.", () => setTankOpen(false)); }} className="space-y-4">
            <div className="space-y-2">
              <Label>Station</Label>
              <Select name="stationId" required>
                <SelectTrigger><SelectValue placeholder="Choisir..." /></SelectTrigger>
                <SelectContent>{stations.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Carburant</Label>
              <Select name="fuelId" required>
                <SelectTrigger><SelectValue placeholder="Choisir..." /></SelectTrigger>
                <SelectContent>{fuels.map(f => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Nom de la cuve</Label><Input name="name" placeholder="Cuve SP95-A" required /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2"><Label>Capacité (L)</Label><Input name="capacity" type="number" step="0.001" min="1" required /></div>
              <div className="space-y-2"><Label>Seuil alerte (L)</Label><Input name="alertLevel" type="number" step="0.001" defaultValue="2000" required /></div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setTankOpen(false)}>Annuler</Button>
              <Button type="submit" disabled={loading} className="bg-[#0369A1] hover:bg-blue-700">Créer</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Tabs>
  );
}
