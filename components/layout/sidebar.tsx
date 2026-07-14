"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Role } from "@prisma/client";
import {
  Fuel, LayoutDashboard, Building2, Users, Droplets, Gauge,
  TrendingUp, Wallet, ArrowUpCircle, AlertTriangle, Package,
  BarChart3, Bell, FileText, ShoppingCart, Settings, LogOut,
  GitCompare, Calculator, ChevronLeft, ChevronRight, Landmark,
  Shield, UserCircle, Trophy, HardHat, CreditCard, FlaskConical,
} from "lucide-react";
import { signOut } from "next-auth/react";

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  roles: Role[];
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
      { label: "Alertes", href: "/dashboard/alertes", icon: Bell, roles: ["ADMIN", "GERANT", "DIRECTION_COMMERCIALE", "DIRECTION_FINANCIERE", "DIRECTION_GENERALE", "RESPONSABLE_SERVICE"] },
      { label: "Mon profil", href: "/dashboard/profil", icon: UserCircle, roles: ["ADMIN", "GERANT", "DIRECTION_COMMERCIALE", "DIRECTION_FINANCIERE", "DIRECTION_GENERALE", "RESPONSABLE_SERVICE"] },
    ],
  },
  {
    label: "Opérations",
    items: [
      { label: "Index pompes", href: "/dashboard/gerant/index", icon: Gauge, roles: ["GERANT"] },
      { label: "Stocks cuves", href: "/dashboard/gerant/stocks", icon: Droplets, roles: ["GERANT"] },
      { label: "Encaissements", href: "/dashboard/gerant/encaissements", icon: Wallet, roles: ["GERANT"] },
      { label: "Versements", href: "/dashboard/gerant/versements", icon: ArrowUpCircle, roles: ["GERANT", "DIRECTION_FINANCIERE"] },
      { label: "Livraisons", href: "/dashboard/gerant/livraisons", icon: Package, roles: ["GERANT"] },
      { label: "Pompistes", href: "/dashboard/pompistes", icon: HardHat, roles: ["ADMIN", "GERANT"] },
    ],
  },
  {
    label: "Direction",
    items: [
      { label: "Ventes", href: "/dashboard/direction-commerciale", icon: TrendingUp, roles: ["ADMIN", "DIRECTION_COMMERCIALE"] },
      { label: "Classement", href: "/dashboard/classement", icon: Trophy, roles: ["ADMIN", "DIRECTION_COMMERCIALE", "DIRECTION_GENERALE"] },
      { label: "Tableau financier", href: "/dashboard/direction-financiere", icon: BarChart3, roles: ["ADMIN", "DIRECTION_FINANCIERE"] },
      { label: "Suivi financier", href: "/dashboard/direction-financiere/versements", icon: BarChart3, roles: ["ADMIN", "DIRECTION_FINANCIERE"] },
      { label: "Direction Générale", href: "/dashboard/direction-generale", icon: LayoutDashboard, roles: ["ADMIN", "DIRECTION_GENERALE"] },
      { label: "Prix carburants", href: "/dashboard/prix-carburants", icon: Fuel, roles: ["ADMIN", "DIRECTION_GENERALE"] },
      { label: "Écarts", href: "/dashboard/ecarts", icon: GitCompare, roles: ["ADMIN", "GERANT", "DIRECTION_FINANCIERE", "DIRECTION_GENERALE"] },
      { label: "Exploitation", href: "/dashboard/exploitation", icon: Calculator, roles: ["ADMIN", "GERANT", "DIRECTION_FINANCIERE", "DIRECTION_GENERALE"] },
      { label: "Réconciliation cuves", href: "/dashboard/reconciliation", icon: FlaskConical, roles: ["ADMIN", "GERANT", "DIRECTION_FINANCIERE", "DIRECTION_GENERALE"] },
      { label: "Cartes carburant", href: "/dashboard/cartes-carburant", icon: CreditCard, roles: ["ADMIN", "GERANT", "DIRECTION_COMMERCIALE", "DIRECTION_FINANCIERE", "DIRECTION_GENERALE"] },
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
  collapsed: boolean;
  onCollapse: () => void;
}

export function Sidebar({ userRole, userName, collapsed, onCollapse }: SidebarProps) {
  const pathname = usePathname();

  // Find the single best-matching nav href (longest prefix wins)
  const allHrefs = navGroups.flatMap((g) => g.items.map((i) => i.href));
  const activeHref = allHrefs
    .filter((h) => pathname === h || (h !== "/dashboard" && pathname.startsWith(h + "/")))
    .sort((a, b) => b.length - a.length)[0] ?? (pathname === "/dashboard" ? "/dashboard" : "");

  return (
    <aside
      className={cn(
        "flex flex-col h-screen bg-[#0F172A] flex-shrink-0 transition-all duration-300 ease-in-out",
        collapsed ? "w-[68px]" : "w-64"
      )}
    >
      {/* Logo + collapse toggle */}
      <div className={cn(
        "flex items-center h-16 px-4 flex-shrink-0 border-b border-white/5",
        collapsed ? "justify-center" : "justify-between"
      )}>
        {!collapsed && (
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-[#0369A1] flex-shrink-0 shadow-lg shadow-blue-900/40">
              <Fuel className="w-4.5 h-4.5 text-white" />
            </div>
            <div className="min-w-0">
              <p className="text-[13px] font-bold text-white tracking-wide truncate leading-tight">IVORY ENERGIES</p>
              <p className="text-[10px] text-slate-400 truncate font-medium">Plateforme ERP</p>
            </div>
          </div>
        )}
        {collapsed && (
          <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-[#0369A1] shadow-lg shadow-blue-900/40">
            <Fuel className="w-4 h-4 text-white" />
          </div>
        )}
        {!collapsed && (
          <button
            onClick={onCollapse}
            className="hidden lg:flex items-center justify-center w-6 h-6 rounded-md text-slate-500 hover:text-slate-300 hover:bg-white/5 transition-colors flex-shrink-0"
            title="Réduire"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
        )}
        {collapsed && (
          <button
            onClick={onCollapse}
            className="hidden lg:flex absolute -right-3 top-[26px] items-center justify-center w-6 h-6 rounded-full bg-[#0F172A] border border-slate-700 text-slate-400 hover:text-white transition-colors shadow-md"
            title="Agrandir"
          >
            <ChevronRight className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden py-4 px-2.5 space-y-5">
        {navGroups.map((group) => {
          const visibleItems = group.items.filter((item) => item.roles.includes(userRole));
          if (visibleItems.length === 0) return null;
          return (
            <div key={group.label}>
              {!collapsed && (
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500 px-2 mb-1.5">
                  {group.label}
                </p>
              )}
              {collapsed && <div className="h-px bg-white/5 mx-1 mb-3" />}
              <div className="space-y-0.5">
                {visibleItems.map((item) => {
                  const Icon = item.icon;
                  const active = item.href === activeHref;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      title={collapsed ? item.label : undefined}
                      className={cn(
                        "flex items-center gap-3 px-2.5 py-2 rounded-lg text-sm font-medium transition-all duration-150 group relative",
                        collapsed ? "justify-center" : "",
                        active
                          ? "bg-[#0369A1] text-white shadow-sm"
                          : "text-slate-400 hover:bg-white/5 hover:text-slate-100"
                      )}
                    >
                      <Icon className={cn(
                        "w-[17px] h-[17px] flex-shrink-0 transition-colors",
                        active ? "text-white" : "text-slate-500 group-hover:text-slate-300"
                      )} />
                      {!collapsed && (
                        <span className="flex-1 truncate text-[13px] font-medium">{item.label}</span>
                      )}
                      {!collapsed && active && (
                        <span className="w-1.5 h-1.5 rounded-full bg-white/60 flex-shrink-0" />
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>

      {/* User footer */}
      <div className="px-2.5 py-3 border-t border-white/5 flex-shrink-0">
        {!collapsed ? (
          <>
            <div className="flex items-center gap-2.5 px-2.5 py-2.5 rounded-xl bg-white/5 mb-1">
              <div className="w-8 h-8 rounded-lg bg-[#0369A1] flex items-center justify-center flex-shrink-0 shadow-sm">
                <span className="text-[12px] font-bold text-white">{userName.charAt(0).toUpperCase()}</span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-semibold text-white truncate leading-tight">{userName}</p>
                <p className="text-[10px] text-slate-400 truncate font-medium">{ROLE_LABELS[userRole] || userRole}</p>
              </div>
            </div>
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="flex items-center gap-2 w-full px-2.5 py-1.5 text-xs text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors font-medium"
            >
              <LogOut className="w-3.5 h-3.5" />
              Déconnexion
            </button>
          </>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-[#0369A1] flex items-center justify-center shadow-sm" title={userName}>
              <span className="text-xs font-bold text-white">{userName.charAt(0).toUpperCase()}</span>
            </div>
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              title="Déconnexion"
              className="flex items-center justify-center w-8 h-8 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
