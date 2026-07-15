import { serialize } from "@/lib/serialize";
import { requireRole } from "@/lib/rbac";
import { db } from "@/lib/db";
import { Search, Shield } from "lucide-react";
import { AuditClient } from "./audit-client";

export default async function AuditPage({
  searchParams,
}: {
  searchParams: Promise<{ userId?: string; entity?: string; page?: string }>;
}) {
  await requireRole(["ADMIN", "DIRECTION_GENERALE"]);
  const params = await searchParams;

  const page = parseInt(params.page || "1");
  const pageSize = 50;
  const skip = (page - 1) * pageSize;

  const where: any = {};
  if (params.userId) where.userId = params.userId;
  if (params.entity) where.entity = params.entity;

  const [logs, total, users] = await Promise.all([
    db.auditLog.findMany({
      where,
      include: { user: { select: { name: true, email: true } } },
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize,
    }),
    db.auditLog.count({ where }),
    db.user.findMany({ where: { active: true }, select: { id: true, name: true, email: true }, orderBy: { name: "asc" } }),
  ]);

  const entities = await db.auditLog.findMany({
    select: { entity: true },
    distinct: ["entity"],
    orderBy: { entity: "asc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-xl bg-slate-100">
          <Shield className="w-5 h-5 text-slate-600" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-900">Journal d'audit</h2>
          <p className="text-sm text-gray-400">{total} action(s) enregistrée(s)</p>
        </div>
      </div>

      <AuditClient
        logs={serialize(logs)}
        users={users}
        entities={entities.map((e) => e.entity)}
        total={total}
        page={page}
        pageSize={pageSize}
        filters={{ userId: params.userId || "", entity: params.entity || "" }}
      />
    </div>
  );
}
