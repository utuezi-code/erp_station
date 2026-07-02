"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { FileText, FileSpreadsheet, Download, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface ReportType {
  id: string;
  label: string;
  description: string;
  formats: ("pdf" | "excel")[];
  route: string;
}

const REPORT_TYPES: ReportType[] = [
  {
    id: "ventes",
    label: "Rapport des ventes",
    description: "CA et volumes par station, par carburant pour la période sélectionnée.",
    formats: ["pdf", "excel"],
    route: "/api/rapports/ventes",
  },
  {
    id: "versements",
    label: "Rapport des versements",
    description: "Détail de tous les versements, statuts et écarts CA.",
    formats: ["pdf", "excel"],
    route: "/api/rapports/versements",
  },
  {
    id: "exploitation",
    label: "Compte d'exploitation",
    description: "Produits, charges et résultat mensuel par station.",
    formats: ["pdf", "excel"],
    route: "/api/rapports/exploitation",
  },
  {
    id: "stocks",
    label: "Suivi des stocks",
    description: "Mouvements cuves, écarts théorique/physique et alertes stock.",
    formats: ["excel"],
    route: "/api/rapports/stocks",
  },
  {
    id: "ecarts",
    label: "Rapport des écarts",
    description: "Analyse CA vs versements, taux de versement et niveau d'alerte par station.",
    formats: ["pdf", "excel"],
    route: "/api/rapports/ecarts",
  },
  {
    id: "consolidation",
    label: "Rapport consolidé DG",
    description: "Synthèse globale toutes stations: CA, versements, résultats, classements.",
    formats: ["pdf", "excel"],
    route: "/api/rapports/consolidation",
  },
];

export function RapportsClient({
  stations,
  selectedStation,
  period,
}: {
  stations: { id: string; name: string }[];
  selectedStation: string;
  period: string;
}) {
  const router = useRouter();
  const [loadingId, setLoadingId] = useState<string | null>(null);

  function updateParams(key: string, value: string) {
    const params = new URLSearchParams({ stationId: selectedStation, period });
    params.set(key, value);
    router.push(`?${params.toString()}`);
  }

  async function handleDownload(report: ReportType, format: "pdf" | "excel") {
    const key = `${report.id}-${format}`;
    setLoadingId(key);
    try {
      const params = new URLSearchParams({ period, format });
      if (selectedStation) params.set("stationId", selectedStation);
      const res = await fetch(`${report.route}?${params.toString()}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Erreur inconnue" }));
        throw new Error(err.error || `Erreur ${res.status}`);
      }
      const blob = await res.blob();
      const ext = format === "pdf" ? "pdf" : "xlsx";
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${report.id}-${period}.${ext}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de la génération du rapport.");
    } finally {
      setLoadingId(null);
    }
  }

  return (
    <div>
      {/* Filters */}
      <div className="flex flex-wrap gap-4 mb-6 bg-white border rounded-xl p-4">
        <div className="space-y-1">
          <Label className="text-xs">Période (mois)</Label>
          <Input type="month" value={period} onChange={(e) => updateParams("period", e.target.value)} className="w-40" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Station (optionnel)</Label>
          <Select value={selectedStation || "all"} onValueChange={(v) => updateParams("stationId", v === "all" ? "" : (v ?? ""))}>
            <SelectTrigger className="w-52">
              <span className="truncate">{selectedStation ? (stations.find((s) => s.id === selectedStation)?.name ?? selectedStation) : "Toutes les stations"}</span>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes les stations</SelectItem>
              {stations.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Report cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {REPORT_TYPES.map((report) => (
          <Card key={report.id} className="flex flex-col">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{report.label}</CardTitle>
              <CardDescription className="text-xs">{report.description}</CardDescription>
            </CardHeader>
            <CardContent className="mt-auto pt-0 flex gap-2">
              {report.formats.includes("pdf") && (
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 text-red-600 border-red-200 hover:bg-red-50"
                  disabled={loadingId === `${report.id}-pdf`}
                  onClick={() => handleDownload(report, "pdf")}
                >
                  {loadingId === `${report.id}-pdf` ? (
                    <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                  ) : (
                    <FileText className="w-3 h-3 mr-1" />
                  )}
                  PDF
                </Button>
              )}
              {report.formats.includes("excel") && (
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 text-green-700 border-green-200 hover:bg-green-50"
                  disabled={loadingId === `${report.id}-excel`}
                  onClick={() => handleDownload(report, "excel")}
                >
                  {loadingId === `${report.id}-excel` ? (
                    <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                  ) : (
                    <FileSpreadsheet className="w-3 h-3 mr-1" />
                  )}
                  Excel
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
