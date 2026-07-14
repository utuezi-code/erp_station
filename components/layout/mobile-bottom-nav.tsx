"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Role } from "@prisma/client";
import {
  LayoutDashboard, Gauge, ArrowUpCircle, Bell, FileText,
  TrendingUp, BarChart3, ShoppingCart, HardHat, CreditCard,
  Droplets, LayoutGrid,
} from "lucide-react";

interface BottomNavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  roles: Role[];
}

const NAV_ITEMS: BottomNavItem[] = [
  { label: "Accueil",    href: "/dashboard",                           icon: LayoutDashboard, roles: ["ADMIN", "GERANT", "DIRECTION_COMMERCIALE", "DIRECTION_FINANCIERE", "DIRECTION_GENERALE", "RESPONSABLE_SERVICE"] },
  { label: "Index",      href: "/dashboard/gerant/index",             icon: Gauge,           roles: ["GERANT"] },
  { label: "Stocks",     href: "/dashboard/gerant/stocks",            icon: Droplets,        roles: ["GERANT"] },
  { label: "Versements", href: "/dashboard/gerant/versements",        icon: ArrowUpCircle,   roles: ["GERANT", "DIRECTION_FINANCIERE"] },
  { label: "Pompistes",  href: "/dashboard/pompistes",                icon: HardHat,         roles: ["GERANT"] },
  { label: "Ventes",     href: "/dashboard/direction-commerciale",    icon: TrendingUp,      roles: ["ADMIN", "DIRECTION_COMMERCIALE"] },
  { label: "Finances",   href: "/dashboard/direction-financiere/versements", icon: BarChart3, roles: ["ADMIN", "DIRECTION_FINANCIERE"] },
  { label: "Achats",     href: "/dashboard/achats",                   icon: ShoppingCart,    roles: ["ADMIN", "RESPONSABLE_SERVICE", "DIRECTION_COMMERCIALE", "DIRECTION_FINANCIERE", "DIRECTION_GENERALE"] },
  { label: "Cartes",     href: "/dashboard/cartes-carburant",         icon: CreditCard,      roles: ["ADMIN", "GERANT", "DIRECTION_COMMERCIALE", "DIRECTION_FINANCIERE", "DIRECTION_GENERALE"] },
  { label: "Rapports",   href: "/dashboard/rapports",                 icon: FileText,        roles: ["ADMIN", "GERANT", "DIRECTION_COMMERCIALE", "DIRECTION_FINANCIERE", "DIRECTION_GENERALE"] },
  { label: "Alertes",    href: "/dashboard/alertes",                  icon: Bell,            roles: ["ADMIN", "GERANT", "DIRECTION_COMMERCIALE", "DIRECTION_FINANCIERE", "DIRECTION_GENERALE", "RESPONSABLE_SERVICE"] },
  { label: "Plus",       href: "#more",                               icon: LayoutGrid,      roles: ["ADMIN", "GERANT", "DIRECTION_COMMERCIALE", "DIRECTION_FINANCIERE", "DIRECTION_GENERALE", "RESPONSABLE_SERVICE"] },
];

// Priority items per role (max 5 displayed in bottom nav)
const ROLE_PRIORITY: Record<string, string[]> = {
  GERANT: ["/dashboard", "/dashboard/gerant/index", "/dashboard/gerant/versements", "/dashboard/gerant/stocks", "/dashboard/alertes"],
  ADMIN: ["/dashboard", "/dashboard/alertes", "/dashboard/admin/stations", "/dashboard/rapports", "/dashboard/achats"],
  DIRECTION_COMMERCIALE: ["/dashboard", "/dashboard/direction-commerciale", "/dashboard/alertes", "/dashboard/rapports", "/dashboard/cartes-carburant"],
  DIRECTION_FINANCIERE: ["/dashboard", "/dashboard/direction-financiere/versements", "/dashboard/alertes", "/dashboard/rapports", "/dashboard/achats"],
  DIRECTION_GENERALE: ["/dashboard", "/dashboard/direction-generale", "/dashboard/alertes", "/dashboard/rapports", "/dashboard/achats"],
  RESPONSABLE_SERVICE: ["/dashboard", "/dashboard/achats", "/dashboard/alertes", "/dashboard/rapports", "/dashboard/cartes-carburant"],
};

// Extra nav items for ADMIN in bottom nav (replace role-specific ones)
const ADMIN_ITEMS: BottomNavItem[] = [
  { label: "Accueil",  href: "/dashboard",              icon: LayoutDashboard, roles: ["ADMIN"] },
  { label: "Stations", href: "/dashboard/admin/stations", icon: LayoutGrid,    roles: ["ADMIN"] },
  { label: "Alertes",  href: "/dashboard/alertes",       icon: Bell,           roles: ["ADMIN"] },
  { label: "Rapports", href: "/dashboard/rapports",      icon: FileText,       roles: ["ADMIN"] },
  { label: "Achats",   href: "/dashboard/achats",        icon: ShoppingCart,   roles: ["ADMIN"] },
];

export function MobileBottomNav({ userRole }: { userRole: Role }) {
  const pathname = usePathname();

  // Build the 5 items for this role
  let items: BottomNavItem[];
  if (userRole === "ADMIN") {
    items = ADMIN_ITEMS;
  } else {
    const priority = ROLE_PRIORITY[userRole] ?? ROLE_PRIORITY["GERANT"];
    items = priority
      .map((href) => NAV_ITEMS.find((n) => n.href === href))
      .filter((n): n is BottomNavItem => !!n && n.roles.includes(userRole))
      .slice(0, 5);
  }

  if (items.length === 0) return null;

  return (
    <nav
      className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-white border-t border-slate-100 pb-safe"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="flex items-stretch h-14">
        {items.map((item) => {
          const Icon = item.icon;
          const active =
            item.href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href === "#more" ? "#" : item.href}
              className={cn(
                "flex-1 flex flex-col items-center justify-center gap-0.5 text-[10px] font-semibold transition-colors touch-manipulation select-none min-h-[44px]",
                active ? "text-[#0369A1]" : "text-slate-400 hover:text-slate-600"
              )}
            >
              <Icon
                className={cn("w-5 h-5 flex-shrink-0", active ? "text-[#0369A1]" : "text-slate-400")}
                strokeWidth={active ? 2.5 : 1.75}
              />
              <span className="truncate max-w-[56px] text-center leading-none">{item.label}</span>
              {active && (
                <span className="absolute bottom-0 w-6 h-0.5 bg-[#0369A1] rounded-full" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
