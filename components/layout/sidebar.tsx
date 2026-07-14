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
  X,
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
  onClose?: () => void;
}

export function Sidebar({ userRole, userName, collapsed, onCollapse, onClose }: SidebarProps) {
  const pathname = usePathname();

  const allHrefs = navGroups.flatMap((g) => g.items.map((i) => i.href));
  const activeHref = allHrefs
    .filter((h) => pathname === h || (h !== "/dashboard" && pathname.startsWith(h + "/")))
    .sort((a, b) => b.length - a.length)[0] ?? (pathname === "/dashboard" ? "/dashboard" : "");

  return (
    <aside
      className={cn(
        // h-full fills the fixed inset-y-0 parent on mobile; on desktop it fills the flex row
        "flex flex-col h-full bg-[#0F172A] flex-shrink-0 transition-all duration-300 ease-in-out relative",
        // On mobile always full width (no collapsed); on desktop respect collapsed
        "w-72 lg:w-auto",
        collapsed ? "lg:w-[68px]" : "lg:w-64"
      )}
    >
      {/* Header: logo + close (mobile) / collapse (desktop) */}
      <div className={cn(
        "flex items-center h-16 px-4 flex-shrink-0 border-b border-white/5",
        collapsed ? "lg:justify-center" : "justify-between"
      )}>
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-[#0369A1] flex-shrink-0 shadow-lg shadow-blue-900/40">
            <Fuel className="w-4 h-4 text-white" />
          </div>
          <div className={cn("min-w-0", collapsed ? "lg:hidden" : "")}>
            <p className="text-[13px] font-bold text-white tracking-wide truncate leading-tight">IVORY ENERGIES</p>
            <p className="text-[10px] text-slate-400 truncate font-medium">Plateforme ERP</p>
          </div>
        </div>

        {/* Mobile: close button */}
        {onClose && (
          <button
            onClick={onClose}
            className="lg:hidden flex items-center justify-center w-8 h-8 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors touch-manipulation"
            aria-label="Fermer le menu"
          >
            <X className="w-4 h-4" />
          </button>
        )}

        {/* Desktop: collapse toggle */}
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

      {/* Nav — scrollable, fills available height */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden py-3 px-2.5 space-y-4">
        {navGroups.map((group) => {
          const visibleItems = group.items.filter((item) => item.roles.includes(userRole));
          if (visibleItems.length === 0) return null;
          return (
            <div key={group.label}>
              <p className={cn(
                "text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500 px-2 mb-1",
                collapsed ? "lg:hidden" : ""
              )}>
                {group.label}
              </p>
              {collapsed && <div className="hidden lg:block h-px bg-white/5 mx-1 mb-2" />}
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
                        // min-h-[44px] for touch targets on mobile
                        "flex items-center gap-3 px-3 py-2.5 min-h-[44px] rounded-xl text-sm font-medium transition-all duration-150 group touch-manipulation",
                        collapsed ? "lg:justify-center lg:px-2" : "",
                        active
                          ? "bg-[#0369A1] text-white shadow-sm"
                          : "text-slate-400 hover:bg-white/8 hover:text-slate-100 active:bg-white/10"
                      )}
                    >
                      <Icon className={cn(
                        "w-[18px] h-[18px] flex-shrink-0 transition-colors",
                        active ? "text-white" : "text-slate-500 group-hover:text-slate-300"
                      )} />
                      <span className={cn(
                        "flex-1 truncate text-[13px] font-medium",
                        collapsed ? "lg:hidden" : ""
                      )}>
                        {item.label}
                      </span>
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

      {/* User footer — always visible */}
      <div className="px-2.5 py-3 border-t border-white/5 flex-shrink-0">
        <div className={cn(
          "flex items-center gap-2.5 px-2.5 py-2.5 rounded-xl bg-white/5 mb-1",
          collapsed ? "lg:justify-center lg:px-0" : ""
        )}>
          <div className="w-9 h-9 rounded-lg bg-[#0369A1] flex items-center justify-center flex-shrink-0 shadow-sm">
            <span className="text-[13px] font-bold text-white">{userName.charAt(0).toUpperCase()}</span>
          </div>
          <div className={cn("min-w-0 flex-1", collapsed ? "lg:hidden" : "")}>
            <p className="text-[13px] font-semibold text-white truncate leading-tight">{userName}</p>
            <p className="text-[10px] text-slate-400 truncate font-medium">{ROLE_LABELS[userRole] || userRole}</p>
          </div>
        </div>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className={cn(
            "flex items-center gap-2 w-full px-2.5 py-2.5 min-h-[44px] text-xs text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-colors font-medium touch-manipulation",
            collapsed ? "lg:justify-center lg:px-0" : ""
          )}
          title={collapsed ? "Déconnexion" : undefined}
        >
          <LogOut className="w-4 h-4 flex-shrink-0" />
          <span className={collapsed ? "lg:hidden" : ""}>Déconnexion</span>
        </button>
      </div>

      {/* Spacer on mobile to clear the bottom nav bar (h-14 = 56px) */}
      <div className="h-14 flex-shrink-0 lg:hidden" />
    </aside>
  );
}
