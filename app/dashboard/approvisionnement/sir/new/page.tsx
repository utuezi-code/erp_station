import { requireRole } from "@/lib/rbac";
import { db } from "@/lib/db";
import Link from "next/link";
import { NewSIRClient } from "./new-sir-client";

export default async function NewSIRPage() {
  await requireRole(["ADMIN", "RESPONSABLE_SERVICE", "DIRECTION_FINANCIERE", "DIRECTION_GENERALE"]);

  const fuels = await db.fuel.findMany({
    where: { active: true },
    select: { id: true, name: true, code: true, unit: true, purchasePrice: true },
  });

  return (
    <div>
      <div className="mb-6">
        <p className="text-xs text-gray-400">
          <Link href="/dashboard/approvisionnement" className="hover:underline">Approvisionnement</Link>
          {" / "}
          <Link href="/dashboard/approvisionnement/sir" className="hover:underline">Achats SIR</Link>
          {" / "}Nouvel achat
        </p>
        <h1 className="text-2xl font-bold text-gray-900 mt-0.5">Enregistrer un achat à la SIR</h1>
      </div>
      <NewSIRClient fuels={fuels.map((f) => ({ ...f, purchasePrice: Number(f.purchasePrice) }))} />
    </div>
  );
}
