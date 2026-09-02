import { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Bell, Search, RefreshCw, Sparkles, ShieldAlert, CheckCircle2, ArrowRight, X } from "lucide-react";
import { cn, formatCurrency, formatDate, getStatusColor } from "@/lib/utils";
import { transactionsApi, recoveryApi } from "@/lib/api";
import type { Transaction, RecoveryOpportunity } from "@/types";
import AIAnalysisModal from "@/components/AIAnalysisModal";

const pageTitles: Record<string, { title: string; subtitle: string }> = {
  "/": { title: "Overview", subtitle: "Real-time revenue recovery operations and AI insights" },
  "/transactions": { title: "Transactions", subtitle: "Monitor, analyze and recover failed payment transactions" },
  "/recovery": { title: "Recovery", subtitle: "AI-scored opportunity pipeline and execution queue" },
  "/insights": { title: "AI Insights", subtitle: "Intelligent root cause diagnosis and recommendations" },
  "/campaigns": { title: "Campaigns", subtitle: "Grouped recovery outreach campaigns" },
  "/analytics": { title: "Analytics", subtitle: "Revenue realization rates and recovery funnel metrics" },
  "/settings": { title: "Settings", subtitle: "Configure platform guardrails and AI preferences" },
  "/audit": { title: "Audit Trail", subtitle: "Verifiable logs of AI decisions and policy checks" },
};

interface HeaderProps {
  sidebarCollapsed: boolean;
}

