import { requireRole } from "@/lib/rbac";
import { db } from "@/lib/db";
import Link from "next/link";
import { Plus } from "lucide-react";
import { serialize } from "@/lib/serialize";
import { MDClient } from "./md-client";

export default async function MisesADispositionPage() {
  const session = await requireRole(["ADMIN", "RESPONSABLE_SERVICE", "DIRECTION_FINANCIERE", "DIRECTION_GENERALE", "GERANT"]);
  const role = (session.user as any).role as string;
  const canCreate = ["ADMIN", "RESPONSABLE_SERVICE", "DIRECTION_GENERALE"].includes(role);

  const [mds, fuels, stations] = await Promise.all([
    db.miseADisposition.findMany({
      orderBy: { date: "desc" },
      include: {
        station: { select: { name: true, code: true } },
        fuel: { select: { name: true, code: true, unit: true } },
      },
    }),
    db.fuel.findMany({ where: { active: true }, select: { id: true, name: true, code: true } }),
    db.station.findMany({ where: { status: "ACTIVE" }, select: { id: true, name: true, code: true } }),
  ]);

  const totalEmis = mds.filter((m) => m.status === "EMISE").length;
  const totalMontant = mds.reduce((s, m) => s + Number(m.totalAmount), 0);
  const totalVolume = mds.reduce((s, m) => s + Number(m.quantity), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <p className="text-xs text-gray-400">
            <Link href="/dashboard/approvisionnement" className="hover:underline">Approvisionnement</Link> / Mises à disposition
          </p>
          <h1 className="text-2xl font-bold text-gray-900 mt-0.5">Mises à disposition</h1>
          <p className="text-gray-500 text-sm mt-0.5">Livraisons du stock GESTOCI vers les stations</p>
        </div>
        {canCreate && (
          <Link href="/dashboard/approvisionnement/mises-a-disposition/new">
            <button className="bg-[#0369A1] hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-xl flex items-center gap-2 transition-colors">
              <Plus className="w-4 h-4" /> Nouvelle mise à disposition
            </button>
          </Link>
        )}
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "En cours (Émises)", value: String(totalEmis), highlight: totalEmis > 0 },
          { label: "Volume total livré", value: `${totalVolume.toLocaleString("fr-CI")} L` },
          { label: "Montant total", value: `${totalMontant.toLocaleString("fr-CI")} FCFA` },
        ].map((k) => (
          <div key={k.label} className={`bg-white rounded-2xl border shadow-sm p-5 ${k.highlight ? "border-blue-200" : "border-gray-100"}`}>
            <p className="text-xs text-gray-400 uppercase tracking-wide font-medium">{k.label}</p>
            <p className={`text-2xl font-bold mt-1 tabular-nums ${k.highlight ? "text-blue-600" : "text-gray-900"}`}>{k.value}</p>
          </div>
        ))}
      </div>

      <MDClient mds={serialize(mds)} fuels={fuels} stations={stations} canCreate={canCreate} />
    </div>
  );
}
