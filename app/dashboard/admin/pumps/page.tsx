import { requireRole } from "@/lib/rbac";
import { db } from "@/lib/db";
import { PumpsClientPage } from "./pumps-client";

export default async function PumpsPage() {
  await requireRole(["ADMIN"]);

  const [stations, fuels, pumps, tanks] = await Promise.all([
    db.station.findMany({ where: { status: "ACTIVE" }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    db.fuel.findMany({ where: { active: true }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    db.pump.findMany({
      include: {
        station: { select: { name: true } },
        nozzles: { include: { fuel: { select: { name: true } } } },
      },
      orderBy: [{ station: { name: "asc" } }, { number: "asc" }],
    }),
    db.tank.findMany({
      include: {
        station: { select: { name: true } },
        fuel: { select: { name: true } },
      },
      orderBy: [{ station: { name: "asc" } }, { name: "asc" }],
    }),
  ]);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Pompes & Cuves</h1>
        <p className="text-gray-500 mt-1">Gestion des équipements des stations</p>
      </div>
      <PumpsClientPage stations={stations} fuels={fuels} pumps={pumps as any} tanks={tanks as any} />
    </div>
  );
}
