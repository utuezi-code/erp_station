import { serialize } from "@/lib/serialize";
import { requireRole } from "@/lib/rbac";
import { db } from "@/lib/db";
import { UsersClientPage } from "./users-client";

export default async function UsersPage() {
  await requireRole(["ADMIN", "DIRECTION_GENERALE"]);

  const [users, stations] = await Promise.all([
    db.user.findMany({
      include: {
        station: { select: { id: true, name: true } },
        _count: { select: { auditLogs: true } },
      },
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
      <UsersClientPage users={serialize(users)} stations={stations} />
    </div>
  );
}
