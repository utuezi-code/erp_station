"use server";

import { db } from "@/lib/db";
import { requireRole } from "@/lib/rbac";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const pumpSchema = z.object({
  stationId: z.string(),
  name: z.string().min(1),
  number: z.coerce.number().int().positive(),
});

const nozzleSchema = z.object({
  pumpId: z.string(),
  fuelId: z.string(),
  number: z.coerce.number().int().positive(),
});

const tankSchema = z.object({
  stationId: z.string(),
  fuelId: z.string(),
  name: z.string().min(1),
  capacity: z.coerce.number().positive(),
  alertLevel: z.coerce.number().positive(),
});

export async function createPump(formData: FormData) {
  await requireRole(["ADMIN"]);
  const data = pumpSchema.parse({
    stationId: formData.get("stationId"),
    name: formData.get("name"),
    number: formData.get("number"),
  });
  await db.pump.create({ data });
  revalidatePath("/dashboard/admin/pumps");
  return { success: true };
}

export async function createNozzle(formData: FormData) {
  await requireRole(["ADMIN"]);
  const data = nozzleSchema.parse({
    pumpId: formData.get("pumpId"),
    fuelId: formData.get("fuelId"),
    number: formData.get("number"),
  });
  await db.nozzle.create({ data });
  revalidatePath("/dashboard/admin/pumps");
  return { success: true };
}

export async function createTank(formData: FormData) {
  await requireRole(["ADMIN"]);
  const data = tankSchema.parse({
    stationId: formData.get("stationId"),
    fuelId: formData.get("fuelId"),
    name: formData.get("name"),
    capacity: formData.get("capacity"),
    alertLevel: formData.get("alertLevel"),
  });
  await db.tank.create({ data });
  revalidatePath("/dashboard/admin/pumps");
  return { success: true };
}
