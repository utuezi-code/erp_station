"use server";

import { db } from "@/lib/db";
import { requireRole } from "@/lib/rbac";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const pompisteSchema = z.object({
  name: z.string().min(2),
  phone: z.string().optional(),
  matricule: z.string().optional(),
  stationId: z.string(),
});

const shiftSchema = z.object({
  pompisteId: z.string(),
  stationId: z.string(),
  date: z.string(),
  shiftType: z.enum(["MATIN", "APRES_MIDI", "NUIT"]),
  volumeSold: z.coerce.number().nonnegative().optional(),
  revenue: z.coerce.number().nonnegative().optional(),
  note: z.string().optional(),
});

export async function savePompiste(formData: FormData) {
  const session = await requireRole(["ADMIN", "GERANT"]);
  const user = session.user as any;

  const data = pompisteSchema.parse({
    name: formData.get("name"),
    phone: formData.get("phone") || undefined,
    matricule: formData.get("matricule") || undefined,
    stationId: formData.get("stationId"),
  });

  if (user.role === "GERANT" && data.stationId !== user.stationId) {
    throw new Error("Accès refusé.");
  }

  const id = formData.get("id") as string | null;
  if (id) {
    await db.pompiste.update({ where: { id }, data });
  } else {
    await db.pompiste.create({ data });
  }

  revalidatePath("/dashboard/pompistes");
  return { success: true };
}

export async function togglePompiste(id: string, active: boolean) {
  await requireRole(["ADMIN", "GERANT"]);
  await db.pompiste.update({ where: { id }, data: { active } });
  revalidatePath("/dashboard/pompistes");
}

export async function saveShift(formData: FormData) {
  const session = await requireRole(["ADMIN", "GERANT"]);
  const user = session.user as any;

  const data = shiftSchema.parse({
    pompisteId: formData.get("pompisteId"),
    stationId: formData.get("stationId"),
    date: formData.get("date"),
    shiftType: formData.get("shiftType"),
    volumeSold: formData.get("volumeSold") || undefined,
    revenue: formData.get("revenue") || undefined,
    note: formData.get("note") || undefined,
  });

  if (user.role === "GERANT" && data.stationId !== user.stationId) {
    throw new Error("Accès refusé.");
  }

  const date = new Date(data.date);

  await db.pompisteShift.upsert({
    where: { pompisteId_date_shiftType: { pompisteId: data.pompisteId, date, shiftType: data.shiftType } },
    create: { ...data, date },
    update: { volumeSold: data.volumeSold, revenue: data.revenue, note: data.note },
  });

  revalidatePath("/dashboard/pompistes");
  return { success: true };
}
