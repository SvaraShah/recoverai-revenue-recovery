import { useLocation } from "react-router-dom";
import { Bell, Search, User } from "lucide-react";
import { cn } from "@/lib/utils";

const pageTitles: Record<string, { title: string; subtitle: string }> = {
  "/": { title: "Overview", subtitle: "Revenue recovery dashboard" },
  "/transactions": { title: "Transactions", subtitle: "Monitor and analyze payment transactions" },
  "/recovery": { title: "Recovery Opportunities", subtitle: "AI-identified revenue recovery targets" },
  "/insights": { title: "AI Insights", subtitle: "Intelligent patterns and recommendations" },
  "/campaigns": { title: "Recovery Campaigns", subtitle: "Manage grouped recovery efforts" },
  "/analytics": { title: "Analytics", subtitle: "Revenue recovery performance metrics" },
  "/settings": { title: "Settings", subtitle: "Configure platform preferences" },
};

interface HeaderProps {
  sidebarCollapsed: boolean;
}

export default function Header({ sidebarCollapsed }: HeaderProps) {
  const location = useLocation();
  const pageInfo = pageTitles[location.pathname] || pageTitles["/"];

  return (
    <header
      className={cn(
        "fixed top-0 right-0 z-30 flex h-16 items-center justify-between border-b border-slate-200 bg-white/80 backdrop-blur-sm px-6 transition-all duration-300",
        sidebarCollapsed ? "left-[68px]" : "left-[240px]"
      )}
    >
      {/* Page Title */}
      <div>
        <h2 className="text-lg font-semibold text-slate-900">{pageInfo.title}</h2>
        <p className="text-xs text-slate-500">{pageInfo.subtitle}</p>
      </div>

      {/* Right Section */}
      <div className="flex items-center gap-3">
        {/* Search */}
        <div className="relative hidden md:block">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search transactions..."
            className="h-9 w-64 rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-4 text-sm text-slate-700 placeholder:text-slate-400 outline-none focus:border-blue-300 focus:bg-white focus:ring-2 focus:ring-blue-100 transition-all"
          />
        </div>

        {/* Notifications */}
        <button className="relative flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 transition-colors">
          <Bell className="h-[18px] w-[18px]" />
          <span className="absolute right-1.5 top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-blue-600 text-[10px] font-bold text-white">
            3
          </span>
        </button>

        {/* Divider */}
        <div className="h-8 w-px bg-slate-200" />

        {/* User */}
        <button className="flex items-center gap-2.5 rounded-lg p-1.5 hover:bg-slate-50 transition-colors">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white">
            <User className="h-4 w-4" />
          </div>
          <div className="hidden md:block text-left">
            <p className="text-sm font-medium text-slate-700">Admin</p>
            <p className="text-[11px] text-slate-400">TechMart India</p>
          </div>
        </button>
      </div>
    </header>
  );
}
