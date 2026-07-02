"use client";

import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertTriangle, CheckCircle, TrendingDown } from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  BarChart,
  Bar,
} from "recharts";

function fmt(n: number) {
  return n.toLocaleString("fr-CI", { maximumFractionDigits: 0 });
}

function fmtDate(s: string) {
  return new Date(s).toLocaleDateString("fr-CI", { day: "2-digit", month: "short" });
}

interface EcartResult {
  stationId: string;
  stationName: string;
  totalSales: number;
  totalVersements: number;
  resteAVerser: number;
  tauxVersement: number;
  level: "OK" | "ORANGE" | "RED";
}

interface DailyData {
  date: string;
  sales: number;
  volume: number;
  versements: number;
  ecart: number;
}

export function EcartsClient({
  results,
  dailyData,
  stations,
  selectedStation,
  from,
  to,
  isGerant,
}: {
  results: EcartResult[];
  dailyData: DailyData[];
  stations: { id: string; name: string }[];
  selectedStation: string;
  from: string;
  to: string;
  isGerant: boolean;
}) {
  const router = useRouter();

  function updateParams(key: string, value: string) {
    const params = new URLSearchParams({ stationId: selectedStation, from, to });
    params.set(key, value);
    router.push(`?${params.toString()}`);
  }

  const totalSales = results.reduce((s, r) => s + r.totalSales, 0);
  const totalVers = results.reduce((s, r) => s + r.totalVersements, 0);
  const totalEcart = totalSales - totalVers;
  const redCount = results.filter((r) => r.level === "RED").length;
  const orangeCount = results.filter((r) => r.level === "ORANGE").length;

  const chartData = dailyData.map((d) => ({
    date: fmtDate(d.date),
    "CA (FCFA)": d.sales,
    "Versements (FCFA)": d.versements,
    "Écart (FCFA)": d.ecart,
  }));

  return (
    <div>
      {/* Filters */}
      <div className="flex flex-wrap gap-4 mb-6 bg-white border rounded-xl p-4">
        <div className="space-y-1">
          <Label className="text-xs">Du</Label>
          <Input type="date" value={from} onChange={(e) => updateParams("from", e.target.value)} className="w-36" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Au</Label>
          <Input type="date" value={to} onChange={(e) => updateParams("to", e.target.value)} className="w-36" />
        </div>
        {!isGerant && (
          <div className="space-y-1">
            <Label className="text-xs">Station</Label>
            <Select value={selectedStation || "all"} onValueChange={(v) => updateParams("stationId", v === "all" ? "" : v)}>
              <SelectTrigger className="w-48"><SelectValue placeholder="Toutes les stations" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes les stations</SelectItem>
                {stations.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-gray-500">CA total</p>
            <p className="text-2xl font-bold">{fmt(totalSales)}</p>
            <p className="text-xs text-gray-400">FCFA</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-gray-500">Versé</p>
            <p className="text-2xl font-bold text-green-600">{fmt(totalVers)}</p>
            <p className="text-xs text-gray-400">FCFA</p>
          </CardContent>
        </Card>
        <Card className={totalEcart > 0 ? "border-orange-300" : ""}>
          <CardContent className="pt-4">
            <p className="text-xs text-gray-500">Reste à verser</p>
            <p className={`text-2xl font-bold ${totalEcart > 0 ? "text-orange-600" : "text-gray-700"}`}>{fmt(totalEcart)}</p>
            <p className="text-xs text-gray-400">FCFA</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-gray-500">Alertes</p>
            <div className="flex gap-2 mt-1">
              {redCount > 0 && <Badge className="bg-red-100 text-red-700">{redCount} critiques</Badge>}
              {orangeCount > 0 && <Badge className="bg-orange-100 text-orange-700">{orangeCount} en attente</Badge>}
              {redCount === 0 && orangeCount === 0 && <Badge className="bg-green-100 text-green-700">OK</Badge>}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Daily chart */}
      {dailyData.length > 0 && (
        <Card className="mb-6">
          <CardHeader><CardTitle className="text-base">Évolution CA vs Versements</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v / 1000000).toFixed(1)}M`} />
                <Tooltip formatter={(v: any) => `${fmt(v)} FCFA`} />
                <Legend />
                <Area type="monotone" dataKey="CA (FCFA)" stroke="#f97316" fill="#fed7aa" strokeWidth={2} />
                <Area type="monotone" dataKey="Versements (FCFA)" stroke="#22c55e" fill="#bbf7d0" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Station table */}
      <Card>
        <CardHeader><CardTitle className="text-base">Détail par station</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Station</TableHead>
                <TableHead className="text-right">CA (FCFA)</TableHead>
                <TableHead className="text-right">Versé (FCFA)</TableHead>
                <TableHead className="text-right">Reste à verser</TableHead>
                <TableHead className="text-right">Taux versement</TableHead>
                <TableHead>Niveau</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {results.map((r) => (
                <TableRow key={r.stationId}>
                  <TableCell className="font-medium">{r.stationName}</TableCell>
                  <TableCell className="text-right">{fmt(r.totalSales)}</TableCell>
                  <TableCell className="text-right text-green-600">{fmt(r.totalVersements)}</TableCell>
                  <TableCell className={`text-right font-medium ${r.resteAVerser > 0 ? "text-orange-600" : "text-gray-600"}`}>
                    {fmt(r.resteAVerser)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className={`h-2 rounded-full ${r.tauxVersement >= 90 ? "bg-green-500" : r.tauxVersement >= 50 ? "bg-orange-400" : "bg-red-500"}`}
                          style={{ width: `${Math.min(100, r.tauxVersement)}%` }}
                        />
                      </div>
                      <span className="text-sm">{r.tauxVersement.toFixed(0)}%</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {r.level === "OK" && <Badge className="bg-green-100 text-green-700"><CheckCircle className="w-3 h-3 mr-1" />OK</Badge>}
                    {r.level === "ORANGE" && <Badge className="bg-orange-100 text-orange-700"><AlertTriangle className="w-3 h-3 mr-1" />Alerte</Badge>}
                    {r.level === "RED" && <Badge className="bg-red-100 text-red-700"><TrendingDown className="w-3 h-3 mr-1" />Critique</Badge>}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Daily detail table */}
      {dailyData.length > 0 && (
        <Card className="mt-6">
          <CardHeader><CardTitle className="text-base">Détail journalier</CardTitle></CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Volume (L)</TableHead>
                  <TableHead className="text-right">CA (FCFA)</TableHead>
                  <TableHead className="text-right">Versements (FCFA)</TableHead>
                  <TableHead className="text-right">Écart (FCFA)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dailyData.map((d) => (
                  <TableRow key={d.date}>
                    <TableCell>{new Date(d.date).toLocaleDateString("fr-CI", { weekday: "short", day: "2-digit", month: "short" })}</TableCell>
                    <TableCell className="text-right">{fmt(d.volume)}</TableCell>
                    <TableCell className="text-right">{fmt(d.sales)}</TableCell>
                    <TableCell className="text-right text-green-600">{fmt(d.versements)}</TableCell>
                    <TableCell className={`text-right font-medium ${d.ecart > 0 ? "text-orange-600" : "text-gray-500"}`}>
                      {fmt(d.ecart)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
