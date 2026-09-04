import { useState } from "react";
import { cn, formatCurrency } from "@/lib/utils";
import { useFetch } from "@/hooks/useFetch";
import { analyticsApi, recoveryApi } from "@/lib/api";
import type { AnalyticsData } from "@/types";
import { BarChart3, Zap } from "lucide-react";
import ErrorState from "@/components/ErrorState";

const periods = [
  { value: "7d", label: "7 Days" },
  { value: "30d", label: "30 Days" },
  { value: "90d", label: "90 Days" },
];

export default function AnalyticsPage() {
  const [period, setPeriod] = useState("30d");

  const {
    data: analytics,
    loading: loadingAnalytics,
    error: errorAnalytics,
    refetch: refetchAnalytics,
  } = useFetch<AnalyticsData>(
    () => analyticsApi.getFullAnalytics(period),
    [period]
  );

  const {
    data: performance,
    loading: loadingPerformance,
    error: errorPerformance,
    refetch: refetchPerformance,
  } = useFetch<any>(
    () => recoveryApi.getPerformance(),
    [period]
  );

  const handleRetryAll = () => {
    refetchAnalytics();
    refetchPerformance();
  };

  // If there's an error and no cached data available, show ErrorState with Retry button
  if ((errorAnalytics || errorPerformance) && !analytics && !performance) {
    return (
      <ErrorState
        title="Unable to load analytics telemetry"
        message={errorAnalytics || errorPerformance || "An error occurred while fetching metrics."}
        onRetry={handleRetryAll}
      />
    );
  }

  // Loading state skeleton
  if ((loadingAnalytics || loadingPerformance) && (!analytics || !performance)) {
    return (
      <div className="space-y-5 select-none">
        <div className="h-14 w-full rounded-2xl bg-slate-100 animate-pulse" />
        <div className="h-44 w-full rounded-2xl bg-slate-100 animate-pulse" />
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <div className="h-60 rounded-2xl bg-slate-100 animate-pulse" />
          <div className="h-60 rounded-2xl bg-slate-100 animate-pulse" />
        </div>
      </div>
    );
  }

  const safePerformance = (performance || {}) as Record<string, any>;
  const safeAnalytics = (analytics || {}) as Partial<AnalyticsData>;

  const totalExp = Number(safePerformance.totalExpectedRecovery) || 0;
  const totalRec = Number(safePerformance.totalRecoveredRevenue) || 0;
  const realizationRate = totalExp > 0 ? Math.round((totalRec / totalExp) * 100) : 0;

  // Funnel steps mapped to live performance API metrics
  const funnelSteps = [
    { label: "Failed Payments", value: safePerformance.failedPaymentsCount ?? safePerformance.totalTransactions ?? 0, color: "bg-red-500 text-white" },
    { label: "AI Analyzed", value: safePerformance.aiAnalyzedCount ?? 0, color: "bg-purple-600 text-white" },
    { label: "Recovery Opportunities", value: safePerformance.opportunitiesCount ?? 0, color: "bg-indigo-600 text-white" },
    { label: "Outreach Dispatched", value: safePerformance.outreachDispatchedCount ?? 0, color: "bg-blue-600 text-white" },
    { label: "Revenue Recovered", value: safePerformance.recoveredCount ?? 0, color: "bg-emerald-600 text-white" },
  ];

  const recoveryByMethod = Array.isArray(safeAnalytics.recoveryByMethod)
    ? safeAnalytics.recoveryByMethod
    : [];

  return (
    <div className="space-y-6 select-none">
      {/* Header Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-violet-600 border border-violet-100">
            <BarChart3 className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">Performance & Funnel Analytics</h2>
            <p className="text-xs text-slate-500 mt-0.5">Deep telemetry on agent conversion rates and realization metrics</p>
          </div>
        </div>

        {/* Date Selector */}
        <div className="flex gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 self-start sm:self-auto">
          {periods.map((p) => (
            <button
              key={p.value}
              onClick={() => setPeriod(p.value)}
              className={cn(
                "px-3 py-1 text-xs font-bold rounded-lg transition-all",
                period === p.value ? "bg-white text-slate-900 shadow-2xs" : "text-slate-500 hover:text-slate-900"
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* RECOVERY AGENT FUNNEL */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-2xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-violet-600" />
            <h3 className="text-sm font-bold text-slate-900">AGENT RECOVERY CONVERSION FUNNEL</h3>
          </div>
          <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
            Realized Rate: {realizationRate}%
          </span>
        </div>

        {/* Funnel Visual Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-5 gap-2 pt-2">
          {funnelSteps.map((step) => (
            <div key={step.label} className="relative flex flex-col justify-between rounded-xl bg-slate-50 border border-slate-200 p-3 text-center space-y-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">{step.label}</span>
              <p className="text-xl font-black text-slate-900 tabular-nums">{step.value}</p>
              <div className={cn("h-1.5 w-full rounded-full", step.color)} />
            </div>
          ))}
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Recovery Realization Comparison */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs space-y-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Estimated vs. Realized Recovered Revenue</h3>
            <p className="text-xs text-slate-500">Expected mathematical expectation vs actual realized recovery</p>
          </div>
          <div className="grid grid-cols-2 gap-3 text-center text-xs">
            <div className="rounded-xl bg-slate-50 border border-slate-200 p-3">
              <span className="text-slate-400 font-semibold uppercase text-[10px]">Expected Recovery</span>
              <p className="text-base font-bold text-slate-900 mt-0.5">{formatCurrency(totalExp)}</p>
            </div>
            <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3">
              <span className="text-emerald-700 font-semibold uppercase text-[10px]">Realized Recovered</span>
              <p className="text-base font-bold text-emerald-800 mt-0.5">{formatCurrency(totalRec)}</p>
            </div>
          </div>
        </div>

        {/* Payment Method Recovery Rates */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs space-y-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Payment Method Conversion Breakdown</h3>
            <p className="text-xs text-slate-500">Recovery rate by payment rail (UPI, Credit Card, Net Banking)</p>
          </div>
          <div className="space-y-3 text-xs">
            {recoveryByMethod.length > 0 ? (
              recoveryByMethod.map((pm: any) => (
                <div key={pm.method} className="space-y-1">
                  <div className="flex justify-between font-semibold">
                    <span className="text-slate-800">{pm.method?.replace(/_/g, " ") || pm.method}</span>
                    <span className="text-violet-700 font-bold">{pm.rate || 0}% ({formatCurrency(pm.amount || 0)})</span>
                  </div>
                  <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-violet-600 rounded-full" style={{ width: `${Math.min(100, (pm.rate || 0) * 1.2)}%` }} />
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-400 py-4 text-center">No payment method breakdown available</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
