"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect, useRef, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { AlertTriangle, Info, CheckCircle, RefreshCw, CheckCheck } from "lucide-react";
import { markAlertRead, markAllRead, generateAlerts } from "./actions";
import { toast } from "sonner";

const ALERT_TYPE_LABELS: Record<string, string> = {
  VERSEMENT_NON_EFFECTUE: "Versement non effectué",
  ECART_STOCK: "Écart de stock",
  STOCK_FAIBLE: "Stock faible",
  OBJECTIF_NON_ATTEINT: "Objectif non atteint",
  RETARD_SAISIE: "Retard de saisie",
  CONNEXION_SUSPECTE: "Connexion suspecte",
};

const LEVEL_COLORS: Record<string, string> = {
  RED: "bg-red-100 text-red-700 border-red-200",
  ORANGE: "bg-orange-100 text-orange-700 border-orange-200",
  INFO: "bg-blue-100 text-blue-700 border-blue-200",
};

interface AlertItem {
  id: string;
  type: string;
  level: string;
  message: string;
  read: boolean;
  stationName: string | null;
  createdAt: string;
}

const POLL_INTERVAL = 30_000;

export function AlertesClient({
  alerts: initialAlerts,
  stations,
  isAdmin,
  filters,
}: {
  alerts: AlertItem[];
  stations: { id: string; name: string }[];
  isAdmin: boolean;
  filters: { level: string; type: string; stationId: string; unreadOnly: boolean };
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [alerts, setAlerts] = useState<AlertItem[]>(initialAlerts);
  const [unreadCount, setUnreadCount] = useState(initialAlerts.filter((a) => !a.read).length);
  const filtersRef = useRef(filters);
  filtersRef.current = filters;

  const fetchAlerts = useCallback(async () => {
    const f = filtersRef.current;
    const params = new URLSearchParams();
    if (f.level) params.set("level", f.level);
    if (f.type) params.set("type", f.type);
    if (f.stationId) params.set("stationId", f.stationId);
    if (f.unreadOnly) params.set("unreadOnly", "1");
    try {
      const res = await fetch(`/api/alertes?${params.toString()}`);
      if (!res.ok) return;
      const data = await res.json();
      setAlerts(data.alerts);
      setUnreadCount(data.unreadCount);
    } catch {
      // silently ignore network errors during polling
    }
  }, []);

  useEffect(() => {
    setAlerts(initialAlerts);
    setUnreadCount(initialAlerts.filter((a) => !a.read).length);
  }, [initialAlerts]);

  useEffect(() => {
    const id = setInterval(fetchAlerts, POLL_INTERVAL);
    return () => clearInterval(id);
  }, [fetchAlerts]);

  function updateFilter(key: string, value: string) {
    const params = new URLSearchParams({
      level: filters.level,
      type: filters.type,
      stationId: filters.stationId,
      unreadOnly: filters.unreadOnly ? "1" : "",
    });
    params.set(key, value);
    router.push(`?${params.toString()}`);
  }

  async function handleMarkRead(id: string) {
    await markAlertRead(id);
    setAlerts((prev) => prev.map((a) => a.id === id ? { ...a, read: true } : a));
    setUnreadCount((n) => Math.max(0, n - 1));
  }

  async function handleMarkAllRead() {
    setLoading(true);
    try {
      await markAllRead();
      setAlerts((prev) => prev.map((a) => ({ ...a, read: true })));
      setUnreadCount(0);
      toast.success("Toutes les alertes marquées comme lues.");
    } finally {
      setLoading(false);
    }
  }

  async function handleGenerate() {
    setLoading(true);
    try {
      const result = await generateAlerts();
      toast.success(`${result.created.length} nouvelle(s) alerte(s) générée(s).`);
      await fetchAlerts();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      {/* Filters & actions */}
      <div className="flex flex-wrap gap-4 mb-6 bg-white border rounded-xl p-4">
        <div className="space-y-1">
          <Label className="text-xs">Niveau</Label>
          <Select value={filters.level || "all"} onValueChange={(v) => updateFilter("level", v === "all" ? "" : (v ?? ""))}>
            <SelectTrigger className="w-36"><SelectValue placeholder="Tous niveaux" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous niveaux</SelectItem>
              <SelectItem value="RED">Critique</SelectItem>
              <SelectItem value="ORANGE">Alerte</SelectItem>
              <SelectItem value="INFO">Info</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Type</Label>
          <Select value={filters.type || "all"} onValueChange={(v) => updateFilter("type", v === "all" ? "" : (v ?? ""))}>
            <SelectTrigger className="w-52"><SelectValue placeholder="Tous types" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous types</SelectItem>
              {Object.entries(ALERT_TYPE_LABELS).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Station</Label>
          <Select value={filters.stationId || "all"} onValueChange={(v) => updateFilter("stationId", v === "all" ? "" : (v ?? ""))}>
            <SelectTrigger className="w-48">
              <span className="truncate">{filters.stationId ? (stations.find((s) => s.id === filters.stationId)?.name ?? filters.stationId) : "Toutes"}</span>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes</SelectItem>
              {stations.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Filtre</Label>
          <Button
            variant={filters.unreadOnly ? "default" : "outline"}
            size="sm"
            onClick={() => updateFilter("unreadOnly", filters.unreadOnly ? "" : "1")}
            className="h-10"
          >
            Non lues seulement
          </Button>
        </div>

        <div className="flex items-end gap-2 ml-auto">
          <Button variant="outline" size="sm" onClick={handleMarkAllRead} disabled={loading}>
            <CheckCheck className="w-4 h-4 mr-1" /> Tout lire
          </Button>
          {isAdmin && (
            <Button variant="outline" size="sm" onClick={handleGenerate} disabled={loading}>
              <RefreshCw className="w-4 h-4 mr-1" /> Générer alertes
            </Button>
          )}
        </div>
      </div>

      {/* Unread summary */}
      {unreadCount > 0 && (
        <p className="text-sm text-orange-600 font-medium mb-3">{unreadCount} alerte(s) non lue(s) — mise à jour toutes les 30s</p>
      )}

      {/* Alert list */}
      <div className="space-y-3">
        {alerts.map((alert) => (
          <Card key={alert.id} className={`transition-opacity ${alert.read ? "opacity-50" : ""} border ${LEVEL_COLORS[alert.level] || "border-gray-200"}`}>
            <CardContent className="pt-4 flex items-start gap-3">
              <div className={`mt-0.5 flex-shrink-0 ${alert.level === "RED" ? "text-red-500" : alert.level === "ORANGE" ? "text-orange-500" : "text-blue-500"}`}>
                {alert.level === "INFO" ? <Info className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <Badge variant="outline" className="text-xs shrink-0">
                    {ALERT_TYPE_LABELS[alert.type] || alert.type}
                  </Badge>
                  {alert.stationName && (
                    <span className="text-xs text-gray-500 shrink-0">{alert.stationName}</span>
                  )}
                  <span className="text-xs text-gray-400 ml-auto shrink-0">
                    {new Date(alert.createdAt).toLocaleString("fr-CI")}
                  </span>
                </div>
                <p className="text-sm">{alert.message}</p>
              </div>
              {!alert.read && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="shrink-0 text-gray-400 hover:text-green-600"
                  onClick={() => handleMarkRead(alert.id)}
                >
                  <CheckCircle className="w-4 h-4" />
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
        {alerts.length === 0 && (
          <p className="text-gray-500 text-center py-12">Aucune alerte pour les filtres sélectionnés.</p>
        )}
      </div>
    </div>
  );
}
