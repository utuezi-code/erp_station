import { serialize } from "@/lib/serialize";
import { requireRole } from "@/lib/rbac";
import { db } from "@/lib/db";
import { BanquesClient } from "./banques-client";

export default async function BanquesPage() {
  await requireRole(["ADMIN", "DIRECTION_FINANCIERE"]);

  const [accounts, stations] = await Promise.all([
    db.bankAccount.findMany({
      include: {
        station: { select: { name: true, code: true } },
        _count: { select: { versements: true } },
      },
      orderBy: { station: { name: "asc" } },
    }),
    db.station.findMany({
      where: { status: "ACTIVE" },
      select: { id: true, name: true, code: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Comptes bancaires</h2>
        <p className="text-sm text-gray-400 mt-0.5">{accounts.length} compte(s) enregistré(s)</p>
      </div>
      <BanquesClient accounts={serialize(accounts)} stations={stations} />
    </div>
  );
}
