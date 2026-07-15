"use server";

import { db } from "@/lib/db";
import { requireRole } from "@/lib/rbac";
import { writeAuditLog } from "@/lib/audit";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const fuelSchema = z.object({
  name: z.string().min(2),
  code: z.string().min(2).toUpperCase(),
  salePrice: z.coerce.number().positive(),
  purchasePrice: z.coerce.number().positive(),
  tva: z.coerce.number().min(0).max(100),
  unit: z.string().default("litre"),
});

export async function createFuel(formData: FormData) {
  const session = await requireRole(["ADMIN", "DIRECTION_GENERALE"]);

  const data = fuelSchema.parse({
    name: formData.get("name"),
    code: formData.get("code"),
    salePrice: formData.get("salePrice"),
    purchasePrice: formData.get("purchasePrice"),
    tva: formData.get("tva") || 18,
    unit: formData.get("unit") || "litre",
  });

  const margin = data.salePrice - data.purchasePrice;

  const fuel = await db.fuel.create({
    data: { ...data, margin },
  });

  await writeAuditLog({
    userId: (session.user as any).id,
    entity: "Fuel",
    entityId: fuel.id,
    action: "CREATE",
    after: { name: fuel.name, salePrice: fuel.salePrice },
  });

  revalidatePath("/dashboard/admin/fuels");
  return { success: true };
}

export async function updateFuel(id: string, formData: FormData) {
  const session = await requireRole(["ADMIN", "DIRECTION_GENERALE"]);

  const data = fuelSchema.parse({
    name: formData.get("name"),
    code: formData.get("code"),
    salePrice: formData.get("salePrice"),
    purchasePrice: formData.get("purchasePrice"),
    tva: formData.get("tva") || 18,
    unit: formData.get("unit") || "litre",
  });

  const margin = data.salePrice - data.purchasePrice;
  const before = await db.fuel.findUnique({ where: { id } });

  const fuel = await db.fuel.update({
    where: { id },
    data: { ...data, margin, active: formData.get("active") !== "false" },
  });

  await writeAuditLog({
    userId: (session.user as any).id,
    entity: "Fuel",
    entityId: id,
    action: "UPDATE",
    before: { salePrice: before?.salePrice },
    after: { salePrice: fuel.salePrice },
  });

  revalidatePath("/dashboard/admin/fuels");
  return { success: true };
}
