import { requireRole } from "@/lib/rbac";
import { db } from "@/lib/db";
import { serialize } from "@/lib/serialize";
import { BudgetClient } from "./budget-client";

export default async function BudgetPage() {
  const session = await requireRole(["DIRECTION_COMMERCIALE", "DIRECTION_FINANCIERE", "ADMIN", "DIRECTION_GENERALE"]);
  const user = session.user as any;
  const role = user.role as string;

  const [requests, fuels] = await Promise.all([
    db.budgetRequest.findMany({
      include: {
        user: { select: { name: true } },
        items: { include: { fuel: { select: { name: true, code: true } } } },
        allocation: { include: { user: { select: { name: true } } } },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    db.fuel.findMany({ where: { active: true }, select: { id: true, name: true, code: true } }),
  ]);

  return <BudgetClient requests={serialize(requests)} fuels={fuels} role={role} />;
}
