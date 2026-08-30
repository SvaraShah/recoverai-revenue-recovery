import { useState } from "react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { cn, formatCurrency } from "@/lib/utils";
import { useFetch } from "@/hooks/useFetch";
import { analyticsApi, recoveryApi } from "@/lib/api";
import type { AnalyticsData } from "@/types";
import { ShieldCheck } from "lucide-react";

const CHART_COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#06b6d4", "#f97316"];
const periods = [
  { value: "7d", label: "7 Days" },
  { value: "30d", label: "30 Days" },
  { value: "90d", label: "90 Days" },
];

const tooltipStyle = {
  background: "#fff",
  border: "1px solid #e2e8f0",
  borderRadius: "8px",
  boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)",
  fontSize: "12px",
};

export default function AnalyticsPage() {
  const [period, setPeriod] = useState("30d");

  const { data: analytics, loading: loadingAnalytics } = useFetch<AnalyticsData>(
    () => analyticsApi.getFullAnalytics(period),
    [period]
  );

  const { data: performance, loading: loadingPerformance } = useFetch<any>(
    () => recoveryApi.getPerformance(),
    [period]
  );

  if (loadingAnalytics || loadingPerformance) {
    return (
      <div className="space-y-5">
        <div className="h-10 w-64 rounded-lg bg-slate-200 animate-pulse" />
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-80 rounded-xl border border-slate-200 bg-white animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (!analytics || !performance) {
    return <div className="text-center text-slate-500 py-20">Failed to load analytics</div>;
  }

  const realizationRate = performance.totalExpectedRecovery > 0
    ? Math.round((performance.totalRecoveredRevenue / performance.totalExpectedRecovery) * 100)
    : 0;

  return (
    <div className="space-y-6">
      {/* Header Period Selector */}
      <div className="flex justify-between items-center">
        <div className="flex gap-1 bg-white rounded-lg border border-slate-200 p-1 w-fit">
          {periods.map((p) => (
            <button
              key={p.value}
              onClick={() => setPeriod(p.value)}
              className={cn(
                "px-4 py-1.5 text-xs font-semibold rounded-md transition-colors",
                period === p.value ? "bg-blue-600 text-white" : "text-slate-600 hover:bg-slate-50"
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* ─── NEW Section: Recovery Agent Performance ─── */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
          <ShieldCheck className="h-5 w-5 text-blue-600" />
          <div>
            <h3 className="text-sm font-bold text-slate-900">Recovery Agent Performance</h3>
            <p className="text-xs text-slate-500">Real-time realize rates, efficiency metrics, and guardrail actions</p>
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Recovery Lift</p>
            <p className="text-xl font-bold text-emerald-600 mt-1">+{performance.recoveryLift}%</p>
            <p className="text-[10px] text-slate-400 mt-0.5">vs. baseline unpaid recovery</p>
          </div>
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Realization Rate</p>
            <p className="text-xl font-bold text-slate-800 mt-1">{realizationRate}%</p>
            <p className="text-[10px] text-slate-400 mt-0.5">₹{Math.round(performance.totalRecoveredRevenue/1000)}k recovered of ₹{Math.round(performance.totalExpectedRecovery/1000)}k expected</p>
          </div>
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Agent Boundedness</p>
            <p className="text-xl font-bold text-slate-800 mt-1">{performance.stopRate}% Stop / {performance.escalationRate}% Esc</p>
            <p className="text-[10px] text-slate-400 mt-0.5">{performance.stoppedCount} stopped, {performance.escalatedCount} escalated by guardrails</p>
          </div>
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Outreach Efficiency</p>
            <p className="text-xl font-bold text-slate-800 mt-1">{performance.attemptsPerRecovery} attempts</p>
            <p className="text-[10px] text-slate-400 mt-0.5">avg outreach attempts per recovery</p>
          </div>
        </div>

        {/* Estimated vs Actual Chart */}
        {performance.estimatedVsActual && performance.estimatedVsActual.length > 0 && (
          <div className="pt-2">
            <h4 className="text-xs font-bold text-slate-700 mb-3">Estimated vs. Actual Recovery across Simulation Batches</h4>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={performance.estimatedVsActual} margin={{ top: 0, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} tickFormatter={(v) => `₹${(v/1000).toFixed(0)}k`} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v: any) => `₹${Number(v).toLocaleString()}`} />
                <Legend wrapperStyle={{ fontSize: "10px" }} />
                <Bar dataKey="estimated" name="Estimated expected recovery" fill="#94a3b8" opacity={0.6} radius={[4, 4, 0, 0]} maxBarSize={28} />
                <Bar dataKey="actual" name="Actual simulated recovered" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={28} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* Revenue Recovery Over Time */}
        <div className="lg:col-span-2 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-sm font-bold text-slate-900 mb-1">Revenue Recovery Over Time</h3>
          <p className="text-xs text-slate-500 mb-4">At-risk revenue vs. successfully recovered</p>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={analytics.revenueOverTime} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="areaAtRisk" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#fca5a5" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#fca5a5" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="areaRecovered" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#6ee7b7" stopOpacity={0.3} />
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
              <Tooltip contentStyle={tooltipStyle} formatter={(v: unknown) => [`₹${Number(v).toLocaleString("en-IN")}`, ""]} />
              <Area type="monotone" dataKey="atRisk" stroke="#f87171" fill="url(#areaAtRisk)" strokeWidth={2} name="At Risk" />
              <Area type="monotone" dataKey="recovered" stroke="#34d399" fill="url(#areaRecovered)" strokeWidth={2} name="Recovered" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Recovery by Payment Method */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-sm font-bold text-slate-900 mb-1">Success Rate by Payment Method</h3>
          <p className="text-xs text-slate-500 mb-4">Transaction success rates across payment types</p>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={analytics.recoveryByMethod} layout="vertical" margin={{ top: 0, right: 10, left: 30, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
              <YAxis type="category" dataKey="method" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} width={90} />
              <Tooltip contentStyle={tooltipStyle} formatter={(v: unknown) => [`${v}%`, "Success Rate"]} />
              <Bar dataKey="rate" radius={[0, 4, 4, 0]} maxBarSize={24}>
                {analytics.recoveryByMethod.map((_, i) => (
                  <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Failure Distribution */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-sm font-bold text-slate-900 mb-1">Failure Reason Distribution</h3>
          <p className="text-xs text-slate-500 mb-4">Breakdown of why transactions fail</p>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie
                data={analytics.failureDistribution}
                cx="50%"
                cy="45%"
                innerRadius={55}
                outerRadius={85}
                paddingAngle={3}
                dataKey="count"
                nameKey="reason"
              >
                {analytics.failureDistribution.map((_, i) => (
                  <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                ))}
              </Pie>
              <Legend verticalAlign="bottom" height={60} wrapperStyle={{ fontSize: "11px" }} />
              <Tooltip contentStyle={tooltipStyle} formatter={(v: unknown, name: unknown) => [`${v} txns`, String(name)]} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Recovery by Action Type */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-sm font-bold text-slate-900 mb-1">Recovery by Action Type</h3>
          <p className="text-xs text-slate-500 mb-4">Success rates of different recovery strategies</p>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={analytics.recoveryByAction} margin={{ top: 0, right: 10, left: -15, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="action" tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} interval={0} angle={-25} textAnchor="end" height={60} />
              <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="successRate" name="Success Rate %" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={32} />
              <Bar dataKey="count" name="Attempts" fill="#e2e8f0" radius={[4, 4, 0, 0]} maxBarSize={32} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Top Recoverable Customers */}
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-5 py-4">
            <h3 className="text-sm font-bold text-slate-900">Top Recovered Customers</h3>
            <p className="text-xs text-slate-500 mt-0.5">Highest recovered revenue by customer</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50">
                  <th className="px-5 py-2.5 text-left text-xs font-semibold text-slate-500">#</th>
                  <th className="px-5 py-2.5 text-left text-xs font-semibold text-slate-500">Customer</th>
                  <th className="px-5 py-2.5 text-right text-xs font-semibold text-slate-500">Recovered</th>
                  <th className="px-5 py-2.5 text-right text-xs font-semibold text-slate-500">Score</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {analytics.topCustomers.map((item, i) => (
                  <tr key={item.customer.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-3 text-xs text-slate-400">{i + 1}</td>
                    <td className="px-5 py-3">
                      <p className="font-semibold text-slate-800">{item.customer.name}</p>
                      <p className="text-xs text-slate-400">{item.customer.email}</p>
                    </td>
                    <td className="px-5 py-3 text-right font-semibold text-emerald-600">
                      {formatCurrency(item.recoverableAmount)}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <span className={cn(
                        "inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold border",
                        item.recoveryScore >= 70 ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                        item.recoveryScore >= 40 ? "bg-amber-50 text-amber-700 border-amber-200" :
                        "bg-red-50 text-red-700 border-red-200"
                      )}>
                        {item.recoveryScore}
                      </span>
                    </td>
                  </tr>
                ))}
                {analytics.topCustomers.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-5 py-8 text-center text-xs text-slate-400">
                      No recovery data available
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
