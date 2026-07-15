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
import { TrendingUp, TrendingDown, AlertTriangle, Clock, Droplets, MapPin } from "lucide-react";
import { useState } from "react";

function fmt(n: number) {
  return n.toLocaleString("fr-CI", { maximumFractionDigits: 0 });
}

// Côte d'Ivoire bounding box: lat [4.35, 10.74], lng [-8.6, -2.49]
const CI_LAT_MIN = 4.35, CI_LAT_MAX = 10.74;
const CI_LNG_MIN = -8.6, CI_LNG_MAX = -2.49;

function latLngToSvg(lat: number, lng: number, w: number, h: number) {
  const x = ((lng - CI_LNG_MIN) / (CI_LNG_MAX - CI_LNG_MIN)) * w;
  const y = ((CI_LAT_MAX - lat) / (CI_LAT_MAX - CI_LAT_MIN)) * h;
  return { x, y };
}

// Simplified SVG path for Côte d'Ivoire outline
const CI_PATH = "M 195,12 L 220,18 L 260,22 L 290,30 L 300,55 L 310,80 L 295,105 L 280,130 L 290,160 L 285,185 L 270,210 L 250,225 L 230,240 L 210,255 L 190,260 L 170,250 L 145,245 L 120,240 L 100,230 L 80,215 L 65,195 L 55,170 L 50,145 L 48,120 L 55,95 L 65,75 L 80,55 L 100,40 L 125,25 L 155,15 Z";

function CIMap({ stations }: { stations: StationData[] }) {
  const W = 360, H = 280;
  const [tooltip, setTooltip] = useState<{ x: number; y: number; name: string; revenue: number } | null>(null);

  const withCoords = stations.filter((s) => s.lat !== null && s.lng !== null);
  const mappedStations = withCoords.map((s) => {
    const { x, y } = latLngToSvg(s.lat!, s.lng!, W, H);
    return { ...s, sx: x, sy: y };
  });

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full h-auto"
        style={{ maxHeight: 280 }}
        onMouseLeave={() => setTooltip(null)}
      >
        {/* Country outline */}
        <path d={CI_PATH} fill="#f0fdf4" stroke="#16a34a" strokeWidth="1.5" strokeLinejoin="round" />

        {/* Station dots */}
        {mappedStations.map((s) => (
          <g key={s.id}>
            <circle
              cx={s.sx}
              cy={s.sy}
              r={s.revenue > 0 ? Math.min(12, 5 + (s.revenue / 500000)) : 5}
              fill={s.ecart > 0 ? "#f97316" : "#22c55e"}
              fillOpacity={0.85}
              stroke="white"
              strokeWidth="1.5"
              className="cursor-pointer"
              onMouseEnter={() => setTooltip({ x: s.sx, y: s.sy, name: s.name, revenue: s.revenue })}
            />
          </g>
        ))}

        {/* Tooltip */}
        {tooltip && (
          <g>
            <rect
              x={Math.min(tooltip.x + 8, W - 130)}
              y={Math.max(tooltip.y - 30, 4)}
              width={120}
              height={36}
              rx={6}
              fill="white"
              stroke="#e5e7eb"
              strokeWidth="1"
            />
            <text x={Math.min(tooltip.x + 14, W - 124)} y={Math.max(tooltip.y - 15, 18)} fontSize={9} fontWeight="600" fill="#111827">
              {tooltip.name.length > 16 ? tooltip.name.slice(0, 16) + "…" : tooltip.name}
            </text>
            <text x={Math.min(tooltip.x + 14, W - 124)} y={Math.max(tooltip.y - 3, 30)} fontSize={8} fill="#6b7280">
              {fmt(tooltip.revenue)} FCFA
            </text>
          </g>
        )}
      </svg>
      <div className="flex items-center gap-4 mt-2 text-xs text-gray-500 justify-center">
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-green-500 inline-block" /> Écart OK</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-orange-500 inline-block" /> Écart positif</span>
      </div>
    </div>
  );
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
  lat: number | null;
  lng: number | null;
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

      {/* Map + Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><MapPin className="w-4 h-4 text-green-600" /> Carte des stations</CardTitle></CardHeader>
          <CardContent>
            <CIMap stations={stationData} />
            <p className="text-xs text-gray-400 text-center mt-1">{stationData.filter(s => s.lat).length} station(s) géolocalisée(s)</p>
          </CardContent>
        </Card>
      <div className="lg:col-span-2 grid grid-cols-1 gap-6">
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
