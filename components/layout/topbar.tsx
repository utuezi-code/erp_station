"use client";

import { usePathname, useRouter } from "next/navigation";
import { Bell, Menu, AlertTriangle, CheckCircle, X } from "lucide-react";
import { useState, useEffect, useRef } from "react";

const PAGE_TITLES: Record<string, string> = {
  "/dashboard": "Tableau de bord",
  "/dashboard/gerant/index": "Index pompes",
  "/dashboard/gerant/stocks": "Stocks cuves",
  "/dashboard/gerant/encaissements": "Encaissements",
  "/dashboard/gerant/versements": "Versements",
  "/dashboard/gerant/livraisons": "Livraisons",
  "/dashboard/direction-commerciale": "Suivi des ventes",
  "/dashboard/direction-financiere/versements": "Suivi financier",
  "/dashboard/direction-financiere": "Direction Financière",
  "/dashboard/direction-generale": "Direction Générale",
  "/dashboard/ecarts": "Analyse des écarts",
  "/dashboard/exploitation": "Compte d'exploitation",
  "/dashboard/alertes": "Alertes",
  "/dashboard/rapports": "Rapports & exports",
  "/dashboard/achats": "Achats",
  "/dashboard/achats/factures": "Factures fournisseurs",
  "/dashboard/achats/commandes": "Bons de commande",
  "/dashboard/achats/demandes": "Demandes d'achat",
  "/dashboard/achats/receptions": "Réceptions",
  "/dashboard/achats/fournisseurs": "Fournisseurs",
  "/dashboard/admin/stations": "Stations",
  "/dashboard/admin/fuels": "Carburants",
  "/dashboard/admin/pumps": "Pompes & cuves",
  "/dashboard/admin/banques": "Comptes bancaires",
  "/dashboard/admin/users": "Utilisateurs",
  "/dashboard/admin/audit": "Journal d'audit",
  "/dashboard/admin/settings": "Paramètres",
  "/dashboard/classement": "Classement des stations",
  "/dashboard/prix-carburants": "Prix des carburants",
  "/dashboard/profil": "Mon profil",
};

interface Alert {
  id: string;
  message: string;
  level: string;
  type: string;
  read: boolean;
  createdAt: string;
  stationName?: string | null;
}

interface TopbarProps {
  onMenuClick: () => void;
}

export function Topbar({ onMenuClick }: TopbarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const title = Object.entries(PAGE_TITLES)
    .sort((a, b) => b[0].length - a[0].length)
    .find(([key]) => pathname.startsWith(key))?.[1] || "ERP Station";

  const today = new Date().toLocaleDateString("fr-CI", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  async function loadAlerts() {
    setLoading(true);
    try {
      const res = await fetch("/api/notifications");
      if (res.ok) {
        const data = await res.json();
        setAlerts(data.alerts);
        setUnread(data.unread);
      }
    } catch {}
    setLoading(false);
  }

  async function markAllRead() {
    await fetch("/api/notifications", { method: "POST" });
    setAlerts((prev) => prev.map((a) => ({ ...a, read: true })));
    setUnread(0);
  }

  useEffect(() => {
    loadAlerts();
  }, [pathname]);

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function levelColor(level: string) {
    if (level === "RED") return "bg-red-500";
    if (level === "ORANGE") return "bg-orange-400";
    return "bg-blue-400";
  }

  return (
    <header className="sticky top-0 z-10 flex items-center justify-between h-14 px-4 bg-white border-b border-gray-100 shadow-sm">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-base font-semibold text-gray-900 leading-tight">{title}</h1>
          <p className="text-xs text-gray-400 capitalize hidden sm:block">{today}</p>
        </div>
      </div>

      <div className="flex items-center gap-2" ref={ref}>
        <div className="relative">
          <button
            onClick={() => { setOpen((v) => !v); if (!open) loadAlerts(); }}
            className="relative p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <Bell className="w-4 h-4" />
            {unread > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                {unread > 9 ? "9+" : unread}
              </span>
            )}
          </button>

          {open && (
            <div className="absolute right-0 top-12 w-80 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden z-50">
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-50">
                <p className="text-sm font-semibold text-gray-900">Notifications</p>
                <div className="flex items-center gap-2">
                  {unread > 0 && (
                    <button onClick={markAllRead} className="text-xs text-orange-500 hover:text-orange-600 font-medium">
                      Tout marquer lu
                    </button>
                  )}
                  <button onClick={() => setOpen(false)} className="p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="max-h-80 overflow-y-auto divide-y divide-gray-50">
                {loading ? (
                  <div className="py-8 text-center text-sm text-gray-400">Chargement…</div>
                ) : alerts.length === 0 ? (
                  <div className="py-8 text-center">
                    <CheckCircle className="w-8 h-8 text-green-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-400">Aucune notification</p>
                  </div>
                ) : (
                  alerts.map((a) => (
                    <div key={a.id} className={`flex items-start gap-3 px-4 py-3 transition-colors ${!a.read ? "bg-orange-50/40" : ""}`}>
                      <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${levelColor(a.level)}`} />
                      <div className="min-w-0 flex-1">
                        <p className={`text-sm leading-snug ${!a.read ? "font-medium text-gray-900" : "text-gray-600"}`}>
                          {a.message}
                        </p>
                        {a.stationName && <p className="text-xs text-gray-400 mt-0.5">{a.stationName}</p>}
                        <p className="text-[11px] text-gray-300 mt-0.5">
                          {new Date(a.createdAt).toLocaleDateString("fr-CI", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="px-4 py-3 border-t border-gray-50">
                <button
                  onClick={() => { setOpen(false); router.push("/dashboard/alertes"); }}
                  className="w-full text-center text-xs text-orange-500 hover:text-orange-600 font-medium"
                >
                  Voir toutes les alertes →
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
