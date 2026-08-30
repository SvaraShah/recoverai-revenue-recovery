import {
  DollarSign,
  AlertTriangle,
  Target,
  Zap,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  CheckCircle2,
  XCircle,
  Sparkles,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { cn, formatCurrency, formatNumber, formatPercent, timeAgo, getStatusColor } from "@/lib/utils";
import { useFetch } from "@/hooks/useFetch";
import { dashboardApi } from "@/lib/api";
import type { DashboardOverview, TrendDataPoint, FailureBreakdown, RecentActivity } from "@/types";

const COLORS = ["#3b82f6", "#ef4444", "#f59e0b", "#10b981", "#8b5cf6", "#ec4899", "#06b6d4", "#f97316", "#6366f1", "#14b8a6"];

function MetricCard({
  title,
  value,
  change,
  icon: Icon,
  iconBg,
  prefix = "",
  suffix = "",
}: {
  title: string;
  value: string;
  change: number;
  icon: React.ElementType;
  iconBg: string;
  prefix?: string;
  suffix?: string;
}) {
  const isPositive = change >= 0;
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm animate-fade-in">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <p className="mt-2 text-2xl font-bold text-slate-900">
            {prefix}{value}{suffix}
          </p>
        </div>
        <div className={cn("flex h-10 w-10 items-center justify-center rounded-lg", iconBg)}>
          <Icon className="h-5 w-5 text-white" />
        </div>
      </div>
      <div className="mt-3 flex items-center gap-1.5">
        {isPositive ? (
          <ArrowUpRight className="h-4 w-4 text-emerald-500" />
        ) : (
          <ArrowDownRight className="h-4 w-4 text-red-500" />
        )}
        <span className={cn("text-sm font-medium", isPositive ? "text-emerald-600" : "text-red-600")}>
          {Math.abs(change)}%
        </span>
        <span className="text-sm text-slate-400">vs last period</span>
      </div>
    </div>
  );
}

function LoadingPulse() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-32 rounded-xl border border-slate-200 bg-white animate-pulse" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="lg:col-span-2 h-80 rounded-xl border border-slate-200 bg-white animate-pulse" />
        <div className="h-80 rounded-xl border border-slate-200 bg-white animate-pulse" />
      </div>
    </div>
  );
}

