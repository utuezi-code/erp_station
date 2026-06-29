import { requireAuth } from "@/lib/rbac";
import { db } from "@/lib/db";
import { Role } from "@prisma/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, Fuel, Users, TrendingUp, Wallet, AlertTriangle } from "lucide-react";

async function getDashboardStats(role: Role, stationId?: string) {
  const stationFilter = role === "GERANT" && stationId ? { id: stationId } : {};

  const [stations, users, fuels, alerts, versements] = await Promise.all([
    db.station.count({ where: { status: "ACTIVE", ...stationFilter } }),
    role === "ADMIN" ? db.user.count({ where: { active: true } }) : Promise.resolve(null),
    db.fuel.count({ where: { active: true } }),
    db.alert.count({ where: { read: false } }),
    db.versement.count({ where: { status: "EN_ATTENTE" } }),
  ]);

  return { stations, users, fuels, alerts, versements };
}

export default async function DashboardPage() {
  const session = await requireAuth();
  const user = session.user as any;
  const stats = await getDashboardStats(user.role, user.stationId);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Tableau de bord</h1>
        <p className="text-gray-500 mt-1">Bienvenue, {session.user?.name || session.user?.email}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        <StatCard
          title="Stations actives"
          value={stats.stations}
          icon={Building2}
          color="blue"
        />
        {stats.users !== null && (
          <StatCard
            title="Utilisateurs"
            value={stats.users}
            icon={Users}
            color="green"
          />
        )}
        <StatCard
          title="Carburants"
          value={stats.fuels}
          icon={Fuel}
          color="orange"
        />
        <StatCard
          title="Alertes non lues"
          value={stats.alerts}
          icon={AlertTriangle}
          color={stats.alerts > 0 ? "red" : "gray"}
        />
        <StatCard
          title="Versements en attente"
          value={stats.versements}
          icon={Wallet}
          color={stats.versements > 0 ? "orange" : "gray"}
        />
      </div>

      <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Activité récente</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-500">Les données d'activité apparaîtront ici une fois que vous aurez commencé à saisir des données.</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Alertes récentes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-500">Aucune alerte récente.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  icon: Icon,
  color,
}: {
  title: string;
  value: number;
  icon: React.ElementType;
  color: string;
}) {
  const colorMap: Record<string, string> = {
    blue: "bg-blue-50 text-blue-600",
    green: "bg-green-50 text-green-600",
    orange: "bg-orange-50 text-orange-600",
    red: "bg-red-50 text-red-600",
    gray: "bg-gray-100 text-gray-500",
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500">{title}</p>
            <p className="text-3xl font-bold mt-1">{value}</p>
          </div>
          <div className={`p-3 rounded-xl ${colorMap[color]}`}>
            <Icon className="w-6 h-6" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
