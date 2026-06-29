"use server";

import { db } from "@/lib/db";
import { requireRole } from "@/lib/rbac";
import { writeAuditLog } from "@/lib/audit";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const stationSchema = z.object({
  name: z.string().min(2),
  code: z.string().min(2).toUpperCase(),
  address: z.string().optional(),
  city: z.string().optional(),
  regionId: z.string().optional().nullable(),
  status: z.enum(["ACTIVE", "SUSPENDED"]).optional(),
});

export async function createStation(formData: FormData) {
  const session = await requireRole(["ADMIN"]);

  const data = stationSchema.parse({
    name: formData.get("name"),
    code: formData.get("code"),
    address: formData.get("address") || undefined,
    city: formData.get("city") || undefined,
    regionId: formData.get("regionId") || null,
  });

  const station = await db.station.create({
    data: { ...data, status: "ACTIVE" },
  });

  await writeAuditLog({
    userId: (session.user as any).id,
    entity: "Station",
    entityId: station.id,
    action: "CREATE",
    after: { name: station.name, code: station.code },
  });

  revalidatePath("/dashboard/admin/stations");
  return { success: true };
}

export async function updateStation(id: string, formData: FormData) {
  const session = await requireRole(["ADMIN"]);

  const before = await db.station.findUnique({ where: { id } });

  const data = stationSchema.parse({
    name: formData.get("name"),
    code: formData.get("code"),
    address: formData.get("address") || undefined,
    city: formData.get("city") || undefined,
    regionId: formData.get("regionId") || null,
    status: formData.get("status") || "ACTIVE",
  });

  const station = await db.station.update({ where: { id }, data });

  await writeAuditLog({
    userId: (session.user as any).id,
    entity: "Station",
    entityId: id,
    action: "UPDATE",
    before: { name: before?.name, status: before?.status },
    after: { name: station.name, status: station.status },
  });

  revalidatePath("/dashboard/admin/stations");
  return { success: true };
}
