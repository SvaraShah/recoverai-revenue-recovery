import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  ArrowLeftRight,
  Sparkles,
  BrainCircuit,
  Megaphone,
  BarChart3,
  Settings,
  ChevronLeft,
  ChevronRight,
  History,
  Hexagon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useFetch } from "@/hooks/useFetch";

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

interface AIStatus {
  engine: string;
  model: string | null;
  available: boolean;
}

const navItems = [
  { path: "/", label: "Overview", icon: LayoutDashboard },
  { path: "/transactions", label: "Transactions", icon: ArrowLeftRight },
  { path: "/recovery", label: "Recovery", icon: Sparkles },
  { path: "/insights", label: "AI Insights", icon: BrainCircuit },
  { path: "/campaigns", label: "Campaigns", icon: Megaphone },
  { path: "/analytics", label: "Analytics", icon: BarChart3 },
  { path: "/audit", label: "Audit Trail", icon: History },
  { path: "/settings", label: "Settings", icon: Settings },
];

export default function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const location = useLocation();

  const { data: aiStatus } = useFetch<AIStatus>(
    () => fetch("/api/ai/status").then((res) => res.json()).catch(() => ({ engine: "groq", model: "openai/gpt-oss-120b", available: true })),
    []
  );

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-40 h-screen bg-white text-slate-700 border-r border-slate-200/80 transition-all duration-200 flex flex-col justify-between select-none shadow-2xs",
        collapsed ? "w-[64px]" : "w-[230px]"
      )}
    >
      {/* Top Navigation */}
      <div>
        {/* Brand Header */}
        <div className="flex h-16 items-center border-b border-slate-100 px-4 justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-purple-600 text-white shrink-0 shadow-xs">
              <Hexagon className="h-5 w-5 fill-white text-purple-600" />
            </div>
            {!collapsed && (
              <div className="overflow-hidden">
                <span className="text-sm font-black text-slate-900 tracking-tight leading-none block">
                  RecoverAI
                </span>
                <span className="text-[10px] font-medium text-slate-400 block mt-0.5">
                  Revenue Recovery
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Nav List */}
        <nav className="px-3 py-4 space-y-1">
          {navItems.map((item) => {
            const isActive =
              item.path === "/"
                ? location.pathname === "/"
                : location.pathname.startsWith(item.path);

            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={cn(
                  "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-semibold transition-all duration-150",
                  isActive
                    ? "bg-purple-50 text-purple-700 font-bold"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                )}
              >
                <item.icon
                  className={cn(
                    "h-4 w-4 shrink-0 transition-colors",
                    isActive ? "text-purple-600" : "text-slate-400 group-hover:text-slate-600"
                  )}
                />
                {!collapsed && <span>{item.label}</span>}
              </NavLink>
            );
          })}
        </nav>
      </div>

      {/* Bottom Infrastructure Card & Footer */}
      <div className="border-t border-slate-100 p-3 space-y-3">
        {!collapsed && (
          <>
            <div className="rounded-xl bg-slate-50 p-3 border border-slate-200/60 text-[11px] space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900">AI Engine</span>
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full border border-emerald-200">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Live
                </span>
              </div>
              <div className="text-[10px] text-slate-500 font-medium space-y-0.5">
                <p>Powered by Groq</p>
                <p className="font-mono text-slate-400">{aiStatus?.model || "openai/gpt-oss-120b"}</p>
              </div>

              {/* Sparkline Svg */}
              <div className="h-6 w-full pt-1">
                <svg className="w-full h-full text-purple-500 overflow-visible" viewBox="0 0 100 20">
                  <path
                    d="M0 15 Q20 5 40 12 T80 6 T100 10"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  />
                  <circle cx="100" cy="10" r="3" className="fill-purple-600" />
                </svg>
              </div>

              <div className="flex items-center gap-1.5 pt-1 text-[10px] font-bold text-slate-700">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                All systems operational
              </div>
            </div>

            <div className="text-[10px] text-slate-400 text-center leading-tight">
              © 2026 RecoverAI<br />All rights reserved
            </div>
          </>
        )}

        <button
          onClick={onToggle}
          className="flex w-full items-center justify-center rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </button>
      </div>
    </aside>
  );
}
