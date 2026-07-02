import { requireAuth } from "@/lib/rbac";
import { db } from "@/lib/db";
import { Role } from "@prisma/client";
import {
  Building2, Users, AlertTriangle, Wallet, TrendingUp,
  ArrowUpRight, Clock, Gauge, ArrowUpCircle, FileText, ShoppingCart,
  Trophy, BarChart3, GitCompare, Fuel,
} from "lucide-react";
import Link from "next/link";

async function getDashboardStats(role: Role, stationId?: string) {
  const stationFilter = role === "GERANT" && stationId ? { id: stationId } : {};
  const today = new Date();
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

  const [stations, users, fuels, alerts, versements, recentAlerts] = await Promise.all([
    db.station.count({ where: { status: "ACTIVE", ...stationFilter } }),
    role === "ADMIN" ? db.user.count({ where: { active: true } }) : Promise.resolve(null),
    db.fuel.count({ where: { active: true } }),
    db.alert.count({ where: { read: false } }),
    db.versement.count({ where: { status: "EN_ATTENTE" } }),
    db.alert.findMany({
      where: { read: false },
      include: { station: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      take: 6,
    }),
  ]);

  return { stations, users, fuels, alerts, versements, recentAlerts };
}

const QUICK_ACTIONS: {
  label: string; href: string; icon: React.ElementType;
  desc: string; roles: Role[]; color: string;
}[] = [
  { label: "Saisir index", href: "/dashboard/gerant/index", icon: Gauge, desc: "Relevé pompes du jour", roles: ["ADMIN", "GERANT"], color: "blue" },
  { label: "Versement", href: "/dashboard/gerant/versements", icon: ArrowUpCircle, desc: "Enregistrer un versement", roles: ["ADMIN", "GERANT", "DIRECTION_FINANCIERE"], color: "green" },
  { label: "Stock cuves", href: "/dashboard/gerant/stocks", icon: Fuel, desc: "Mouvements de stocks", roles: ["ADMIN", "GERANT"], color: "orange" },
  { label: "Rapports", href: "/dashboard/rapports", icon: FileText, desc: "Exporter les données", roles: ["ADMIN", "GERANT", "DIRECTION_COMMERCIALE", "DIRECTION_FINANCIERE", "DIRECTION_GENERALE"], color: "violet" },
  { label: "Suivi ventes", href: "/dashboard/direction-commerciale", icon: TrendingUp, desc: "CA et volumes", roles: ["ADMIN", "DIRECTION_COMMERCIALE"], color: "emerald" },
  { label: "Suivi financier", href: "/dashboard/direction-financiere/versements", icon: BarChart3, desc: "Versements et écarts", roles: ["ADMIN", "DIRECTION_FINANCIERE"], color: "blue" },
  { label: "Classement", href: "/dashboard/classement", icon: Trophy, desc: "Performance stations", roles: ["ADMIN", "DIRECTION_COMMERCIALE", "DIRECTION_GENERALE"], color: "amber" },
  { label: "Achats", href: "/dashboard/achats", icon: ShoppingCart, desc: "Commandes et factures", roles: ["ADMIN", "RESPONSABLE_SERVICE", "DIRECTION_COMMERCIALE", "DIRECTION_FINANCIERE", "DIRECTION_GENERALE"], color: "rose" },
  { label: "Écarts", href: "/dashboard/ecarts", icon: GitCompare, desc: "Analyse des écarts", roles: ["ADMIN", "DIRECTION_FINANCIERE", "DIRECTION_GENERALE"], color: "red" },
];

const ACTION_COLORS: Record<string, { bg: string; icon: string; ring: string }> = {
  blue:    { bg: "bg-blue-50",    icon: "text-blue-500",    ring: "ring-blue-100" },
  green:   { bg: "bg-emerald-50", icon: "text-emerald-500", ring: "ring-emerald-100" },
  orange:  { bg: "bg-orange-50",  icon: "text-orange-500",  ring: "ring-orange-100" },
  violet:  { bg: "bg-violet-50",  icon: "text-violet-500",  ring: "ring-violet-100" },
  emerald: { bg: "bg-emerald-50", icon: "text-emerald-500", ring: "ring-emerald-100" },
  amber:   { bg: "bg-amber-50",   icon: "text-amber-500",   ring: "ring-amber-100" },
  rose:    { bg: "bg-rose-50",    icon: "text-rose-500",    ring: "ring-rose-100" },
  red:     { bg: "bg-red-50",     icon: "text-red-500",     ring: "ring-red-100" },
};

export default async function DashboardPage() {
  const session = await requireAuth();
  const user = session.user as any;
  const role: Role = user.role;
  const stats = await getDashboardStats(role, user.stationId);

  const isAdmin = role === "ADMIN";
  const isGerant = role === "GERANT";

  const visibleActions = QUICK_ACTIONS.filter((a) => a.roles.includes(role));

  return (
    <div className="space-y-6">

      {/* KPI Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <KpiCard
          title="Stations actives"
          value={stats.stations}
          icon={Building2}
          color="blue"
          href={isAdmin ? "/dashboard/admin/stations" : undefined}
          suffix="stations"
        />
        {isAdmin && stats.users !== null && (
          <KpiCard title="Utilisateurs" value={stats.users} icon={Users} color="violet" href="/dashboard/admin/users" suffix="comptes" />
        )}
        {isAdmin && (
          <KpiCard title="Carburants" value={stats.fuels} icon={Fuel} color="orange" href="/dashboard/admin/fuels" suffix="produits" />
        )}
        <KpiCard
          title="Alertes non lues"
          value={stats.alerts}
          icon={AlertTriangle}
          color={stats.alerts > 0 ? "red" : "green"}
          href="/dashboard/alertes"
          suffix="alertes"
        />
        {(isAdmin || isGerant || role === "DIRECTION_FINANCIERE") && (
          <KpiCard
            title="En attente"
            value={stats.versements}
            icon={Wallet}
            color={stats.versements > 0 ? "amber" : "green"}
            href={isAdmin || role === "DIRECTION_FINANCIERE" ? "/dashboard/direction-financiere/versements" : "/dashboard/gerant/versements"}
            suffix="versements"
          />
        )}
      </div>

      {/* Bottom grid */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 sm:gap-6">

        {/* Recent alerts — 2/5 */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-50">
            <div className="flex items-center gap-2">
              <span className="flex items-center justify-center w-6 h-6 rounded-lg bg-orange-50">
                <AlertTriangle className="w-3.5 h-3.5 text-orange-500" />
              </span>
              <h3 className="font-semibold text-slate-800 text-sm">Alertes récentes</h3>
            </div>
            <Link href="/dashboard/alertes" className="text-xs text-orange-400 hover:text-orange-500 font-medium flex items-center gap-0.5 transition-colors">
              Voir tout <ArrowUpRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="flex-1 divide-y divide-slate-50">
            {stats.recentAlerts.length === 0 ? (
              <div className="px-5 py-10 text-center">
                <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-2">
                  <AlertTriangle className="w-5 h-5 text-green-400" />
                </div>
                <p className="text-sm text-slate-400">Aucune alerte non lue</p>
              </div>
            ) : (
              stats.recentAlerts.map((alert) => (
                <div key={alert.id} className="px-5 py-3 flex items-start gap-3 hover:bg-slate-50 transition-colors">
                  <div className={`w-1.5 h-1.5 rounded-full mt-2 flex-shrink-0 ${
                    alert.level === "RED" ? "bg-red-500" : alert.level === "ORANGE" ? "bg-orange-400" : "bg-blue-400"
                  }`} />
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-medium text-slate-700 truncate">{alert.message}</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">{alert.station?.name}</p>
                  </div>
                  <span className="text-[10px] text-slate-300 flex-shrink-0 flex items-center gap-1 mt-0.5">
                    <Clock className="w-2.5 h-2.5" />
                    {new Date(alert.createdAt).toLocaleDateString("fr-CI", { day: "numeric", month: "short" })}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Quick actions — 3/5 */}
        <div className="lg:col-span-3 bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-3.5 border-b border-slate-50">
            <span className="flex items-center justify-center w-6 h-6 rounded-lg bg-orange-50">
              <TrendingUp className="w-3.5 h-3.5 text-orange-500" />
            </span>
            <h3 className="font-semibold text-slate-800 text-sm">Accès rapide</h3>
          </div>
          <div className="p-4 grid grid-cols-2 sm:grid-cols-3 gap-3">
            {visibleActions.slice(0, 6).map((action) => {
              const Icon = action.icon;
              const c = ACTION_COLORS[action.color] || ACTION_COLORS.blue;
              return (
                <Link
                  key={action.href}
                  href={action.href}
                  className="flex flex-col gap-2 p-3 rounded-xl border border-slate-100 hover:border-slate-200 hover:shadow-sm transition-all group bg-slate-50/50 hover:bg-white"
                >
                  <div className={`flex items-center justify-center w-8 h-8 rounded-lg ${c.bg} ring-1 ${c.ring} flex-shrink-0`}>
                    <Icon className={`w-4 h-4 ${c.icon}`} />
                  </div>
                  <div>
                    <p className="text-[13px] font-semibold text-slate-700 group-hover:text-slate-900 transition-colors">{action.label}</p>
                    <p className="text-[11px] text-slate-400 leading-tight mt-0.5">{action.desc}</p>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
}

function KpiCard({
  title, value, icon: Icon, color, href, suffix,
}: {
  title: string; value: number; icon: React.ElementType;
  color: string; href?: string; suffix: string;
}) {
  const styles: Record<string, { bg: string; icon: string; border: string }> = {
    blue:   { bg: "bg-blue-50",    icon: "text-blue-500",    border: "border-blue-100" },
    violet: { bg: "bg-violet-50",  icon: "text-violet-500",  border: "border-violet-100" },
    orange: { bg: "bg-orange-50",  icon: "text-orange-500",  border: "border-orange-100" },
    amber:  { bg: "bg-amber-50",   icon: "text-amber-500",   border: "border-amber-100" },
    red:    { bg: "bg-red-50",     icon: "text-red-500",     border: "border-red-100" },
    green:  { bg: "bg-emerald-50", icon: "text-emerald-500", border: "border-emerald-100" },
  };
  const s = styles[color] || styles.blue;

  const content = (
    <div className={`bg-white rounded-xl border shadow-sm p-4 transition-all hover:shadow-md group ${href ? "cursor-pointer hover:border-slate-200" : ""} border-slate-100`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wide truncate">{title}</p>
          <p className="text-2xl sm:text-3xl font-bold text-slate-900 mt-1 leading-none">{value}</p>
          <p className="text-[11px] text-slate-400 mt-1">{suffix}</p>
        </div>
        <div className={`p-2 rounded-lg flex-shrink-0 ${s.bg}`}>
          <Icon className={`w-4 h-4 sm:w-5 sm:h-5 ${s.icon}`} />
        </div>
      </div>
      {href && (
        <div className="mt-3 flex items-center gap-1 text-[11px] font-medium text-slate-400 group-hover:text-orange-400 transition-colors">
          Voir détail <ArrowUpRight className="w-3 h-3" />
        </div>
      )}
    </div>
  );

  return href ? <Link href={href}>{content}</Link> : <div>{content}</div>;
}
