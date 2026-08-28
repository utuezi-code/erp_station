import { requireRole } from "@/lib/rbac";
import { db } from "@/lib/db";
import { ActivityClient } from "./activity-client";
import { serialize } from "@/lib/serialize";

export default async function ActivityPage({
  searchParams,
}: {
  searchParams: Promise<{ userId?: string; entity?: string; action?: string; page?: string }>;
}) {
  await requireRole(["DIRECTION_GENERALE", "ADMIN"]);
  const params = await searchParams;

  const page = Math.max(1, parseInt(params.page || "1"));
  const limit = 50;
  const skip = (page - 1) * limit;

  const where: any = {};
  if (params.userId) where.userId = params.userId;
  if (params.entity) where.entity = params.entity;
  if (params.action) where.action = params.action;

  const [logs, total, users] = await Promise.all([
    db.auditLog.findMany({
      where,
      include: { user: { select: { id: true, name: true, role: true } } },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    db.auditLog.count({ where }),
    db.user.findMany({
      where: { active: true },
      select: { id: true, name: true, role: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <ActivityClient
      logs={serialize(logs)}
      total={total}
      page={page}
      limit={limit}
      users={users}
      filters={{ userId: params.userId, entity: params.entity, action: params.action }}
    />
  );
}
