"use server";

import { db } from "@/lib/db";
import { requireRole } from "@/lib/rbac";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const schema = z.object({
  stationId: z.string(),
  date: z.string(),
  type: z.enum(["ESPECES", "MOBILE_MONEY", "CARTE_BANCAIRE", "BON_CARBURANT", "CREDIT_CLIENT"]),
  amount: z.coerce.number().nonnegative(),
  reference: z.string().optional(),
  note: z.string().optional(),
});

export async function saveEncaissement(formData: FormData) {
  await requireRole(["ADMIN", "GERANT"]);

  const data = schema.parse({
    stationId: formData.get("stationId"),
    date: formData.get("date"),
    type: formData.get("type"),
    amount: formData.get("amount"),
    reference: formData.get("reference") || undefined,
    note: formData.get("note") || undefined,
  });

  await db.cashCollection.create({
    data: { ...data, date: new Date(data.date) },
  });

  revalidatePath("/dashboard/gerant/encaissements");
  return { success: true };
}
