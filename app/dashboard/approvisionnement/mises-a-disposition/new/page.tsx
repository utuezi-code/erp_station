import { requireRole } from "@/lib/rbac";
import { db } from "@/lib/db";
import Link from "next/link";
import { NewMDClient } from "./new-md-client";

export default async function NewMDPage({ searchParams }: { searchParams: Promise<{ orderId?: string }> }) {
  await requireRole(["ADMIN", "RESPONSABLE_SERVICE", "DIRECTION_GENERALE"]);
  const { orderId } = await searchParams;

  const [stations, fuels, stockByFuel, pendingOrders] = await Promise.all([
    db.station.findMany({ where: { status: "ACTIVE" }, select: { id: true, name: true, code: true }, orderBy: { name: "asc" } }),
    db.fuel.findMany({ where: { active: true }, select: { id: true, name: true, code: true, unit: true, salePrice: true } }),
    db.gESTOCIMovement.groupBy({
      by: ["fuelId", "type"],
      _sum: { quantity: true },
    }),
    db.purchaseRequest.findMany({
      where: { status: "VALIDE" },
      select: { id: true, number: true, service: true, station: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
  ]);

  // Calcul stocks disponibles
  const stockMap: Record<string, number> = {};
  for (const s of stockByFuel) {
    if (!stockMap[s.fuelId]) stockMap[s.fuelId] = 0;
    if (s.type === "ENTREE") stockMap[s.fuelId] += Number(s._sum.quantity || 0);
    if (s.type === "SORTIE") stockMap[s.fuelId] -= Number(s._sum.quantity || 0);
  }

  return (
    <div>
      <div className="mb-6">
        <p className="text-xs text-gray-400">
          <Link href="/dashboard/approvisionnement" className="hover:underline">Approvisionnement</Link>
          {" / "}
          <Link href="/dashboard/approvisionnement/mises-a-disposition" className="hover:underline">Mises à disposition</Link>
          {" / "}Nouvelle
        </p>
        <h1 className="text-2xl font-bold text-gray-900 mt-0.5">Nouvelle mise à disposition</h1>
        <p className="text-gray-500 text-sm mt-0.5">Libérer du stock GESTOCI vers une station</p>
      </div>
      <NewMDClient
        stations={stations}
        fuels={fuels.map((f) => ({ ...f, salePrice: Number(f.salePrice), stockDispo: stockMap[f.id] || 0 }))}
        pendingOrders={pendingOrders}
        preOrderId={orderId || ""}
      />
    </div>
  );
}
