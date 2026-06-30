import { requireRole } from "@/lib/rbac";
import { db } from "@/lib/db";
import { AlertesClient } from "./alertes-client";

export default async function AlertesPage({
  searchParams,
}: {
  searchParams: { level?: string; type?: string; stationId?: string; unreadOnly?: string };
}) {
  const session = await requireRole(["ADMIN", "GERANT", "DIRECTION_COMMERCIALE", "DIRECTION_FINANCIERE", "DIRECTION_GENERALE", "RESPONSABLE_SERVICE"]);
  const user = session.user as any;
  const isAdmin = user.role === "ADMIN";

  const where: any = {};
  if (searchParams.unreadOnly === "1") where.read = false;
  if (searchParams.level) where.level = searchParams.level;
  if (searchParams.type) where.type = searchParams.type;
  if (searchParams.stationId) where.stationId = searchParams.stationId;

  const [alerts, stations, unreadCount] = await Promise.all([
    db.alert.findMany({
      where,
      include: { station: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    db.station.findMany({ where: { status: "ACTIVE" }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    db.alert.count({ where: { read: false } }),
  ]);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Alertes</h1>
        <p className="text-gray-500 mt-1">{unreadCount} alerte(s) non lue(s)</p>
      </div>
      <AlertesClient
        alerts={alerts.map((a) => ({
          ...a,
          stationName: a.station?.name || null,
          createdAt: a.createdAt.toISOString(),
        }))}
        stations={stations}
        isAdmin={isAdmin}
        filters={{
          level: searchParams.level || "",
          type: searchParams.type || "",
          stationId: searchParams.stationId || "",
          unreadOnly: searchParams.unreadOnly === "1",
        }}
      />
    </div>
  );
}
