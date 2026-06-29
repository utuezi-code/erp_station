"use client";

import { usePathname } from "next/navigation";
import { Bell, Search } from "lucide-react";

const PAGE_TITLES: Record<string, string> = {
  "/dashboard": "Tableau de bord",
  "/dashboard/gerant/index": "Index pompes",
  "/dashboard/gerant/stocks": "Stocks cuves",
  "/dashboard/gerant/encaissements": "Encaissements",
  "/dashboard/gerant/versements": "Versements",
  "/dashboard/gerant/livraisons": "Livraisons",
  "/dashboard/direction-commerciale": "Suivi des ventes",
  "/dashboard/direction-financiere/versements": "Suivi financier",
  "/dashboard/direction-generale": "Direction Générale",
  "/dashboard/ecarts": "Analyse des écarts",
  "/dashboard/exploitation": "Compte d'exploitation",
  "/dashboard/alertes": "Alertes",
  "/dashboard/rapports": "Rapports & exports",
  "/dashboard/achats": "Achats & approvisionnement",
  "/dashboard/admin/stations": "Gestion des stations",
  "/dashboard/admin/fuels": "Gestion des carburants",
  "/dashboard/admin/pumps": "Pompes & cuves",
  "/dashboard/admin/users": "Utilisateurs",
  "/dashboard/admin/settings": "Paramètres",
};

export function Topbar() {
  const pathname = usePathname();

  const title = Object.entries(PAGE_TITLES)
    .sort((a, b) => b[0].length - a[0].length)
    .find(([key]) => pathname.startsWith(key))?.[1] || "ERP Station";

  const today = new Date().toLocaleDateString("fr-CI", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <header className="sticky top-0 z-10 flex items-center justify-between h-14 px-6 bg-white border-b border-gray-100 shadow-sm">
      <div>
        <h1 className="text-base font-semibold text-gray-900">{title}</h1>
        <p className="text-xs text-gray-400 capitalize">{today}</p>
      </div>
      <div className="flex items-center gap-2">
        <button className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
          <Bell className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
}
