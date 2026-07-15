import { requireRole } from "@/lib/rbac";
import { db } from "@/lib/db";
import Link from "next/link";
import { Plus } from "lucide-react";
import { SIRClient } from "./sir-client";
import { serialize } from "@/lib/serialize";

export default async function SIRPage() {
  const session = await requireRole(["ADMIN", "RESPONSABLE_SERVICE", "DIRECTION_FINANCIERE", "DIRECTION_GENERALE"]);
  const canCreate = ["ADMIN", "RESPONSABLE_SERVICE", "DIRECTION_GENERALE"].includes((session.user as any).role);

  const [purchases, fuels] = await Promise.all([
    db.sIRPurchase.findMany({
      orderBy: { purchaseDate: "desc" },
      include: { fuel: { select: { name: true, code: true, unit: true } } },
    }),
    db.fuel.findMany({ where: { active: true }, select: { id: true, name: true, code: true } }),
  ]);

  const totalAchats = purchases.reduce((s, p) => s + Number(p.totalAmount), 0);
  const totalLitres = purchases.reduce((s, p) => s + Number(p.quantity), 0);
  const enCours = purchases.filter((p) => p.status === "COMMANDE").length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <p className="text-xs text-gray-400">
            <Link href="/dashboard/approvisionnement" className="hover:underline">Approvisionnement</Link> / Achats SIR
          </p>
          <h1 className="text-2xl font-bold text-gray-900 mt-0.5">Achats à la SIR</h1>
          <p className="text-gray-500 mt-0.5 text-sm">Historique des approvisionnements IvoryÉnergies chez la SIR</p>
        </div>
        {canCreate && (
          <Link href="/dashboard/approvisionnement/sir/new">
            <button className="bg-[#0369A1] hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-xl flex items-center gap-2 transition-colors">
              <Plus className="w-4 h-4" /> Nouvel achat SIR
            </button>
          </Link>
        )}
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Total acheté", value: `${totalAchats.toLocaleString("fr-CI")} FCFA` },
          { label: "Volume total", value: `${totalLitres.toLocaleString("fr-CI")} L` },
          { label: "En attente livraison", value: String(enCours) },
        ].map((k) => (
          <div key={k.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <p className="text-xs text-gray-400 uppercase tracking-wide font-medium">{k.label}</p>
            <p className="text-2xl font-bold text-gray-900 mt-1 tabular-nums">{k.value}</p>
          </div>
        ))}
      </div>

      <SIRClient purchases={serialize(purchases)} fuels={fuels} canCreate={canCreate} />
    </div>
  );
}
