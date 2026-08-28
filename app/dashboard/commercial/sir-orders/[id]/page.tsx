import { requireRole } from "@/lib/rbac";
import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import { serialize } from "@/lib/serialize";
import { SIROrderDetailClient } from "./detail-client";

export default async function SIROrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireRole(["DIRECTION_COMMERCIALE", "DIRECTION_FINANCIERE", "DIRECTION_GENERALE", "ADMIN"]);
  const user = session.user as any;
  const role = user.role as string;
  const { id } = await params;

  const order = await db.sIROrder.findUnique({
    where: { id },
    include: {
      user: { select: { name: true } },
      supplier: { select: { name: true, email: true } },
      items: { include: { fuel: { select: { id: true, name: true, code: true } } } },
      offers: true,
      payments: { include: { user: { select: { name: true } } } },
      deliveryOrders: { include: { gestociEntries: { include: { fuel: { select: { name: true, code: true } } } } } },
    },
  });

  if (!order) notFound();

  return <SIROrderDetailClient order={serialize(order)} role={role} />;
}
