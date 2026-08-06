"use server";

import { db } from "@/lib/db";
import { requireRole } from "@/lib/rbac";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const supplierSchema = z.object({
  name: z.string().min(2),
  code: z.string().min(2).max(20),
  category: z.string().min(1),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  address: z.string().optional(),
  contactName: z.string().optional(),
  paymentTerms: z.string().optional(),
  bankName: z.string().optional(),
  bankAccount: z.string().optional(),
});

export async function saveSupplier(formData: FormData) {
  await requireRole(["ADMIN", "RESPONSABLE_SERVICE", "DIRECTION_COMMERCIALE"]);

  const id = formData.get("id") as string | null;
  const data = supplierSchema.parse({
    name: formData.get("name"),
    code: formData.get("code"),
    category: formData.get("category") || "GENERAL",
    email: formData.get("email") || undefined,
    phone: formData.get("phone") || undefined,
    address: formData.get("address") || undefined,
    contactName: formData.get("contactName") || undefined,
    paymentTerms: formData.get("paymentTerms") || undefined,
    bankName: formData.get("bankName") || undefined,
    bankAccount: formData.get("bankAccount") || undefined,
  });

  if (id) {
    await db.supplier.update({ where: { id }, data });
  } else {
    await db.supplier.create({ data });
  }

  revalidatePath("/dashboard/achats/fournisseurs");
}

export async function toggleSupplierActive(id: string, active: boolean) {
  await requireRole(["ADMIN", "RESPONSABLE_SERVICE", "DIRECTION_COMMERCIALE"]);
  await db.supplier.update({ where: { id }, data: { active } });
  revalidatePath("/dashboard/achats/fournisseurs");
}
