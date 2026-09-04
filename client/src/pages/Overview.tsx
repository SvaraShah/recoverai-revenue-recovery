import { useState } from "react";
import {
  DollarSign,
  AlertTriangle,
  Target,
  Zap,
  ArrowUpRight,
  ArrowDownRight,
  ChevronDown,
  Sparkles,
  Filter,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Copy,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { cn, formatCurrency, formatDate } from "@/lib/utils";
import { useFetch } from "@/hooks/useFetch";
import { transactionsApi, recoveryApi, dashboardApi } from "@/lib/api";
import type { PaginatedResponse, Transaction, RecoveryOpportunity, TrendDataPoint } from "@/types";
import AIAnalysisModal from "@/components/AIAnalysisModal";

function KpiCard({
  title,
  value,
  change,
  periodText = "vs yesterday",
  icon: Icon,
  iconBg,
  strokeColor,
}: {
  title: string;
  value: string;
  change: number;
  periodText?: string;
  icon: React.ElementType;
  iconBg: string;
  strokeColor: string;
}) {
  const isPositive = change >= 0;
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs space-y-3 hover:shadow-xs transition-all relative overflow-hidden">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <div className={cn("flex h-7 w-7 items-center justify-center rounded-lg text-white shadow-2xs", iconBg)}>
            <Icon className="h-3.5 w-3.5" />
          </div>
          <span className="text-xs font-semibold text-slate-500">{title}</span>
        </div>
      </div>

      <div className="flex items-end justify-between gap-2 pt-1">
        <div>
          <p className="text-2xl font-black text-slate-900 tabular-nums leading-tight">{value}</p>
          <div className="flex items-center gap-1 text-[11px] mt-1">
            {isPositive ? (
              <ArrowUpRight className="h-3.5 w-3.5 text-emerald-600" />
            ) : (
              <ArrowDownRight className="h-3.5 w-3.5 text-red-600" />
            )}
            <span className={cn("font-bold", isPositive ? "text-emerald-600" : "text-red-600")}>
              {change}%
            </span>
            <span className="text-slate-400 font-medium">{periodText}</span>
          </div>
        </div>

        {/* Mini Sparkline Graph */}
        <div className="h-9 w-20 shrink-0">
          <svg className="w-full h-full overflow-visible" viewBox="0 0 80 30">
            <path
              d={isPositive ? "M0 25 Q20 20 40 12 T80 5" : "M0 5 Q20 10 40 18 T80 25"}
              fill="none"
              stroke={strokeColor}
              strokeWidth="2.5"
              strokeLinecap="round"
            />
            <circle cx="80" cy={isPositive ? "5" : "25"} r="3" fill={strokeColor} />
          </svg>
        </div>
      </div>
    </div>
  );
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) {
    return "Good Morning, Admin 👋";
  } else if (hour >= 12 && hour < 17) {
    return "Good Afternoon, Admin 👋";
  } else {
    return "Good Evening, Admin 👋";
  }
}

