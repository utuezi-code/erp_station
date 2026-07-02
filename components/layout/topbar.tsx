"use client";

import { usePathname, useRouter } from "next/navigation";
import { Bell, Menu, AlertTriangle, CheckCircle, X, Fuel } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { Role } from "@prisma/client";

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
  "/dashboard/pompistes": "Gestion des pompistes",
  "/dashboard/cartes-carburant": "Cartes carburant",
  "/dashboard/reconciliation": "Réconciliation des cuves",
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
  userRole: Role;
  userName: string;
}

export function Topbar({ onMenuClick, userRole, userName }: TopbarProps) {
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
    <header className="sticky top-0 z-10 flex items-center justify-between h-14 px-4 bg-white/80 backdrop-blur-md border-b border-slate-200/60 shadow-sm flex-shrink-0">
      {/* Left */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={onMenuClick}
          className="lg:hidden flex items-center justify-center w-8 h-8 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          aria-label="Menu"
        >
          <Menu className="w-5 h-5" />
        </button>
        {/* Mobile logo */}
        <div className="flex lg:hidden items-center gap-2">
          <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-gradient-to-br from-orange-400 to-orange-600">
            <Fuel className="w-3.5 h-3.5 text-white" />
          </div>
        </div>
        <div className="hidden sm:block min-w-0">
          <h1 className="text-sm font-semibold text-slate-800 truncate">{title}</h1>
          <p className="text-[11px] text-slate-400 capitalize hidden md:block">{today}</p>
        </div>
        <h1 className="sm:hidden text-sm font-semibold text-slate-800 truncate">{title}</h1>
      </div>

      {/* Right */}
      <div className="flex items-center gap-2 flex-shrink-0" ref={ref}>
        {/* Notification bell */}
        <div className="relative">
          <button
            onClick={() => { setOpen((v) => !v); if (!open) loadAlerts(); }}
            className="relative flex items-center justify-center w-8 h-8 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            aria-label="Notifications"
          >
            <Bell className="w-4 h-4" />
            {unread > 0 && (
              <span className="absolute top-0.5 right-0.5 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center leading-none">
                {unread > 9 ? "9+" : unread}
              </span>
            )}
          </button>

          {open && (
            <div className="absolute right-0 top-10 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden z-50">
              <div className="flex items-center justify-between px-4 py-3 border-b border-slate-50 bg-slate-50/50">
                <div className="flex items-center gap-2">
                  <Bell className="w-3.5 h-3.5 text-slate-400" />
                  <p className="text-sm font-semibold text-slate-800">Notifications</p>
                  {unread > 0 && (
                    <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-orange-100 text-orange-600">{unread}</span>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  {unread > 0 && (
                    <button
                      onClick={markAllRead}
                      className="text-xs text-orange-500 hover:text-orange-600 font-medium px-2 py-1 rounded-lg hover:bg-orange-50 transition-colors"
                    >
                      Tout lire
                    </button>
                  )}
                  <button
                    onClick={() => setOpen(false)}
                    className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="max-h-72 overflow-y-auto divide-y divide-slate-50">
                {loading ? (
                  <div className="py-10 text-center">
                    <div className="w-5 h-5 border-2 border-orange-300 border-t-orange-500 rounded-full animate-spin mx-auto" />
                    <p className="text-xs text-slate-400 mt-2">Chargement…</p>
                  </div>
                ) : alerts.length === 0 ? (
                  <div className="py-10 text-center">
                    <CheckCircle className="w-8 h-8 text-green-400 mx-auto mb-2" />
                    <p className="text-sm text-slate-400">Aucune notification</p>
                  </div>
                ) : (
                  alerts.map((a) => (
                    <div
                      key={a.id}
                      className={`flex items-start gap-3 px-4 py-3 transition-colors ${!a.read ? "bg-orange-50/60" : "hover:bg-slate-50"}`}
                    >
                      <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${levelColor(a.level)}`} />
                      <div className="min-w-0 flex-1">
                        <p className={`text-[13px] leading-snug ${!a.read ? "font-semibold text-slate-800" : "text-slate-600"}`}>
                          {a.message}
                        </p>
                        {a.stationName && <p className="text-[11px] text-slate-400 mt-0.5">{a.stationName}</p>}
                        <p className="text-[10px] text-slate-300 mt-0.5">
                          {new Date(a.createdAt).toLocaleDateString("fr-CI", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="px-4 py-3 border-t border-slate-50 bg-slate-50/30">
                <button
                  onClick={() => { setOpen(false); router.push("/dashboard/alertes"); }}
                  className="w-full text-center text-xs text-orange-500 hover:text-orange-600 font-semibold py-1 rounded-lg hover:bg-orange-50 transition-colors"
                >
                  Voir toutes les alertes →
                </button>
              </div>
            </div>
          )}
        </div>

        {/* User avatar */}
        <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center flex-shrink-0 shadow-sm">
            <span className="text-[11px] font-bold text-white">{userName.charAt(0).toUpperCase()}</span>
          </div>
          <p className="hidden md:block text-[13px] font-medium text-slate-700 max-w-[120px] truncate">{userName}</p>
        </div>
      </div>
    </header>
  );
}
