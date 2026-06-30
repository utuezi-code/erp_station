import { requireAuth } from "@/lib/rbac";
import { db } from "@/lib/db";
import { Role } from "@prisma/client";
import { Building2, Fuel, Users, AlertTriangle, Wallet, TrendingUp, ArrowUpRight, Clock } from "lucide-react";
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
      take: 5,
    }),
  ]);

  return { stations, users, fuels, alerts, versements, recentAlerts };
}

const QUICK_ACTIONS: { label: string; href: string; icon: string; desc: string; roles: Role[] }[] = [
  { label: "Saisir index", href: "/dashboard/gerant/index", icon: "⛽", desc: "Relevé pompes du jour", roles: ["ADMIN", "GERANT"] },
  { label: "Nouveau versement", href: "/dashboard/gerant/versements", icon: "💰", desc: "Enregistrer un versement", roles: ["ADMIN", "GERANT", "DIRECTION_FINANCIERE"] },
  { label: "Stock cuves", href: "/dashboard/gerant/stocks", icon: "🛢️", desc: "Mouvements de stocks", roles: ["ADMIN", "GERANT"] },
  { label: "Rapports", href: "/dashboard/rapports", icon: "📊", desc: "Exporter les données", roles: ["ADMIN", "GERANT", "DIRECTION_COMMERCIALE", "DIRECTION_FINANCIERE", "DIRECTION_GENERALE"] },
  { label: "Suivi ventes", href: "/dashboard/direction-commerciale", icon: "📈", desc: "CA et volumes", roles: ["ADMIN", "DIRECTION_COMMERCIALE"] },
  { label: "Suivi financier", href: "/dashboard/direction-financiere/versements", icon: "🏦", desc: "Versements et écarts", roles: ["ADMIN", "DIRECTION_FINANCIERE"] },
  { label: "Classement", href: "/dashboard/classement", icon: "🏆", desc: "Performance stations", roles: ["ADMIN", "DIRECTION_COMMERCIALE", "DIRECTION_GENERALE"] },
  { label: "Achats", href: "/dashboard/achats", icon: "🛒", desc: "Commandes et factures", roles: ["ADMIN", "RESPONSABLE_SERVICE", "DIRECTION_COMMERCIALE", "DIRECTION_FINANCIERE", "DIRECTION_GENERALE"] },
];