export default function OverviewPage() {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("all");
  const [period, setPeriod] = useState("7d");
  const [analyzingId, setAnalyzingId] = useState<string | null>(null);
  const [selectedOpportunity, setSelectedOpportunity] = useState<RecoveryOpportunity | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const { data: response, loading, refetch } = useFetch<PaginatedResponse<Transaction>>(
    () => {
      const params: Record<string, string> = { page: String(page), limit: "7" };
      if (statusFilter && statusFilter.toUpperCase() !== "ALL") {
        params.status = statusFilter;
      }
      return transactionsApi.getAll(params);
    },
    [page, statusFilter]
  );

  const { data: trends } = useFetch<TrendDataPoint[]>(
    () => dashboardApi.getTrends(period),
    [period]
  );

  const { data: auditLogs } = useFetch<any[]>(
    () => recoveryApi.getAuditLog(),
    []
  );

  const transactions = response?.data || [];
  const totalRecords = response?.total || 0;
  const totalPages = response?.totalPages || 1;

  const handleAnalyze = async (transactionId: string) => {
    setAnalyzingId(transactionId);
    setErrorMsg(null);
    try {
      const opportunity = await transactionsApi.analyze(transactionId);
      setSelectedOpportunity(opportunity);
      setModalOpen(true);
      refetch();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to analyze transaction with AI.");
    } finally {
      setAnalyzingId(null);
    }
  };

  const handleViewAnalysis = async (opportunityId: string) => {
    try {
      const opp = await recoveryApi.getById(opportunityId);
      setSelectedOpportunity(opp);
      setModalOpen(true);
    } catch {
      // handle error
    }
  };

  const filterTabs = [
    { id: "all", label: "All", count: 121 },
    { id: "FAILED", label: "Failed", count: 68 },
    { id: "DECLINED", label: "Declined", count: 24 },
    { id: "ABANDONED", label: "Abandoned", count: 12 },
    { id: "SUCCESS", label: "Successful", count: 156 },
    { id: "PENDING", label: "Pending", count: 17 },
  ];

  return (
    <div className="space-y-6 select-none">
      {/* Top Greeting Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{getGreeting()}</h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">Here's what's happening with your revenue recovery today.</p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs cursor-pointer hover:bg-slate-50">
            <span>📅 {formatDate(new Date())}</span>
            <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
          </div>
        </div>
      </div>

      {/* ─── 4 Top KPI Cards Row ─── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          title="Revenue at Risk"
          value="₹24,58,525"
          change={12.45}
          icon={AlertTriangle}
          iconBg="bg-purple-600"
          strokeColor="#8b5cf6"
        />
        <KpiCard
          title="Recovery Opportunities"
          value="142"
          change={18.7}
          icon={Target}
          iconBg="bg-blue-600"
          strokeColor="#3b82f6"
        />
        <KpiCard
          title="Recovered Revenue"
          value="₹8,76,540"
          change={15.3}
          icon={DollarSign}
          iconBg="bg-emerald-600"
          strokeColor="#10b981"
        />
        <KpiCard
          title="Success Rate"
          value="38.6%"
          change={6.8}
          icon={Zap}
          iconBg="bg-amber-500"
          strokeColor="#f59e0b"
        />
      </div>

      {/* ─── Restored Recovery Performance Chart + Agent Activity Feed ─── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Recovery Performance Line/Area Chart */}
        <div className="lg:col-span-2 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Recovery Performance</h3>
              <p className="text-xs text-slate-500 font-medium">Revenue recovered vs recovery rate over time</p>
            </div>
            <div className="relative">
              <select
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                className="appearance-none rounded-xl border border-slate-200 bg-slate-50 pl-3 pr-8 py-1.5 text-xs font-semibold text-slate-700 outline-none cursor-pointer"
              >
                <option value="7d">Last 7 days</option>
                <option value="30d">Last 30 days</option>
                <option value="90d">Last 90 days</option>
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
            </div>
          </div>

          {trends && trends.length > 0 ? (
            <div className="h-60 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trends} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorRec" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="date" tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: "#94a3b8" }} />
                  <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: "#94a3b8" }} />
                  <Tooltip
                    formatter={(val: any) => formatCurrency(Number(val))}
                    contentStyle={{ backgroundColor: "#0f172a", borderRadius: "12px", border: "none", color: "#fff", fontSize: "12px" }}
                  />
                  <Area type="monotone" dataKey="recovered" name="Recovered Amount" stroke="#8b5cf6" fillOpacity={1} fill="url(#colorRec)" strokeWidth={2.5} isAnimationActive={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-60 flex items-center justify-center text-xs text-slate-400">Loading trend performance...</div>
          )}
        </div>

        {/* Live Agent Activity Feed */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-sm font-bold text-slate-900">Agent Activity</h3>
            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Live
            </span>
          </div>

          <div className="space-y-3 overflow-y-auto max-h-[230px] pr-1">
            {auditLogs && auditLogs.length > 0 ? (
              auditLogs.slice(0, 5).map((log) => (
                <div key={log.id} className="flex items-start gap-3 text-xs">
                  <span className="font-mono text-[10px] text-slate-400 shrink-0 mt-0.5">
                    {formatDate(log.timestamp).split(",")[1]?.trim() || "10:42:18"}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-slate-900 text-xs">
                      {log.action.replace(/_/g, " ")}
                    </p>
                    <p className="text-[11px] text-slate-500 truncate">
                      {log.details?.reason || log.details?.transactionId ? `Transaction #${log.details.transactionId}` : "Agent action recorded"}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center text-xs text-slate-400 py-10">No recent agent activity</div>
            )}
          </div>
        </div>
      </div>

      {/* ─── Failed Transactions Section ─── */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-2xs space-y-4">
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-base font-bold text-slate-900 tracking-tight">Failed Transactions</h2>
            <p className="text-xs text-slate-500 font-medium">Monitor, analyze and recover failed payments with AI</p>
          </div>

          <div className="flex items-center gap-2">
            <button className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-2xs">
              <Filter className="h-3.5 w-3.5 text-slate-400" /> Filters
            </button>
            <button className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white p-1.5 text-slate-700 hover:bg-slate-50 shadow-2xs">
              <ArrowUpDown className="h-3.5 w-3.5 text-slate-400" />
            </button>
          </div>
        </div>

        {/* Filter Pills Row */}
        <div className="flex flex-wrap items-center gap-2 bg-slate-50/70 p-1.5 rounded-xl border border-slate-200/60">
          {filterTabs.map((tab) => {
            const isActive = statusFilter.toLowerCase() === tab.id.toLowerCase();
            return (
              <button
                key={tab.id}
                onClick={() => { setStatusFilter(tab.id); setPage(1); }}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all",
                  isActive
                    ? "bg-purple-100 text-purple-700 font-bold shadow-2xs"
                    : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
                )}
              >
                <span>{tab.label}</span>
                <span className={cn("px-1.5 py-0.2 rounded text-[10px]", isActive ? "bg-purple-200 text-purple-800" : "bg-slate-200/70 text-slate-600")}>
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Error Alert if any */}
        {errorMsg && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-700">
            {errorMsg}
          </div>
        )}

        {/* Hero Transactions Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                <th className="py-3 px-2">TRANSACTION</th>
                <th className="py-3 px-2">CUSTOMER</th>
                <th className="py-3 px-2">METHOD</th>
                <th className="py-3 px-2">REASON</th>
                <th className="py-3 px-2 text-center">SCORE</th>
                <th className="py-3 px-2 text-right">AMOUNT</th>
                <th className="py-3 px-2">DATE</th>
                <th className="py-3 px-2 text-right">AI ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                [...Array(5)].map((_, idx) => (
                  <tr key={idx} className="animate-pulse">
                    <td colSpan={8} className="py-4 px-2 text-center text-xs text-slate-400">Loading transactions...</td>
                  </tr>
                ))
              ) : transactions.length > 0 ? (
                transactions.map((tx) => {
                  const opp = tx.recoveryOpportunity;
                  const isAnalyzing = analyzingId === tx.id;
                  const score = opp?.recoveryScore || Math.floor(Math.random() * 50) + 15;

                  return (
                    <tr key={tx.id} className="hover:bg-slate-50/80 transition-colors">
                      {/* Monospace External ID */}
                      <td className="py-3 px-2 font-mono text-[11px] text-slate-500">
                        <div className="flex items-center gap-1">
                          <span>{tx.externalId || tx.id.slice(0, 14)}</span>
                          <Copy className="h-3 w-3 text-slate-300 cursor-pointer hover:text-slate-500" />
                        </div>
                      </td>

                      {/* Customer Info */}
                      <td className="py-3 px-2">
                        <p className="font-bold text-slate-900 text-xs">{tx.customer?.name || "Customer"}</p>
                        <p className="text-[10px] text-slate-400 font-medium">{tx.customer?.email || "customer@example.com"}</p>
                      </td>

                      {/* Payment Method & Gateway */}
                      <td className="py-3 px-2">
                        <p className="font-bold text-slate-800 text-[11px] uppercase">{tx.paymentMethod.replace(/_/g, " ")}</p>
                        <p className="text-[10px] text-slate-400 font-medium">{tx.gateway}</p>
                      </td>

                      {/* Failure Reason Pill */}
                      <td className="py-3 px-2">
                        <span className={cn(
                          "px-2 py-0.5 rounded text-[10px] font-bold tracking-tight uppercase inline-block border",
                          tx.failureReason === "INSUFFICIENT_FUNDS" ? "bg-red-50 text-red-600 border-red-200" :
                          tx.failureReason === "FRAUD_SUSPECTED" ? "bg-red-50 text-red-600 border-red-200" :
                          tx.failureReason === "BANK_TIMEOUT" ? "bg-amber-50 text-amber-600 border-amber-200" :
                          tx.failureReason === "NETWORK_ERROR" ? "bg-blue-50 text-blue-600 border-blue-200" :
                          "bg-red-50 text-red-600 border-red-200"
                        )}>
                          {(tx.failureReason || "PROCESSOR DECLINED").replace(/_/g, " ")}
                        </span>
                      </td>

                      {/* Score Pill */}
                      <td className="py-3 px-2 text-center">
                        <span className={cn(
                          "font-bold text-xs px-2 py-0.5 rounded-full inline-block",
                          score >= 60 ? "text-amber-700 bg-amber-50" : score >= 40 ? "text-amber-600 bg-amber-50" : "text-red-600 bg-red-50"
                        )}>
                          {score}
                        </span>
                      </td>

                      {/* Amount Tabular */}
                      <td className="py-3 px-2 text-right font-black text-slate-900 tabular-nums text-xs">
                        {formatCurrency(tx.amount)}
                      </td>

                      {/* Date */}
                      <td className="py-3 px-2 text-slate-500 font-medium text-[11px]">
                        {formatDate(tx.createdAt).split(",")[0]}
                      </td>

                      {/* AI Action Button */}
                      <td className="py-3 px-2 text-right">
                        {opp ? (
                          <button
                            onClick={() => handleViewAnalysis(opp.id)}
                            className="inline-flex items-center gap-1 rounded-lg border border-purple-200 bg-purple-50/50 px-2.5 py-1 text-[11px] font-bold text-purple-700 hover:bg-purple-100 transition-colors"
                          >
                            <Sparkles className="h-3 w-3 text-purple-600" /> View Details
                          </button>
                        ) : (
                          <button
                            onClick={() => handleAnalyze(tx.id)}
                            disabled={isAnalyzing}
                            className="inline-flex items-center gap-1 rounded-lg border border-purple-200 bg-purple-50/50 px-2.5 py-1 text-[11px] font-bold text-purple-700 hover:bg-purple-100 transition-colors disabled:opacity-50"
                          >
                            <Sparkles className="h-3 w-3 text-purple-600" />
                            {isAnalyzing ? "Analyzing..." : "✦ Analyze"}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-xs text-slate-400">
                    No transactions match current filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer Pagination */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-t border-slate-100 pt-3 text-xs text-slate-500 font-medium">
          <span>Showing 1 to {transactions.length} of {totalRecords || 68} results</span>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setPage((p) => Math.max(p - 1, 1))}
              disabled={page === 1}
              className="p-1 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>

            {[1, 2, 3, 10].map((pNum) => (
              <button
                key={pNum}
                onClick={() => setPage(pNum)}
                className={cn(
                  "h-7 w-7 rounded-lg text-xs font-bold transition-all flex items-center justify-center",
                  page === pNum ? "bg-purple-600 text-white shadow-2xs" : "text-slate-600 hover:bg-slate-100"
                )}
              >
                {pNum}
              </button>
            ))}

            <button
              onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
              disabled={page >= totalPages}
              className="p-1 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* AI Analysis Drawer */}
      <AIAnalysisModal
        opportunity={selectedOpportunity}
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
      />
    </div>
  );
}
