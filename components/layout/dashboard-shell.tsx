"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";
import { MobileBottomNav } from "./mobile-bottom-nav";
import { Role } from "@prisma/client";

interface Props {
  userRole: Role;
  userName: string;
  children: React.ReactNode;
}

export function DashboardShell({ userRole, userName, children }: Props) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();

  // Auto-close sidebar on navigation
  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  return (
    <div className="flex h-dvh overflow-hidden bg-slate-50/80">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-slate-900/50 backdrop-blur-[2px] lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar wrapper:
          - Mobile: fixed full-height drawer, slides in from left
          - Desktop: static sidebar in the flex row */}
      <div
        className={[
          // Positioning
          "fixed inset-y-0 left-0 z-30",
          "lg:relative lg:inset-auto lg:z-auto",
          // Height — inset-y-0 handles it on mobile; h-full on desktop
          "lg:h-full",
          // Slide animation on mobile
          "transition-transform duration-300 ease-in-out",
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
          // Width matches sidebar inner width
          "w-72 lg:w-auto",
          collapsed ? "lg:w-[68px]" : "lg:w-64",
        ].join(" ")}
      >
        <Sidebar
          userRole={userRole}
          userName={userName}
          collapsed={collapsed}
          onCollapse={() => setCollapsed((v) => !v)}
          onClose={() => setSidebarOpen(false)}
        />
      </div>

      {/* Main content */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <Topbar
          onMenuClick={() => setSidebarOpen((v) => !v)}
          userRole={userRole}
          userName={userName}
        />
        <main className="flex-1 overflow-y-auto overscroll-contain">
          <div className="p-4 sm:p-6 max-w-screen-2xl mx-auto pb-20 lg:pb-6">
            {children}
          </div>
        </main>
      </div>

      {/* Mobile bottom navigation */}
      <MobileBottomNav userRole={userRole} />
    </div>
  );
}
