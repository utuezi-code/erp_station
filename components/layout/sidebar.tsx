"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Role } from "@prisma/client";
import {
  Fuel,
  LayoutDashboard,
  Building2,
  Users,
  Droplets,
  Gauge,
  TrendingUp,
  Wallet,
  ArrowUpCircle,
  AlertTriangle,
  Package,
  BarChart3,
  Bell,
  FileText,
  ShoppingCart,
  Settings,
  LogOut,
  GitCompare,
  Calculator,
  ChevronRight,
  Landmark,
  Shield,
} from "lucide-react";
import { signOut } from "next-auth/react";

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  roles: Role[];
  badge?: string;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const navGroups: NavGroup[] = [
  {
    label: "Général",
    items: [
      { label: "Tableau de bord", href: "/dashboard", icon: LayoutDashboard, roles: ["ADMIN", "GERANT", "DIRECTION_COMMERCIALE", "DIRECTION_FINANCIERE", "DIRECTION_GENERALE", "RESPONSABLE_SERVICE"] },
      { label: "Alertes", href: "/dashboard/alertes", icon: Bell, roles: ["ADMIN", "DIRECTION_COMMERCIALE", "DIRECTION_FINANCIERE", "DIRECTION_GENERALE"] },
    ],
  },
  {
    label: "Opérations Station",
    items: [
      { label: "Index pompes", href: "/dashboard/gerant/index", icon: Gauge, roles: ["ADMIN", "GERANT"] },
      { label: "Stocks cuves", href: "/dashboard/gerant/stocks", icon: Droplets, roles: ["ADMIN", "GERANT"] },
      { label: "Encaissements", href: "/dashboard/gerant/encaissements", icon: Wallet, roles: ["ADMIN", "GERANT"] },
      { label: "Versements", href: "/dashboard/gerant/versements", icon: ArrowUpCircle, roles: ["ADMIN", "GERANT", "DIRECTION_FINANCIERE"] },
      { label: "Livraisons", href: "/dashboard/gerant/livraisons", icon: Package, roles: ["ADMIN", "GERANT"] },
    ],
  },
  {
    label: "Direction",
    items: [
      { label: "Ventes", href: "/dashboard/direction-commerciale", icon: TrendingUp, roles: ["ADMIN", "DIRECTION_COMMERCIALE"] },
      { label: "Suivi financier", href: "/dashboard/direction-financiere/versements", icon: BarChart3, roles: ["ADMIN", "DIRECTION_FINANCIERE"] },
      { label: "Direction Générale", href: "/dashboard/direction-generale", icon: LayoutDashboard, roles: ["ADMIN", "DIRECTION_GENERALE"] },
      { label: "Écarts", href: "/dashboard/ecarts", icon: GitCompare, roles: ["ADMIN", "GERANT", "DIRECTION_FINANCIERE", "DIRECTION_GENERALE"] },
      { label: "Exploitation", href: "/dashboard/exploitation", icon: Calculator, roles: ["ADMIN", "GERANT", "DIRECTION_FINANCIERE", "DIRECTION_GENERALE"] },
    ],
  },
  {
    label: "Outils",
    items: [
      { label: "Rapports", href: "/dashboard/rapports", icon: FileText, roles: ["ADMIN", "GERANT", "DIRECTION_COMMERCIALE", "DIRECTION_FINANCIERE", "DIRECTION_GENERALE"] },
      { label: "Achats", href: "/dashboard/achats", icon: ShoppingCart, roles: ["ADMIN", "RESPONSABLE_SERVICE", "DIRECTION_COMMERCIALE", "DIRECTION_FINANCIERE", "DIRECTION_GENERALE"] },
      { label: "Factures", href: "/dashboard/achats/factures", icon: FileText, roles: ["ADMIN", "RESPONSABLE_SERVICE", "DIRECTION_FINANCIERE", "DIRECTION_GENERALE"] },
    ],
  },
  {
    label: "Administration",
    items: [
      { label: "Stations", href: "/dashboard/admin/stations", icon: Building2, roles: ["ADMIN"] },
      { label: "Carburants", href: "/dashboard/admin/fuels", icon: Fuel, roles: ["ADMIN"] },
      { label: "Pompes & cuves", href: "/dashboard/admin/pumps", icon: Gauge, roles: ["ADMIN"] },
      { label: "Comptes bancaires", href: "/dashboard/admin/banques", icon: Landmark, roles: ["ADMIN", "DIRECTION_FINANCIERE"] },
      { label: "Utilisateurs", href: "/dashboard/admin/users", icon: Users, roles: ["ADMIN"] },
      { label: "Journal d'audit", href: "/dashboard/admin/audit", icon: Shield, roles: ["ADMIN"] },
      { label: "Paramètres", href: "/dashboard/admin/settings", icon: Settings, roles: ["ADMIN"] },
    ],
  },
];

const ROLE_LABELS: Record<string, string> = {
  ADMIN: "Administrateur",
  GERANT: "Gérant",
  DIRECTION_COMMERCIALE: "Dir. Commerciale",
  DIRECTION_FINANCIERE: "Dir. Financière",
  DIRECTION_GENERALE: "Dir. Générale",
  RESPONSABLE_SERVICE: "Resp. Service",
};

interface SidebarProps {
  userRole: Role;
  userName: string;
}

export function Sidebar({ userRole, userName }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="flex flex-col w-64 bg-slate-900 text-white min-h-screen border-r border-slate-800 flex-shrink-0">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-slate-800">
        <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-br from-orange-400 to-orange-600 flex-shrink-0 shadow-lg shadow-orange-500/25">
          <Fuel className="w-5 h-5 text-white" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-bold leading-tight text-white tracking-wide">IVORY ENERGIES</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Plateforme ERP</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-5">
        {navGroups.map((group) => {
          const visibleItems = group.items.filter((item) => item.roles.includes(userRole));
          if (visibleItems.length === 0) return null;
          return (
            <div key={group.label}>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500 px-3 mb-1.5">
                {group.label}
              </p>
              <div className="space-y-0.5">
                {visibleItems.map((item) => {
                  const Icon = item.icon;
                  const active = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150 group",
                        active
                          ? "bg-orange-500 text-white shadow-md shadow-orange-500/20"
                          : "text-slate-400 hover:bg-slate-800 hover:text-slate-100"
                      )}
                    >
                      <Icon className={cn("w-4 h-4 flex-shrink-0 transition-transform group-hover:scale-110", active && "text-white")} />
                      <span className="flex-1 truncate">{item.label}</span>
                      {active && <ChevronRight className="w-3 h-3 opacity-60" />}
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>

      {/* User */}
      <div className="px-3 py-4 border-t border-slate-800">
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-slate-800/60 mb-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center flex-shrink-0 shadow-sm">
            <span className="text-xs font-bold text-white">{userName.charAt(0).toUpperCase()}</span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-white truncate leading-tight">{userName}</p>
            <p className="text-[11px] text-slate-400 truncate">{ROLE_LABELS[userRole] || userRole}</p>
          </div>
        </div>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="flex items-center gap-2.5 w-full px-3 py-2 text-sm text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Déconnexion
        </button>
      </div>
    </aside>
  );
}
