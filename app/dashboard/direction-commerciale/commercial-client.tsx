"use client";

import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, BarChart, Bar, PieChart, Pie, Cell,
} from "recharts";
import { TrendingUp, Droplets } from "lucide-react";

function fmt(n: number) {
  return n.toLocaleString("fr-CI", { maximumFractionDigits: 0 });
}

const COLORS = ["#f97316", "#22c55e", "#3b82f6", "#a855f7", "#ec4899"];

interface StationResult {
  stationId: string;
  stationName: string;
  volume: number;
  revenue: number;
}

interface DailyData {
  date: string;
  volume: number;
  revenue: number;
}

interface FuelData {
  name: string;
  volume: number;
  revenue: number;
}

export function CommercialClient({
  stations,
  selectedStation,
  from,
  to,
  stationResults,
  dailyData,
  fuelData,
  totalRevenue,
  totalVolume,
}: {
  stations: { id: string; name: string }[];
  selectedStation: string;
  from: string;
  to: string;
  stationResults: StationResult[];
  dailyData: DailyData[];
  fuelData: FuelData[];
  totalRevenue: number;
  totalVolume: number;
}) {
  const router = useRouter();

  function updateParams(key: string, value: string) {
    const params = new URLSearchParams({ stationId: selectedStation, from, to });
    params.set(key, value);
    router.push(`?${params.toString()}`);
  }

  const chartData = dailyData.map((d) => ({
    date: new Date(d.date).toLocaleDateString("fr-CI", { day: "2-digit", month: "short" }),
    "CA (FCFA)": d.revenue,
    "Volume (L)": d.volume,
  }));

  const pieData = stationResults.map((r) => ({ name: r.stationName, value: r.revenue }));

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
        <div className="space-y-1">
          <Label className="text-xs">Station</Label>
          <Select value={selectedStation || "all"} onValueChange={(v) => updateParams("stationId", v === "all" ? "" : (v ?? ""))}>
            <SelectTrigger className="w-48"><SelectValue placeholder="Toutes les stations" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes les stations</SelectItem>
              {stations.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-gray-500 flex items-center gap-1"><TrendingUp className="w-3 h-3" /> CA total</p>
            <p className="text-2xl font-bold mt-1">{fmt(totalRevenue)}</p>
            <p className="text-xs text-gray-400">FCFA</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-gray-500 flex items-center gap-1"><Droplets className="w-3 h-3" /> Volume vendu</p>
            <p className="text-2xl font-bold mt-1">{fmt(totalVolume)}</p>
            <p className="text-xs text-gray-400">Litres</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-gray-500">Stations actives</p>
            <p className="text-2xl font-bold mt-1">{stationResults.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-gray-500">Prix moyen/L</p>
            <p className="text-2xl font-bold mt-1">{totalVolume > 0 ? fmt(totalRevenue / totalVolume) : "—"}</p>
            <p className="text-xs text-gray-400">FCFA/L</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="text-base">Évolution du CA</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v / 1000000).toFixed(1)}M`} />
                <Tooltip formatter={(v: any) => `${fmt(v)} FCFA`} />
                <Legend />
                <Area type="monotone" dataKey="CA (FCFA)" stroke="#f97316" fill="#fed7aa" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Part par station</CardTitle></CardHeader>
          <CardContent className="flex justify-center">
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={false}>
                  {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v: any) => `${fmt(v)} FCFA`} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Fuel breakdown */}
      {fuelData.length > 0 && (
        <Card className="mb-6">
          <CardHeader><CardTitle className="text-base">CA par carburant</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={fuelData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v / 1000000).toFixed(1)}M`} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={80} />
                <Tooltip formatter={(v: any) => `${fmt(v)} FCFA`} />
                <Bar dataKey="revenue" name="CA (FCFA)" fill="#f97316" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Station ranking table */}
      <Card>
        <CardHeader><CardTitle className="text-base">Classement des stations</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>Station</TableHead>
                <TableHead className="text-right">Volume (L)</TableHead>
                <TableHead className="text-right">CA (FCFA)</TableHead>
                <TableHead className="text-right">Part</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {stationResults.map((r, i) => (
                <TableRow key={r.stationId}>
                  <TableCell className="text-gray-500 font-medium">{i + 1}</TableCell>
                  <TableCell className="font-medium">{r.stationName}</TableCell>
                  <TableCell className="text-right">{fmt(r.volume)}</TableCell>
                  <TableCell className="text-right font-semibold">{fmt(r.revenue)}</TableCell>
                  <TableCell className="text-right text-gray-500">
                    {totalRevenue > 0 ? `${((r.revenue / totalRevenue) * 100).toFixed(1)}%` : "—"}
                  </TableCell>
                </TableRow>
              ))}
              {stationResults.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-gray-500 py-8">Aucune vente pour la période sélectionnée.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
