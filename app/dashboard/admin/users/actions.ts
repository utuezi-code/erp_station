"use server";

import { db } from "@/lib/db";
import { requireRole } from "@/lib/rbac";
import { writeAuditLog } from "@/lib/audit";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const userSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6).optional(),
  role: z.enum(["ADMIN", "GERANT", "DIRECTION_COMMERCIALE", "DIRECTION_FINANCIERE", "DIRECTION_GENERALE", "RESPONSABLE_SERVICE"]),
  stationId: z.string().optional().nullable(),
  active: z.boolean().optional(),
});

export async function createUser(formData: FormData) {
  const session = await requireRole(["ADMIN", "DIRECTION_GENERALE"]);

  const data = userSchema.parse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
    role: formData.get("role"),
    stationId: formData.get("stationId") || null,
    active: true,
  });

  if (!data.password) throw new Error("Mot de passe requis");

  const hashed = await bcrypt.hash(data.password, 12);

  const user = await db.user.create({
    data: {
      name: data.name,
      email: data.email,
      password: hashed,
      role: data.role,
      stationId: data.stationId || null,
      active: true,
    },
  });

  await writeAuditLog({
    userId: (session.user as any).id,
    entity: "User",
    entityId: user.id,
    action: "CREATE",
    after: { name: user.name, email: user.email, role: user.role },
  });

  revalidatePath("/dashboard/admin/users");
  return { success: true };
}

export async function updateUser(id: string, formData: FormData) {
  const session = await requireRole(["ADMIN", "DIRECTION_GENERALE"]);

  const before = await db.user.findUnique({ where: { id } });

  const data = userSchema.parse({
    name: formData.get("name"),
    email: formData.get("email"),
    role: formData.get("role"),
    stationId: formData.get("stationId") || null,
    active: formData.get("active") === "true",
  });

  const updateData: any = {
    name: data.name,
    email: data.email,
    role: data.role,
    stationId: data.stationId || null,
    active: data.active ?? true,
  };

  const newPassword = formData.get("password") as string;
  if (newPassword && newPassword.length >= 6) {
    updateData.password = await bcrypt.hash(newPassword, 12);
  }

  const user = await db.user.update({ where: { id }, data: updateData });

  await writeAuditLog({
    userId: (session.user as any).id,
    entity: "User",
    entityId: id,
    action: "UPDATE",
    before: { name: before?.name, email: before?.email, role: before?.role },
    after: { name: user.name, email: user.email, role: user.role },
  });

  revalidatePath("/dashboard/admin/users");
  return { success: true };
}

export async function deleteUser(id: string) {
  const session = await requireRole(["ADMIN", "DIRECTION_GENERALE"]);
  const currentUserId = (session.user as any).id;
  if (id === currentUserId) throw new Error("Impossible de supprimer votre propre compte.");

  await db.user.update({ where: { id }, data: { active: false } });

  await writeAuditLog({
    userId: currentUserId,
    entity: "User",
    entityId: id,
    action: "DELETE",
  });

  revalidatePath("/dashboard/admin/users");
  return { success: true };
}
