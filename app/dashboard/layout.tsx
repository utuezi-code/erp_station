import { requireAuth } from "@/lib/rbac";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { Role } from "@prisma/client";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await requireAuth();
  const user = session.user as any;

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <Sidebar userRole={user.role as Role} userName={user.name || user.email || "Utilisateur"} />
      <div className="flex flex-col flex-1 overflow-hidden">
        <Topbar />
        <main className="flex-1 overflow-y-auto">
          <div className="p-6">{children}</div>
        </main>
      </div>
    </div>
  );
}
