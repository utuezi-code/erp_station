import { serialize } from "@/lib/serialize";
import { requireRole } from "@/lib/rbac";
import { db } from "@/lib/db";
import { IndexClientPage } from "./index-client";

export default async function IndexPage({ searchParams }: { searchParams: Promise<{ date?: string; stationId?: string }> }) {
  const session = await requireRole(["ADMIN", "GERANT"]);
  const user = session.user as any;
  const params = await searchParams;

  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const selectedDate = params.date || today;
  const isToday = selectedDate === today;
  const selectedStation = params.stationId || user.stationId;

  if (!selectedStation) {
    return (
      <div>
        <h1 className="text-2xl font-bold mb-4">Saisie des index</h1>
        <p className="text-gray-500">Aucune station assignée. Contactez l'administrateur.</p>
      </div>
    );
  }

  const [station, pumps, indexes] = await Promise.all([
    db.station.findUnique({ where: { id: selectedStation }, select: { id: true, name: true } }),
    db.pump.findMany({
      where: { stationId: selectedStation, active: true },
      include: {
        nozzles: {
          where: { active: true },
          include: { fuel: { select: { id: true, name: true, salePrice: true } } },
          orderBy: { number: "asc" },
        },
      },
      orderBy: { number: "asc" },
    }),
    db.dailyIndex.findMany({
      where: {
        stationId: selectedStation,
        date: {
          gte: new Date(selectedDate + "T00:00:00.000Z"),
          lte: new Date(selectedDate + "T23:59:59.999Z"),
        },
      },
    }),
  ]);

  const indexMap = Object.fromEntries(indexes.map((i) => [i.nozzleId, i]));

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Saisie des index pompes</h1>
        <p className="text-gray-500 mt-1">{station?.name} — {new Date(selectedDate).toLocaleDateString("fr-CI", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</p>
      </div>
      <IndexClientPage
        stationId={selectedStation}
        selectedDate={selectedDate}
        pumps={serialize(pumps)}
        indexMap={serialize(indexMap)}
        userRole={user.role}
        isToday={isToday}
      />
    </div>
  );
}
