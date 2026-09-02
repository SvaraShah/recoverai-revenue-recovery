import { useState } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import Header from "./Header";
import { cn } from "@/lib/utils";

export default function AppShell() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
      />
      <Header sidebarCollapsed={sidebarCollapsed} />
      <main
        className={cn(
          "pt-16 min-h-screen transition-all duration-200",
          sidebarCollapsed ? "ml-[64px]" : "ml-[230px]"
        )}
      >
        <div className="p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
