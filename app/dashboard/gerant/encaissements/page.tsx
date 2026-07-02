import { requireRole } from "@/lib/rbac";
import { db } from "@/lib/db";
import { EncaissementsClient } from "./encaissements-client";

export default async function EncaissementsPage({ searchParams }: { searchParams: Promise<{ date?: string }> }) {
  const session = await requireRole(["ADMIN", "GERANT"]);
  const user = session.user as any;
  const stationId = user.stationId;
  const today = new Date().toISOString().split("T")[0];
  const selectedDate = (await searchParams).date || today;

  if (!stationId) return <p className="text-gray-500">Aucune station assignée.</p>;

  const [station, collections] = await Promise.all([
    db.station.findUnique({ where: { id: stationId }, select: { id: true, name: true } }),
    db.cashCollection.findMany({
      where: { stationId, date: new Date(selectedDate) },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Encaissements</h1>
        <p className="text-gray-500 mt-1">{station?.name}</p>
      </div>
      <EncaissementsClient stationId={stationId} selectedDate={selectedDate} collections={collections as any} />
    </div>
  );
}
