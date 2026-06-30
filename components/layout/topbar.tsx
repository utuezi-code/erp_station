"use client";

import { usePathname } from "next/navigation";
import { Bell, Menu } from "lucide-react";

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
};

interface TopbarProps {
  onMenuClick: () => void;
}

export function Topbar({ onMenuClick }: TopbarProps) {
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
      <div className="flex items-center gap-2">
        <button className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
          <Bell className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
}
