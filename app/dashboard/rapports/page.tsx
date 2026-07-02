import { requireRole } from "@/lib/rbac";
import { db } from "@/lib/db";
import { RapportsClient } from "./rapports-client";

export default async function RapportsPage({
  searchParams,
}: {
  searchParams: Promise<{ stationId?: string; period?: string }>;
}) {
  await requireRole(["ADMIN", "GERANT", "DIRECTION_COMMERCIALE", "DIRECTION_FINANCIERE", "DIRECTION_GENERALE"]);
  const params = await searchParams;

  const today = new Date();
  const defaultPeriod = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
  const period = params.period || defaultPeriod;
  const stationId = params.stationId || "";

  const stations = await db.station.findMany({
    where: { status: "ACTIVE" },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Rapports</h1>
        <p className="text-gray-500 mt-1">Génération de rapports PDF et Excel</p>
      </div>
      <RapportsClient
        stations={stations}
        selectedStation={stationId}
        period={period}
      />
    </div>
  );
}
