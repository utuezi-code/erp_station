import { requireRole } from "@/lib/rbac";
import { db } from "@/lib/db";
import { PompistesClient } from "./pompistes-client";

export default async function PompistesPage({
  searchParams,
}: {
  searchParams: Promise<{ stationId?: string; date?: string }>;
}) {
  const session = await requireRole(["ADMIN", "GERANT"]);
  const params = await searchParams;
  const user = session.user as any;
  const isGerant = user.role === "GERANT";

  const stationId = isGerant ? user.stationId : (params.stationId || "");

  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const selectedDate = params.date || today;

  const stations = isGerant
    ? []
    : await db.station.findMany({ where: { status: "ACTIVE" }, select: { id: true, name: true }, orderBy: { name: "asc" } });

  const pompistes = stationId
    ? await db.pompiste.findMany({
        where: { stationId },
        orderBy: { name: "asc" },
        include: {
          shifts: {
            where: {
              date: {
                gte: new Date(selectedDate + "T00:00:00.000Z"),
                lte: new Date(selectedDate + "T23:59:59.999Z"),
              },
            },
          },
        },
      })
    : [];

  // Stats du mois
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const statsParPompiste = stationId
    ? await db.pompisteShift.groupBy({
        by: ["pompisteId"],
        where: { stationId, date: { gte: startOfMonth } },
        _sum: { volumeSold: true, revenue: true },
      })
    : [];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Gestion des pompistes</h1>
        <p className="text-gray-500 mt-1">Suivi des équipes, shifts et performances</p>
      </div>
      <PompistesClient
        pompistes={pompistes.map((p) => ({
          ...p,
          createdAt: p.createdAt.toISOString(),
          shifts: p.shifts.map((s) => ({
            ...s,
            date: s.date.toISOString(),
            volumeSold: s.volumeSold ? Number(s.volumeSold) : null,
            revenue: s.revenue ? Number(s.revenue) : null,
            createdAt: s.createdAt.toISOString(),
            updatedAt: s.updatedAt.toISOString(),
          })),
        }))}
        stations={stations}
        selectedStation={stationId}
        selectedDate={selectedDate}
        isGerant={isGerant}
        statsParPompiste={statsParPompiste.map((s) => ({
          pompisteId: s.pompisteId,
          volumeSold: Number(s._sum.volumeSold || 0),
          revenue: Number(s._sum.revenue || 0),
        }))}
      />
    </div>
  );
}
