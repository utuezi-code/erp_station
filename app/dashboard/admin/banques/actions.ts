"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/rbac";
import { db } from "@/lib/db";

export async function createBankAccount(formData: FormData) {
  await requireRole(["ADMIN"]);

  await db.bankAccount.create({
    data: {
      stationId: formData.get("stationId") as string,
      bankName: formData.get("bankName") as string,
      accountNumber: formData.get("accountNumber") as string,
      rib: (formData.get("rib") as string) || undefined,
    },
  });

  revalidatePath("/dashboard/admin/banques");
}

export async function updateBankAccount(id: string, formData: FormData) {
  await requireRole(["ADMIN"]);

  await db.bankAccount.update({
    where: { id },
    data: {
      stationId: formData.get("stationId") as string,
      bankName: formData.get("bankName") as string,
      accountNumber: formData.get("accountNumber") as string,
      rib: (formData.get("rib") as string) || undefined,
    },
  });

  revalidatePath("/dashboard/admin/banques");
}

export async function deleteBankAccount(id: string) {
  await requireRole(["ADMIN"]);

  await db.bankAccount.delete({ where: { id } });
  revalidatePath("/dashboard/admin/banques");
}
