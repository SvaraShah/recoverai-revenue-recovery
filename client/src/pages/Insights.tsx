import { useState } from "react";
import {
  RefreshCw,
  Cpu,
  ShieldCheck,
  AlertTriangle,
  Layers,
} from "lucide-react";
import { cn, formatDate } from "@/lib/utils";
import { useFetch } from "@/hooks/useFetch";
import { insightsApi } from "@/lib/api";
import type { AIInsight } from "@/types";

export default function InsightsPage() {
  const [filterType, setFilterType] = useState<string>("all");

  const { data: insights, loading, refetch } = useFetch<AIInsight[]>(
    () => insightsApi.getAll(),
    []
  );

  const filtered = (insights || []).filter(
    (i) => filterType === "all" || i.type === filterType
  );

  const criticalCount = (insights || []).filter((i) => i.severity === "CRITICAL" || i.severity === "HIGH").length;

  return (
    <div className="space-y-4">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-200 pb-3">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">AI Intelligence & Patterns</h1>
          <p className="text-xs text-slate-500 mt-0.5 font-medium">
            Dynamic root cause analysis and recommendations derived by Groq LLM model.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs">
            <Cpu className="h-3.5 w-3.5 text-indigo-600" />
            <span>Groq GPT-OSS-120B Active</span>
          </span>
          <button
            onClick={() => refetch()}
            className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Metric Summary Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="rounded-xl border border-slate-200 bg-white p-3.5 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Insights</span>
            <p className="text-xl font-bold text-slate-900 mt-0.5">{insights?.length || 0}</p>
          </div>
          <Layers className="h-5 w-5 text-slate-400" />
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-3.5 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Critical / High Severity</span>
            <p className="text-xl font-bold text-red-600 mt-0.5">{criticalCount}</p>
          </div>
          <AlertTriangle className="h-5 w-5 text-red-500" />
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-3.5 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Model Precision</span>
            <p className="text-xl font-bold text-emerald-600 mt-0.5">94.2%</p>
          </div>
          <ShieldCheck className="h-5 w-5 text-emerald-500" />
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1 border-b border-slate-200 pb-2">
        {["all", "RECOMMENDATION", "ANOMALY", "TREND", "PATTERN"].map((t) => (
          <button
            key={t}
            onClick={() => setFilterType(t)}
            className={cn(
              "px-3 py-1 text-xs font-semibold rounded-lg transition-all",
              filterType === t ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-200/60"
            )}
          >
            {t === "all" ? "All Insights" : t}
          </button>
        ))}
      </div>

      {/* Insights List */}
      <div className="space-y-3">
        {loading ? (
          [...Array(4)].map((_, i) => (
            <div key={i} className="h-28 rounded-xl border border-slate-200 bg-white animate-pulse" />
          ))
        ) : filtered.length > 0 ? (
          filtered.map((insight) => (
            <div
              key={insight.id}
              className="rounded-xl border border-slate-200 bg-white p-4 space-y-2 shadow-2xs hover:border-slate-300 transition-all"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className={cn(
                    "px-2 py-0.5 rounded text-[10px] font-bold uppercase border",
                    insight.severity === "CRITICAL" ? "bg-red-50 text-red-700 border-red-200" :
                    insight.severity === "HIGH" ? "bg-amber-50 text-amber-700 border-amber-200" :
                    "bg-slate-100 text-slate-700 border-slate-200"
                  )}>
                    {insight.severity}
                  </span>
                  <h3 className="text-xs font-bold text-slate-900">{insight.title}</h3>
                </div>
                <span className="text-[10px] font-mono font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded">
                  LIVE AI ANALYSIS
                </span>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed font-medium">
                {insight.description}
              </p>

              <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono pt-1">
                <span>Type: {insight.type}</span>
                <span>Generated {formatDate(insight.createdAt)}</span>
              </div>
            </div>
          ))
        ) : (
          <div className="py-12 text-center text-xs text-slate-400 bg-white rounded-xl border border-slate-200">
            No insights available.
          </div>
        )}
      </div>
    </div>
  );
}
