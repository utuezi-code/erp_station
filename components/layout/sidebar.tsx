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
} from "lucide-react";
import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  roles: Role[];
}

const navItems: NavItem[] = [
  { label: "Tableau de bord", href: "/dashboard", icon: LayoutDashboard, roles: ["ADMIN", "GERANT", "DIRECTION_COMMERCIALE", "DIRECTION_FINANCIERE", "DIRECTION_GENERALE", "RESPONSABLE_SERVICE"] },
  { label: "Index pompes", href: "/dashboard/gerant/index", icon: Gauge, roles: ["ADMIN", "GERANT"] },
  { label: "Stocks cuves", href: "/dashboard/gerant/stocks", icon: Droplets, roles: ["ADMIN", "GERANT"] },
  { label: "Encaissements", href: "/dashboard/gerant/encaissements", icon: Wallet, roles: ["ADMIN", "GERANT"] },
  { label: "Versements", href: "/dashboard/gerant/versements", icon: ArrowUpCircle, roles: ["ADMIN", "GERANT", "DIRECTION_FINANCIERE"] },
  { label: "Livraisons", href: "/dashboard/gerant/livraisons", icon: Package, roles: ["ADMIN", "GERANT"] },
  { label: "Ventes", href: "/dashboard/direction-commerciale", icon: TrendingUp, roles: ["ADMIN", "DIRECTION_COMMERCIALE"] },
  { label: "Suivi financier", href: "/dashboard/direction-financiere/versements", icon: BarChart3, roles: ["ADMIN", "DIRECTION_FINANCIERE"] },
  { label: "Alertes", href: "/dashboard/alertes", icon: Bell, roles: ["ADMIN", "DIRECTION_COMMERCIALE", "DIRECTION_FINANCIERE", "DIRECTION_GENERALE"] },
  { label: "Rapports", href: "/dashboard/rapports", icon: FileText, roles: ["ADMIN", "GERANT", "DIRECTION_COMMERCIALE", "DIRECTION_FINANCIERE", "DIRECTION_GENERALE"] },
  { label: "Achats", href: "/dashboard/achats", icon: ShoppingCart, roles: ["ADMIN", "RESPONSABLE_SERVICE", "DIRECTION_COMMERCIALE", "DIRECTION_FINANCIERE", "DIRECTION_GENERALE"] },
  { label: "Stations", href: "/dashboard/admin/stations", icon: Building2, roles: ["ADMIN"] },
  { label: "Carburants", href: "/dashboard/admin/fuels", icon: Fuel, roles: ["ADMIN"] },
  { label: "Pompes & cuves", href: "/dashboard/admin/pumps", icon: Gauge, roles: ["ADMIN"] },
  { label: "Utilisateurs", href: "/dashboard/admin/users", icon: Users, roles: ["ADMIN"] },
  { label: "Paramètres", href: "/dashboard/admin/settings", icon: Settings, roles: ["ADMIN"] },
];

interface SidebarProps {
  userRole: Role;
  userName: string;
}

export function Sidebar({ userRole, userName }: SidebarProps) {
  const pathname = usePathname();

  const visible = navItems.filter((item) => item.roles.includes(userRole));

  return (
    <aside className="flex flex-col w-64 bg-gray-900 text-white min-h-screen">
      <div className="flex items-center gap-3 px-6 py-5 border-b border-gray-800">
        <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-orange-500 flex-shrink-0">
          <Fuel className="w-5 h-5 text-white" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold leading-tight truncate">IVORY ENERGIES</p>
          <p className="text-xs text-gray-400 truncate">ERP Stations</p>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
        {visible.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
                active
                  ? "bg-orange-500 text-white"
                  : "text-gray-400 hover:bg-gray-800 hover:text-white"
              )}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="px-3 py-4 border-t border-gray-800">
        <div className="flex items-center gap-3 px-3 py-2 mb-2">
          <div className="w-8 h-8 rounded-full bg-orange-500 flex items-center justify-center flex-shrink-0">
            <span className="text-xs font-bold text-white">{userName.charAt(0).toUpperCase()}</span>
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium truncate">{userName}</p>
            <p className="text-xs text-gray-400 truncate">{userRole.replace(/_/g, " ")}</p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start text-gray-400 hover:text-white hover:bg-gray-800"
          onClick={() => signOut({ callbackUrl: "/login" })}
        >
          <LogOut className="w-4 h-4 mr-2" />
          Déconnexion
        </Button>
      </div>
    </aside>
  );
}
