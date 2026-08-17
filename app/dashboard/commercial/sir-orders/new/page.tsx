import { requireRole } from "@/lib/rbac";
import { db } from "@/lib/db";
import { serialize } from "@/lib/serialize";
import { NewSIROrderClient } from "./new-client";

export default async function NewSIROrderPage({ searchParams }: { searchParams: Promise<{ proposalId?: string }> }) {
  await requireRole(["DIRECTION_COMMERCIALE", "ADMIN"]);
  const params = await searchParams;

  const [proposals, fuels, suppliers] = await Promise.all([
    db.purchaseProposal.findMany({
      where: { status: "VALIDE", sirOrders: { none: { status: { not: "ANNULE" } } } },
      include: {
        fuel: { select: { id: true, name: true, code: true } },
        budgetAllocation: { select: { allocatedAmount: true } },
      },
    }),
    db.fuel.findMany({ where: { active: true }, select: { id: true, name: true, code: true } }),
    db.supplier.findMany({ where: { active: true }, select: { id: true, name: true, code: true } }),
  ]);

  return <NewSIROrderClient proposals={serialize(proposals)} fuels={fuels} suppliers={suppliers} preselectedProposalId={params.proposalId} />;
}
