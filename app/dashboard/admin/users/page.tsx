import { serialize } from "@/lib/serialize";
import { requireRole } from "@/lib/rbac";
import { db } from "@/lib/db";
import { UsersClientPage } from "./users-client";

export default async function UsersPage() {
  await requireRole(["ADMIN", "DIRECTION_GENERALE"]);

  const [users, stations] = await Promise.all([
    db.user.findMany({
      include: { station: { select: { id: true, name: true } } },
      orderBy: { createdAt: "desc" },
    }),
    db.station.findMany({
      where: { status: "ACTIVE" },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Gestion des utilisateurs</h1>
        <p className="text-gray-500 mt-1">{users.length} utilisateur(s) enregistré(s)</p>
      </div>
      <UsersClientPage users={serialize(users)} stations={stations} />
    </div>
  );
}