export default async function DashboardPage() {
  const session = await requireAuth();
  const user = session.user as any;
  const role: Role = user.role;
  const stats = await getDashboardStats(role, user.stationId);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Bonjour" : hour < 18 ? "Bon après-midi" : "Bonsoir";

  const isAdmin = role === "ADMIN";
  const isGerant = role === "GERANT";

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-2xl p-6 text-white shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-slate-400 text-sm mb-1">{greeting}</p>
            <h2 className="text-2xl font-bold">{session.user?.name || session.user?.email}</h2>
            <p className="text-slate-400 text-sm mt-1">
              {new Date().toLocaleDateString("fr-CI", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
            </p>
          </div>
          <div className="hidden sm:flex items-center justify-center w-16 h-16 rounded-2xl bg-orange-500/20 border border-orange-500/30">
            <Fuel className="w-8 h-8 text-orange-400" />
          </div>
        </div>
      </div>

      {/* KPI Grid — role-filtered */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* Stations: all roles */}
        <KpiCard
          title="Stations actives"
          value={stats.stations}
          icon={Building2}
          color="blue"
          href={isAdmin ? "/dashboard/admin/stations" : undefined}
          suffix="stations"
        />

        {/* Users: ADMIN only */}
        {isAdmin && stats.users !== null && (
          <KpiCard
            title="Utilisateurs"
            value={stats.users}
            icon={Users}
            color="violet"
            href="/dashboard/admin/users"
            suffix="comptes"
          />
        )}

        {/* Carburants: ADMIN only clickable */}
        {isAdmin && (
          <KpiCard
            title="Carburants"
            value={stats.fuels}
            icon={Fuel}
            color="orange"
            href="/dashboard/admin/fuels"
            suffix="produits"
          />
        )}

        {/* Alertes: all roles */}
        <KpiCard
          title="Alertes non lues"
          value={stats.alerts}
          icon={AlertTriangle}
          color={stats.alerts > 0 ? "red" : "green"}
          href="/dashboard/alertes"
          suffix="alertes"
        />

        {/* Versements en attente: roles who can see versements */}
        {(isAdmin || isGerant || role === "DIRECTION_FINANCIERE") && (
          <KpiCard
            title="Versements en attente"
            value={stats.versements}
            icon={Wallet}
            color={stats.versements > 0 ? "amber" : "green"}
            href={isAdmin || role === "DIRECTION_FINANCIERE"
              ? "/dashboard/direction-financiere/versements"
              : "/dashboard/gerant/versements"}
            suffix="en attente"
          />
        )}
      </div>

      {/* Bottom grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent alerts */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-orange-500" />
              <h3 className="font-semibold text-gray-900 text-sm">Alertes récentes</h3>
            </div>
            <Link href="/dashboard/alertes" className="text-xs text-orange-500 hover:text-orange-600 font-medium flex items-center gap-1">
              Voir tout <ArrowUpRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="divide-y divide-gray-50">
            {stats.recentAlerts.length === 0 ? (
              <div className="px-5 py-8 text-center">
                <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-2">
                  <AlertTriangle className="w-5 h-5 text-green-500" />
                </div>
                <p className="text-sm text-gray-400">Aucune alerte non lue</p>
              </div>
            ) : (
              stats.recentAlerts.map((alert) => (
                <div key={alert.id} className="px-5 py-3 flex items-start gap-3">
                  <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${
                    alert.level === "RED" ? "bg-red-500" : alert.level === "ORANGE" ? "bg-orange-400" : "bg-blue-400"
                  }`} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-800 truncate">{alert.message}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{alert.station?.name}</p>
                  </div>
                  <span className="text-[10px] text-gray-300 flex-shrink-0 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {new Date(alert.createdAt).toLocaleDateString("fr-CI")}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Quick actions — role-filtered */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-4 border-b border-gray-50">
            <TrendingUp className="w-4 h-4 text-orange-500" />
            <h3 className="font-semibold text-gray-900 text-sm">Accès rapide</h3>
          </div>
          <div className="p-4 grid grid-cols-2 gap-3">
            {QUICK_ACTIONS.filter((a) => a.roles.includes(role)).slice(0, 4).map((action) => (
              <Link
                key={action.href}
                href={action.href}
                className="flex flex-col gap-1 p-3 rounded-xl border border-gray-100 hover:border-orange-200 hover:bg-orange-50 transition-all group"
              >
                <span className="text-xl">{action.icon}</span>
                <p className="text-sm font-semibold text-gray-800 group-hover:text-orange-700">{action.label}</p>
                <p className="text-[11px] text-gray-400">{action.desc}</p>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function KpiCard({
  title, value, icon: Icon, color, href, suffix,
}: {
  title: string; value: number; icon: React.ElementType; color: string; href?: string; suffix: string;
}) {
  const styles: Record<string, { bg: string; icon: string }> = {
    blue:   { bg: "bg-blue-50",   icon: "text-blue-500" },
    violet: { bg: "bg-violet-50", icon: "text-violet-500" },
    orange: { bg: "bg-orange-50", icon: "text-orange-500" },
    amber:  { bg: "bg-amber-50",  icon: "text-amber-500" },
    red:    { bg: "bg-red-50",    icon: "text-red-500" },
    green:  { bg: "bg-green-50",  icon: "text-green-500" },
  };
  const s = styles[color] || styles.blue;

  const content = (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 hover:shadow-md hover:border-gray-200 transition-all group">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">{title}</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{value}</p>
          <p className="text-xs text-gray-400 mt-1">{suffix}</p>
        </div>
        <div className={`p-2.5 rounded-xl ${s.bg}`}>
          <Icon className={`w-5 h-5 ${s.icon}`} />
        </div>
      </div>
      {href && (
        <div className="mt-3 flex items-center gap-1 text-xs font-medium text-gray-400 group-hover:text-orange-500 transition-colors">
          Voir détail <ArrowUpRight className="w-3 h-3" />
        </div>
      )}
    </div>
  );

  return href ? <Link href={href}>{content}</Link> : <div>{content}</div>;
}
