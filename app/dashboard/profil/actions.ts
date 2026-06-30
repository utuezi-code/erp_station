"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";

export async function updateName(formData: FormData) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const userId = (session.user as any).id as string;
  const name = formData.get("name") as string;
  if (!name || name.trim().length < 2) {
    return { error: "Le nom doit comporter au moins 2 caractères." };
  }
  await db.user.update({ where: { id: userId }, data: { name: name.trim() } });
  return { success: true };
}

export async function updatePassword(formData: FormData) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const userId = (session.user as any).id as string;

  const oldPassword = formData.get("oldPassword") as string;
  const newPassword = formData.get("newPassword") as string;
  const confirmPassword = formData.get("confirmPassword") as string;

  if (!oldPassword || !newPassword || !confirmPassword) {
    return { error: "Tous les champs sont requis." };
  }
  if (newPassword !== confirmPassword) {
    return { error: "Les mots de passe ne correspondent pas." };
  }
  if (newPassword.length < 6) {
    return { error: "Le nouveau mot de passe doit comporter au moins 6 caractères." };
  }

  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user?.password) return { error: "Aucun mot de passe défini sur ce compte." };

  const valid = await bcrypt.compare(oldPassword, user.password);
  if (!valid) return { error: "Mot de passe actuel incorrect." };

  const hashed = await bcrypt.hash(newPassword, 10);
  await db.user.update({ where: { id: userId }, data: { password: hashed } });
  return { success: true };
}
