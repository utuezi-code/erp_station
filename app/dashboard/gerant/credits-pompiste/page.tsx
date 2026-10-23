"use server";

import { requireRole } from "@/lib/rbac";
import { db } from "@/lib/db";
import { serialize } from "@/lib/serialize";
import { CreditsClient } from "./credits-client";

export default async function CreditsPompistePage() {
  const session = await requireRole(["ADMIN", "GERANT"]);
  const stationId = (session.user as any).stationId as string;

  const [pompistes, ventes] = await Promise.all([
    db.pompiste.findMany({
      where: { stationId, active: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    db.venteCreditPompiste.findMany({
      where: { stationId },
      include: { pompiste: { select: { name: true } } },
      orderBy: [{ paid: "asc" }, { date: "desc" }],
    }),
  ]);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Ventes à crédit pompistes</h1>
        <p className="text-gray-500 mt-1">Suivez les ventes faites à crédit et enregistrez les encaissements.</p>
      </div>
      <CreditsClient
        stationId={stationId}
        pompistes={serialize(pompistes)}
        ventes={serialize(ventes)}
      />
    </div>
  );
}
