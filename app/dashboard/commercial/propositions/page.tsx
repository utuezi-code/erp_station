import { requireRole } from "@/lib/rbac";
import { db } from "@/lib/db";
import { serialize } from "@/lib/serialize";
import { PropositionsClient } from "./propositions-client";

export default async function PropositionsPage() {
  const session = await requireRole(["DIRECTION_COMMERCIALE", "DIRECTION_GENERALE", "ADMIN"]);
  const user = session.user as any;
  const role = user.role as string;

  const [proposals, allocations, fuels] = await Promise.all([
    db.purchaseProposal.findMany({
      include: {
        user: { select: { name: true } },
        fuel: { select: { name: true, code: true } },
        budgetAllocation: { select: { allocatedAmount: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    db.budgetAllocation.findMany({
      where: {
        budgetRequest: { status: "ACCORDE" },
        proposals: { none: { status: { in: ["EN_ATTENTE", "VALIDE"] } } },
      },
      include: {
        budgetRequest: { include: { items: { include: { fuel: { select: { name: true, code: true } } } } } },
      },
    }),
    db.fuel.findMany({ where: { active: true }, select: { id: true, name: true, code: true } }),
  ]);

  return <PropositionsClient proposals={serialize(proposals)} allocations={serialize(allocations)} fuels={fuels} role={role} />;
}
