"use client";

import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, Legend,
} from "recharts";
import { TrendingUp, TrendingDown, AlertTriangle, Clock, Droplets } from "lucide-react";

function fmt(n: number) {
  return n.toLocaleString("fr-CI", { maximumFractionDigits: 0 });
}

interface StationData {
  id: string;
  name: string;
  region: string;
  revenue: number;
  volume: number;
  versements: number;
  ecart: number;
  grossResult: number | null;
}

export function DGClient({
  period,
  stationData,
  trendData,
  totalRevenue,
  totalVolume,
  totalVersements,
  totalEcart,
  totalGrossResult,
  alertsCount,
  pendingVersements,
}: {
  period: string;
  stationData: StationData[];
  trendData: { month: string; revenue: number }[];
  totalRevenue: number;
  totalVolume: number;
  totalVersements: number;
  totalEcart: number;
  totalGrossResult: number;
  alertsCount: number;
  pendingVersements: number;
}) {
  const router = useRouter();

  const chartTrend = trendData.map((d) => ({
    month: d.month,
    "CA (FCFA)": d.revenue,
  }));

  const barData = stationData.map((s) => ({
    name: s.name.length > 15 ? s.name.slice(0, 15) + "…" : s.name,
    CA: s.revenue,
    Versé: s.versements,
  }));

  return (
    <div>
      {/* Period filter */}
      <div className="flex flex-wrap gap-4 mb-6 bg-white border rounded-xl p-4">
        <div className="space-y-1">
          <Label className="text-xs">Période (mois)</Label>
          <Input
            type="month"
            value={period}
            onChange={(e) => router.push(`?period=${e.target.value}`)}
            className="w-40"
          />
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-gray-500 flex items-center gap-1"><TrendingUp className="w-3 h-3" /> CA total</p>
            <p className="text-2xl font-bold">{fmt(totalRevenue)}</p>
            <p className="text-xs text-gray-400">FCFA</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-gray-500 flex items-center gap-1"><Droplets className="w-3 h-3" /> Volume</p>
            <p className="text-2xl font-bold">{fmt(totalVolume)}</p>
            <p className="text-xs text-gray-400">Litres</p>
          </CardContent>
        </Card>
        <Card className={totalGrossResult >= 0 ? "border-green-300" : "border-red-300"}>
          <CardContent className="pt-4">
            <p className="text-xs text-gray-500">Résultat brut consolidé</p>
            <p className={`text-2xl font-bold ${totalGrossResult >= 0 ? "text-green-700" : "text-red-700"}`}>
              {fmt(totalGrossResult)}
            </p>
            <p className="text-xs text-gray-400">FCFA</p>
          </CardContent>
        </Card>
        <Card className={totalEcart > 0 ? "border-orange-300" : ""}>
          <CardContent className="pt-4">
            <p className="text-xs text-gray-500">Reste à verser</p>
            <p className={`text-2xl font-bold ${totalEcart > 0 ? "text-orange-600" : "text-gray-700"}`}>
              {fmt(totalEcart)}
            </p>
            <p className="text-xs text-gray-400">FCFA</p>
          </CardContent>
        </Card>
      </div>

      {/* Alerts banner */}
      {(alertsCount > 0 || pendingVersements > 0) && (
        <div className="flex flex-wrap gap-3 mb-6">
          {alertsCount > 0 && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-4 py-2">
              <AlertTriangle className="w-4 h-4 text-red-500" />
              <span className="text-sm text-red-700 font-medium">{alertsCount} alerte(s) non lue(s)</span>
            </div>
          )}
          {pendingVersements > 0 && (
            <div className="flex items-center gap-2 bg-orange-50 border border-orange-200 rounded-lg px-4 py-2">
              <Clock className="w-4 h-4 text-orange-500" />
              <span className="text-sm text-orange-700 font-medium">{pendingVersements} versement(s) en attente</span>
            </div>
          )}
        </div>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card>
          <CardHeader><CardTitle className="text-base">Tendance CA (6 mois)</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={chartTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v / 1000000).toFixed(0)}M`} />
                <Tooltip formatter={(v: any) => `${fmt(v)} FCFA`} />
                <Area type="monotone" dataKey="CA (FCFA)" stroke="#f97316" fill="#fed7aa" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">CA vs Versements par station</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={barData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v / 1000000).toFixed(0)}M`} />
                <Tooltip formatter={(v: any) => `${fmt(v)} FCFA`} />
                <Legend />
                <Bar dataKey="CA" fill="#f97316" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Versé" fill="#22c55e" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Station table */}
      <Card>
        <CardHeader><CardTitle className="text-base">Performance par station — {period}</CardTitle></CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>Station</TableHead>
                <TableHead>Région</TableHead>
                <TableHead className="text-right">CA (FCFA)</TableHead>
                <TableHead className="text-right">Versé (FCFA)</TableHead>
                <TableHead className="text-right">Écart</TableHead>
                <TableHead className="text-right">Résultat</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {stationData.map((s, i) => (
                <TableRow key={s.id}>
                  <TableCell className="text-gray-500">{i + 1}</TableCell>
                  <TableCell className="font-medium">{s.name}</TableCell>
                  <TableCell className="text-gray-500 text-sm">{s.region}</TableCell>
                  <TableCell className="text-right">{fmt(s.revenue)}</TableCell>
                  <TableCell className="text-right text-green-600">{fmt(s.versements)}</TableCell>
                  <TableCell className={`text-right font-medium ${s.ecart > 0 ? "text-orange-600" : "text-gray-500"}`}>
                    {fmt(s.ecart)}
                  </TableCell>
                  <TableCell className="text-right">
                    {s.grossResult !== null ? (
                      <Badge className={s.grossResult >= 0 ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}>
                        {s.grossResult >= 0 ? <TrendingUp className="w-3 h-3 mr-1 inline" /> : <TrendingDown className="w-3 h-3 mr-1 inline" />}
                        {fmt(s.grossResult)}
                      </Badge>
                    ) : (
                      <span className="text-xs text-gray-400">Non saisi</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
