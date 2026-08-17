import { requireRole } from "@/lib/rbac";
import { db } from "@/lib/db";
import { serialize } from "@/lib/serialize";
import { SIROrdersClient } from "./sir-orders-client";

export default async function SIROrdersPage() {
  const session = await requireRole(["DIRECTION_COMMERCIALE", "DIRECTION_FINANCIERE", "DIRECTION_GENERALE", "ADMIN"]);
  const user = session.user as any;
  const role = user.role as string;

  const orders = await db.sIROrder.findMany({
    include: {
      user: { select: { name: true } },
      items: { include: { fuel: { select: { name: true, code: true } } } },
      offers: true,
      payments: true,
      deliveryOrders: true,
      supplier: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return <SIROrdersClient orders={serialize(orders)} role={role} />;
}
