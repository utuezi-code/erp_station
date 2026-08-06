import { requireRole } from "@/lib/rbac";
import { db } from "@/lib/db";
import { serialize } from "@/lib/serialize";
import { DemandesClient } from "./demandes-client";

export default async function DemandesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const session = await requireRole(["ADMIN", "RESPONSABLE_SERVICE", "GERANT", "DIRECTION_COMMERCIALE", "DIRECTION_FINANCIERE", "DIRECTION_GENERALE"]);
  const params = await searchParams;
  const user = session.user as any;
  const role = user.role as string;

  const where: any = {};
  if (params.status) where.status = params.status;
  if (role === "GERANT") where.stationId = user.stationId;

  const requests = await db.purchaseRequest.findMany({
    where,
    include: {
      station: { select: { name: true } },
      user: { select: { name: true } },
      items: true,
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return (
    <DemandesClient
      requests={serialize(requests)}
      role={role}
      statusFilter={params.status || ""}
    />
  );
}