export default function Header({ sidebarCollapsed }: HeaderProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const pageInfo = pageTitles[location.pathname] || pageTitles["/"];

  // Search State
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Transaction[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Notification State
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const notifContainerRef = useRef<HTMLDivElement>(null);

  // Modal Inspection State
  const [selectedOpportunity, setSelectedOpportunity] = useState<RecoveryOpportunity | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  // Debounced Search Handler
  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.trim().length < 2) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    setSearchOpen(true);

    const timer = setTimeout(async () => {
      try {
        const res = await transactionsApi.getAll({ search: searchQuery.trim(), limit: "6" });
        setSearchResults(res.data || []);
      } catch {
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Keyboard shortcut Cmd+K / Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Fetch Notifications from Audit Log
  useEffect(() => {
    let isMounted = true;
    recoveryApi.getAuditLog()
      .then((logs) => {
        if (!isMounted || !logs) return;
        const formatted = logs.slice(0, 10).map((log: any) => ({
          id: log.id,
          action: log.action,
          timestamp: log.timestamp,
          details: log.details || {},
          entityId: log.entityId,
          read: readIds.has(log.id),
        }));
        setNotifications(formatted);
        const unread = formatted.filter((n: any) => !readIds.has(n.id)).length;
        setUnreadCount(unread);
      })
      .catch(() => {});

    return () => { isMounted = false; };
  }, [readIds]);

  // Outside click listener to close popovers
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setSearchOpen(false);
      }
      if (notifContainerRef.current && !notifContainerRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  const handleResultClick = (tx: Transaction) => {
    setSearchOpen(false);
    setSearchQuery("");
    if (tx.recoveryOpportunity) {
      setSelectedOpportunity(tx.recoveryOpportunity);
      setModalOpen(true);
    } else {
      navigate(`/transactions`);
    }
  };

  const handleMarkAllRead = () => {
    const allIds = new Set(notifications.map((n) => n.id));
    setReadIds(allIds);
    setUnreadCount(0);
  };

  const handleNotificationClick = async (notif: any) => {
    setReadIds((prev) => new Set(prev).add(notif.id));
    setNotifOpen(false);

    if (notif.entityId) {
      try {
        const opp = await recoveryApi.getById(notif.entityId);
        if (opp) {
          setSelectedOpportunity(opp);
          setModalOpen(true);
          return;
        }
      } catch {
        // fall through to navigation
      }
    }
    navigate("/audit");
  };

  return (
    <>
      <header
        className={cn(
          "fixed top-0 right-0 z-30 flex h-16 items-center justify-between border-b border-slate-200 bg-white/95 backdrop-blur-sm px-6 transition-all duration-200 select-none shadow-2xs",
          sidebarCollapsed ? "left-[64px]" : "left-[220px]"
        )}
      >
        {/* Title & Subtitle */}
        <div>
          <h1 className="text-lg font-bold text-slate-900 tracking-tight">{pageInfo.title}</h1>
          <p className="text-xs text-slate-500 font-medium">{pageInfo.subtitle}</p>
        </div>

        {/* Right Controls */}
        <div className="flex items-center gap-4">
          {/* Global Search */}
          <div ref={searchContainerRef} className="relative hidden md:block">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search by transaction ID, customer, email, or reason..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => searchQuery.trim().length >= 2 && setSearchOpen(true)}
              className="h-9 w-96 rounded-xl border border-slate-200 bg-slate-50/80 pl-9 pr-9 text-xs text-slate-800 placeholder:text-slate-400 outline-none focus:border-purple-500 focus:bg-white focus:ring-2 focus:ring-purple-100 transition-all font-medium"
            />
            {searchQuery ? (
              <button onClick={() => { setSearchQuery(""); setSearchOpen(false); }} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                <X className="h-3.5 w-3.5" />
              </button>
            ) : (
              <span className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] font-mono text-slate-400 font-bold">
                ⌘K
              </span>
            )}

            {/* Search Dropdown Popover */}
            {searchOpen && (
              <div className="absolute right-0 top-11 w-96 rounded-2xl border border-slate-200 bg-white shadow-xl overflow-hidden z-50 animate-fade-in">
                <div className="bg-slate-50 border-b border-slate-100 px-4 py-2.5 flex items-center justify-between text-xs font-bold text-slate-700">
                  <span>Transactions & Customers</span>
                  {isSearching && <RefreshCw className="h-3.5 w-3.5 text-purple-600 animate-spin" />}
                </div>

                <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                  {isSearching ? (
                    <div className="p-4 text-center text-xs text-slate-400">Searching transactions...</div>
                  ) : searchResults.length > 0 ? (
                    searchResults.map((tx) => (
                      <div
                        key={tx.id}
                        onClick={() => handleResultClick(tx)}
                        className="p-3 hover:bg-slate-50 cursor-pointer transition-colors flex items-start justify-between text-xs"
                      >
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900">{tx.customer?.name || "Customer"}</span>
                            <span className={cn("px-1.5 py-0.2 text-[9px] font-bold rounded uppercase border", getStatusColor(tx.status))}>
                              {tx.status}
                            </span>
                          </div>
                          <p className="text-[11px] font-mono text-slate-400">
                            #{tx.externalId || tx.id.slice(0, 12)} · {tx.paymentMethod.replace(/_/g, " ")}
                          </p>
                        </div>
                        <div className="text-right">
                          <span className="font-bold text-slate-900 tabular-nums">{formatCurrency(tx.amount)}</span>
                          {tx.recoveryOpportunity && (
                            <span className="block text-[10px] font-bold text-purple-600">AI Analyzed</span>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-6 text-center text-xs text-slate-400">
                      No transactions found matching "{searchQuery}"
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Notification Bell Dropdown */}
          <div ref={notifContainerRef} className="relative flex items-center gap-2">
            <button
              onClick={() => setNotifOpen(!notifOpen)}
              className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition-colors shadow-2xs"
            >
              <Bell className="h-4 w-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-purple-600 text-[10px] font-bold text-white shadow-2xs">
                  {unreadCount}
                </span>
              )}
            </button>
            <span className="h-2 w-2 rounded-full bg-emerald-500" />

            {/* Notification Popover Drawer */}
            {notifOpen && (
              <div className="absolute right-0 top-11 w-96 rounded-2xl border border-slate-200 bg-white shadow-xl overflow-hidden z-50 animate-fade-in">
                <div className="bg-slate-900 p-4 text-white flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <h3 className="text-xs font-bold tracking-tight">System Telemetry Notifications</h3>
                    {unreadCount > 0 && (
                      <span className="rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 px-2 py-0.5 text-[10px] font-bold">
                        {unreadCount} new
                      </span>
                    )}
                  </div>
                  {unreadCount > 0 && (
                    <button
                      onClick={handleMarkAllRead}
                      className="text-[10px] text-slate-300 hover:text-white underline font-semibold"
                    >
                      Mark all as read
                    </button>
                  )}
                </div>

                <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 text-xs">
                  {notifications.length > 0 ? (
                    notifications.map((n) => {
                      const isUnread = !readIds.has(n.id);
                      const isStopped = n.action === "RECOVERY_STOPPED";
                      const isAi = n.action === "AI_ANALYSIS";

                      return (
                        <div
                          key={n.id}
                          onClick={() => handleNotificationClick(n)}
                          className={cn(
                            "p-3.5 hover:bg-slate-50 cursor-pointer transition-colors space-y-1",
                            isUnread ? "bg-purple-50/30" : "bg-white"
                          )}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5 font-bold text-slate-900 text-xs">
                              {isStopped ? (
                                <ShieldAlert className="h-3.5 w-3.5 text-red-600 shrink-0" />
                              ) : isAi ? (
                                <Sparkles className="h-3.5 w-3.5 text-purple-600 shrink-0" />
                              ) : (
                                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                              )}
                              <span>{n.action.replace(/_/g, " ")}</span>
                            </div>
                            <span className="text-[10px] font-mono text-slate-400">
                              {formatDate(n.timestamp).split(",")[1]?.trim() || "Just now"}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-600 line-clamp-2">
                            {n.details?.policyOverride || n.details?.reason || n.details?.groqDiagnosis || "System event recorded"}
                          </p>
                          {n.details?.transactionId && (
                            <p className="text-[10px] font-mono text-purple-600 font-bold">
                              TX #{n.details.transactionId}
                            </p>
                          )}
                        </div>
                      );
                    })
                  ) : (
                    <div className="p-6 text-center text-xs text-slate-400">
                      No system notifications available.
                    </div>
                  )}
                </div>

                <div className="bg-slate-50 border-t border-slate-100 p-2 text-center">
                  <button
                    onClick={() => { setNotifOpen(false); navigate("/audit"); }}
                    className="text-[11px] font-bold text-purple-600 hover:underline inline-flex items-center gap-1"
                  >
                    View Full Audit Ledger <ArrowRight className="h-3 w-3" />
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="h-6 w-px bg-slate-200 mx-1" />

          {/* User Profile AS Admin / Administrator */}
          <div className="flex items-center gap-2.5 cursor-pointer select-none">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-800 text-white font-bold text-xs shadow-xs">
              AS
            </div>
            <div className="hidden sm:block text-left leading-tight">
              <span className="block text-xs font-bold text-slate-900">Admin</span>
              <span className="block text-[10px] text-slate-400 font-medium">Administrator</span>
            </div>
          </div>
        </div>
      </header>

      {/* Inspection Modal */}
      <AIAnalysisModal
        opportunity={selectedOpportunity}
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
      />
    </>
  );
}
