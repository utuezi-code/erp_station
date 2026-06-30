"use server";

import { db } from "@/lib/db";
import { requireRole } from "@/lib/rbac";
import { writeAuditLog } from "@/lib/audit";
import { revalidatePath } from "next/cache";

export async function updateFuelPrice(id: string, formData: FormData) {
  const session = await requireRole(["ADMIN", "DIRECTION_GENERALE"]);

  const salePrice = parseFloat(formData.get("salePrice") as string);
  const purchasePrice = parseFloat(formData.get("purchasePrice") as string);

  if (isNaN(salePrice) || isNaN(purchasePrice) || salePrice <= 0 || purchasePrice <= 0) {
    return { error: "Prix invalides." };
  }

  const before = await db.fuel.findUnique({ where: { id }, select: { salePrice: true, purchasePrice: true, margin: true } });

  const margin = salePrice - purchasePrice;
  await db.fuel.update({ where: { id }, data: { salePrice, purchasePrice, margin } });

  await writeAuditLog({
    userId: (session.user as any).id,
    entity: "Fuel",
    entityId: id,
    action: "UPDATE",
    before: { salePrice: before?.salePrice, purchasePrice: before?.purchasePrice },
    after: { salePrice, purchasePrice, margin },
  });

  revalidatePath("/dashboard/prix-carburants");
  revalidatePath("/dashboard/admin/fuels");
  return { success: true };
}
