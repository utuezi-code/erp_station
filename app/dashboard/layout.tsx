import { requireAuth } from "@/lib/rbac";
import { Sidebar } from "@/components/layout/sidebar";
import { Role } from "@prisma/client";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await requireAuth();
  const user = session.user as any;

  return (
    <div className="flex h-full">
      <Sidebar userRole={user.role as Role} userName={user.name || user.email || "Utilisateur"} />
      <main className="flex-1 overflow-y-auto bg-gray-50">
        <div className="p-6">{children}</div>
      </main>
    </div>
  );
}
