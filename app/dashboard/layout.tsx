import { requireAuth } from "@/lib/rbac";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Role } from "@prisma/client";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await requireAuth();
  const user = session.user as any;

  return (
    <DashboardShell userRole={user.role as Role} userName={user.name || user.email || "Utilisateur"}>
      {children}
    </DashboardShell>
  );
}
