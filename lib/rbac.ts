import { Role } from "@prisma/client";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export const ROLE_LABELS: Record<Role, string> = {
  ADMIN: "Administrateur",
  GERANT: "Gérant de station",
  DIRECTION_COMMERCIALE: "Direction Commerciale",
  DIRECTION_FINANCIERE: "Direction Financière",
  DIRECTION_GENERALE: "Direction Générale",
  RESPONSABLE_SERVICE: "Responsable de service",
};

export async function requireAuth() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  return session;
}

export async function requireRole(roles: Role[]) {
  const session = await requireAuth();
  const userRole = (session.user as any).role as Role;
  if (!roles.includes(userRole)) redirect("/unauthorized");
  return session;
}

export function canManageUsers(role: Role) {
  return role === "ADMIN";
}

export function canViewAllStations(role: Role) {
  return ["ADMIN", "DIRECTION_COMMERCIALE", "DIRECTION_FINANCIERE", "DIRECTION_GENERALE"].includes(role);
}

export function canValidateVersements(role: Role) {
  return ["ADMIN", "DIRECTION_FINANCIERE"].includes(role);
}

export function canValidateData(role: Role) {
  return ["ADMIN", "DIRECTION_COMMERCIALE"].includes(role);
}

export function canSaisirData(role: Role) {
  return ["ADMIN", "GERANT"].includes(role);
}