export default function OverviewPage() {
  const { data: overview, loading: loadingOverview } = useFetch<DashboardOverview>(
    () => dashboardApi.getOverview(), []
  );
  const { data: trends } = useFetch<TrendDataPoint[]>(
    () => dashboardApi.getTrends("30d"), []
  );
  const { data: failures } = useFetch<FailureBreakdown[]>(
    () => dashboardApi.getFailureBreakdown(), []
  );
  const { data: activity } = useFetch<RecentActivity[]>(
    () => dashboardApi.getRecentActivity(), []
  );

  if (loadingOverview) return <LoadingPulse />;
  if (!overview) return <div className="text-center text-slate-500 py-20">Failed to load dashboard</div>;

  return (
    <div className="space-y-6">
      {/* Metric Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Revenue at Risk"
          value={formatCurrency(overview.totalRevenueAtRisk)}
          change={overview.revenueAtRiskChange}
          icon={AlertTriangle}
          iconBg="bg-red-500"
        />
        <MetricCard
          title="Revenue Recovered"
          value={formatCurrency(overview.totalRecovered)}
          change={overview.recoveredChange}
          icon={DollarSign}
          iconBg="bg-emerald-500"
        />
        <MetricCard
          title="Recovery Rate"
          value={formatPercent(overview.recoveryRate)}
          change={overview.recoveryRateChange}
          icon={Target}
          iconBg="bg-blue-600"
        />
        <MetricCard
          title="Active Opportunities"
          value={formatNumber(overview.activeOpportunities)}
          change={overview.opportunitiesChange}
          icon={Zap}
          iconBg="bg-violet-500"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* Revenue Recovery Trend */}
        <div className="lg:col-span-2 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Revenue Recovery Trend</h3>
              <p className="text-xs text-slate-500 mt-0.5">At-risk vs recovered revenue (30 days)</p>
            </div>
            <div className="flex items-center gap-4 text-xs">
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
                At Risk
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
                Recovered
              </span>
            </div>
          </div>
          {trends && trends.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={trends} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="atRiskGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#fca5a5" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#fca5a5" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="recoveredGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#6ee7b7" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#6ee7b7" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis
                  dataKey="date"
                  tickFormatter={(v) => new Date(v).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                  tick={{ fontSize: 11, fill: "#94a3b8" }}
                  axisLine={false}
                  tickLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "#94a3b8" }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}K`}
                />
                <Tooltip
                  contentStyle={{
                    background: "#fff",
                    border: "1px solid #e2e8f0",
                    borderRadius: "8px",
                    boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)",
                    fontSize: "12px",
                  }}
                  formatter={(value: unknown) => [`₹${Number(value).toLocaleString("en-IN")}`, ""]}
                  labelFormatter={(label) => new Date(String(label)).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}
                />
                <Area type="monotone" dataKey="atRisk" stroke="#f87171" fill="url(#atRiskGrad)" strokeWidth={2} name="At Risk" />
                <Area type="monotone" dataKey="recovered" stroke="#34d399" fill="url(#recoveredGrad)" strokeWidth={2} name="Recovered" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-[280px] items-center justify-center text-sm text-slate-400">
              No trend data available
            </div>
          )}
        </div>

        {/* Failure Breakdown */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-900">Failure Distribution</h3>
          <p className="text-xs text-slate-500 mt-0.5 mb-4">By failure reason</p>
          {failures && failures.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={failures.slice(0, 6)}
                  cx="50%"
                  cy="45%"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={3}
                  dataKey="count"
                  nameKey="reason"
                >
                  {failures.slice(0, 6).map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Legend
                  verticalAlign="bottom"
                  height={60}
                  formatter={(value: string) =>
                    value.replace(/_/g, " ").toLowerCase().replace(/^\w/, (c) => c.toUpperCase())
                  }
                  wrapperStyle={{ fontSize: "11px" }}
                />
                <Tooltip
                  contentStyle={{
                    background: "#fff",
                    border: "1px solid #e2e8f0",
                    borderRadius: "8px",
                    fontSize: "12px",
                  }}
                  formatter={(value: unknown, name: unknown) => [
                    `${value} transactions`,
                    String(name).replace(/_/g, " "),
                  ]}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-[280px] items-center justify-center text-sm text-slate-400">
              No failure data
            </div>
          )}
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* Recent Activity */}
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-5 py-4">
            <h3 className="text-sm font-semibold text-slate-900">Recent Recovery Activity</h3>
            <p className="text-xs text-slate-500 mt-0.5">Last 10 recovery actions</p>
          </div>
          <div className="divide-y divide-slate-100">
            {activity && activity.length > 0 ? (
              activity.map((item) => (
                <div key={item.id} className="flex items-center justify-between px-5 py-3 hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={cn(
                      "flex h-8 w-8 items-center justify-center rounded-full shrink-0",
                      item.status === "RECOVERED" ? "bg-emerald-50" :
                      item.status === "FAILED" ? "bg-red-50" :
                      "bg-blue-50"
                    )}>
                      {item.status === "RECOVERED" ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      ) : item.status === "FAILED" ? (
                        <XCircle className="h-4 w-4 text-red-500" />
                      ) : (
                        <Clock className="h-4 w-4 text-blue-600" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm text-slate-700 truncate">{item.description}</p>
                      <p className="text-xs text-slate-400">{timeAgo(item.timestamp)}</p>
                    </div>
                  </div>
                  <span className={cn(
                    "text-xs font-medium px-2 py-1 rounded-full border shrink-0 ml-3",
                    getStatusColor(item.status)
                  )}>
                    {item.status.replace(/_/g, " ")}
                  </span>
                </div>
              ))
            ) : (
              <div className="py-12 text-center text-sm text-slate-400">
                No recent activity
              </div>
            )}
          </div>
        </div>

        {/* AI Insights Preview */}
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-5 py-4 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">AI Insights</h3>
              <p className="text-xs text-slate-500 mt-0.5">Top actionable insights</p>
            </div>
            <Sparkles className="h-4 w-4 text-blue-500" />
          </div>
          <div className="p-5 space-y-3">
            {[
              { severity: "CRITICAL", title: "Unusual Spike in Card Expired Failures", desc: "22 card expiry failures detected in last 6 hours — 3x normal rate", color: "border-l-red-500 bg-red-50/50" },
              { severity: "HIGH", title: "Bank Timeout Failures Up 34%", desc: "HDFC & ICICI showing elevated timeout rates between 2-4 PM IST", color: "border-l-orange-500 bg-orange-50/50" },
              { severity: "HIGH", title: "₹4.7L Recoverable from Abandoned Txns", desc: "127 abandoned transactions with recovery score above 70", color: "border-l-blue-500 bg-blue-50/50" },
            ].map((insight, i) => (
              <div
                key={i}
                className={cn(
                  "rounded-lg border border-slate-200 border-l-4 p-3.5 transition-colors hover:shadow-sm cursor-pointer",
                  insight.color
                )}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className={cn(
                    "text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded",
                    insight.severity === "CRITICAL" ? "bg-red-100 text-red-700" :
                    insight.severity === "HIGH" ? "bg-orange-100 text-orange-700" :
                    "bg-blue-100 text-blue-700"
                  )}>
                    {insight.severity}
                  </span>
                </div>
                <p className="text-sm font-medium text-slate-800">{insight.title}</p>
                <p className="text-xs text-slate-500 mt-1">{insight.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
