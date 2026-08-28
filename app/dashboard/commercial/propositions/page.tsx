import { requireRole } from "@/lib/rbac";
import { db } from "@/lib/db";
import { serialize } from "@/lib/serialize";
import { PropositionsClient } from "./propositions-client";

export default async function PropositionsPage() {
  const session = await requireRole(["DIRECTION_COMMERCIALE", "DIRECTION_GENERALE", "ADMIN"]);
  const user = session.user as any;
  const role = user.role as string;

  const [proposals, rawAllocations, fuels] = await Promise.all([
    db.purchaseProposal.findMany({
      include: {
        user: { select: { name: true } },
        items: { include: { fuel: { select: { name: true, code: true } } } },
        budgetAllocation: { select: { allocatedAmount: true } },
        sirOrders: { select: { id: true, number: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    db.budgetAllocation.findMany({
      where: { budgetRequest: { status: "ACCORDE" } },
      include: {
        budgetRequest: { select: { number: true } },
        proposals: {
          where: { status: { in: ["EN_ATTENTE", "VALIDE"] } },
          select: { totalAmount: true },
        },
      },
    }),
    db.fuel.findMany({ where: { active: true }, select: { id: true, name: true, code: true } }),
  ]);

  // Calcul budget restant par allocation
  const allocations = rawAllocations
    .map((a) => {
      const used = a.proposals.reduce((s, p) => s + Number(p.totalAmount), 0);
      const remaining = Number(a.allocatedAmount) - used;
      return {
        id: a.id,
        allocatedAmount: Number(a.allocatedAmount),
        remainingAmount: remaining,
        budgetRequest: a.budgetRequest,
      };
    })
    .filter((a) => a.remainingAmount > 0); // masquer si budget épuisé

  return (
    <PropositionsClient
      proposals={serialize(proposals)}
      allocations={allocations}
      fuels={fuels}
      role={role}
    />
  );
}
