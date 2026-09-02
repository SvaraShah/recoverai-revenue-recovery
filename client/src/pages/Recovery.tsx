import { useState } from "react";
import {
  CheckCircle2,
  Zap,
  RefreshCw,
  ShieldAlert,
} from "lucide-react";
import { cn, formatCurrency, getStatusColor, getScoreColor, truncateId } from "@/lib/utils";
import { useFetch } from "@/hooks/useFetch";
import { recoveryApi } from "@/lib/api";
import type { PaginatedResponse, RecoveryOpportunity } from "@/types";
import AIAnalysisModal from "@/components/AIAnalysisModal";

export default function RecoveryPage() {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("score");
  const [selectedOpportunity, setSelectedOpportunity] = useState<RecoveryOpportunity | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [executingId, setExecutingId] = useState<string | null>(null);
  const [simulating, setSimulating] = useState(false);

  const { data: response, loading, refetch } = useFetch<PaginatedResponse<RecoveryOpportunity>>(
    () => recoveryApi.getAll(statusFilter !== "all" ? { status: statusFilter } : undefined),
    [statusFilter]
  );

  const opportunities = response?.data || [];

  const handleExecute = async (opportunityId: string) => {
    setExecutingId(opportunityId);
    try {
      await recoveryApi.execute(opportunityId);
      refetch();
    } catch {
      // handle error
    } finally {
      setExecutingId(null);
    }
  };

  const handleRunBatchSimulation = async () => {
    setSimulating(true);
    try {
      await recoveryApi.createBatchRun({ batchSize: 50, guardrailsEnabled: true, approvalRequired: true });
      refetch();
    } catch {
      // handle error
    } finally {
      setSimulating(false);
    }
  };

  // Sort opportunities
  const sortedOpportunities = [...opportunities].sort((a, b) => {
    if (sortBy === "score") return b.recoveryScore - a.recoveryScore;
    if (sortBy === "amount") return b.estimatedRecoverableAmount - a.estimatedRecoverableAmount;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  const filterTabs = [
    { id: "all", label: "All Pipeline" },
    { id: "RECOMMENDED", label: "Recommended" },
    { id: "PENDING_APPROVAL", label: "Pending Approval" },
    { id: "EXECUTING", label: "Executing" },
    { id: "RECOVERED", label: "Recovered" },
    { id: "STOPPED", label: "Stopped" },
  ];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-3 border-b border-slate-200 pb-3">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Recovery Opportunity Queue</h1>
          <p className="text-xs text-slate-500 mt-0.5 font-medium">
            AI-scored revenue targets with automated intervention dispatch and policy safety rules.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleRunBatchSimulation}
            disabled={simulating}
            className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-bold text-indigo-700 hover:bg-indigo-100 transition-all disabled:opacity-50 shadow-2xs"
          >
            {simulating ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Zap className="h-3.5 w-3.5 fill-indigo-700" />}
            <span>{simulating ? "Simulating Batch..." : "Run AI Batch Simulation"}</span>
          </button>
        </div>
      </div>

      {/* Control Strip */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Status Filters */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
          {filterTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={cn(
                "px-3 py-1.5 text-xs font-semibold rounded-lg transition-all whitespace-nowrap",
                statusFilter === tab.id
                  ? "bg-slate-900 text-white shadow-2xs"
                  : "text-slate-600 hover:bg-slate-200/60"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Sort Dropdown */}
        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-400 font-medium">Sort by:</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 outline-none"
          >
            <option value="score">Highest Recovery Score</option>
            <option value="amount">Highest Recoverable Amount</option>
            <option value="date">Newest First</option>
          </select>
        </div>
      </div>

      {/* HIGH-DENSITY RECOVERY WORKSPACE TABLE */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500 sticky top-0">
              <tr>
                <th className="py-3 px-4">Transaction / Customer</th>
                <th className="py-3 px-4 text-center">Score</th>
                <th className="py-3 px-4 text-center">AI Confidence</th>
                <th className="py-3 px-4">Recommended Action</th>
                <th className="py-3 px-4">Vector</th>
                <th className="py-3 px-4 text-right">Est. Recoverable</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Execution Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                [...Array(6)].map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={8} className="py-3.5 px-4"><div className="h-4 bg-slate-100 rounded" /></td>
                  </tr>
                ))
              ) : sortedOpportunities.length > 0 ? (
                sortedOpportunities.map((opp) => {
                  const isExecuting = executingId === opp.id;
                  const isStopped = opp.status === "STOPPED";
                  const isPending = opp.status === "PENDING_APPROVAL";
                  const isRecovered = opp.status === "RECOVERED";

                  return (
                    <tr
                      key={opp.id}
                      className="hover:bg-slate-50/80 transition-colors group cursor-pointer"
                      onClick={() => { setSelectedOpportunity(opp); setModalOpen(true); }}
                    >
                      <td className="py-3 px-4">
                        <p className="font-bold text-slate-900">{opp.transaction?.customer?.name || "Customer"}</p>
                        <p className="text-[10px] font-mono text-slate-400">
                          {opp.transaction?.externalId ? `#${opp.transaction.externalId}` : truncateId(opp.id)}
                        </p>
                      </td>

                      <td className="py-3 px-4 text-center">
                        <span className={cn(
                          "inline-block font-mono font-bold text-xs px-2 py-0.5 rounded",
                          getScoreColor(opp.recoveryScore)
                        )}>
                          {opp.recoveryScore}/100
                        </span>
                      </td>

                      <td className="py-3 px-4 text-center font-semibold text-indigo-700">
                        {opp.aiConfidence}%
                      </td>

                      <td className="py-3 px-4">
                        <span className="font-semibold text-slate-800">{opp.recommendedAction.replace(/_/g, " ")}</span>
                        <p className="text-[10px] text-slate-500 line-clamp-1">{opp.failureDiagnosis}</p>
                      </td>

                      <td className="py-3 px-4">
                        <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 uppercase">
                          {opp.recommendedChannel || "EMAIL"}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-right font-bold text-slate-900 tabular-nums text-sm">
                        {formatCurrency(opp.estimatedRecoverableAmount)}
                      </td>

                      <td className="py-3 px-4 text-center">
                        <span className={cn(
                          "inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border",
                          getStatusColor(opp.status)
                        )}>
                          {opp.status}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                        {isRecovered ? (
                          <span className="text-[11px] font-bold text-emerald-700 flex items-center justify-end gap-1">
                            <CheckCircle2 className="h-3.5 w-3.5" /> Recovered
                          </span>
                        ) : isStopped ? (
                          <span className="text-[11px] font-semibold text-red-600 flex items-center justify-end gap-1">
                            <ShieldAlert className="h-3.5 w-3.5" /> Policy Blocked
                          </span>
                        ) : isPending ? (
                          <button
                            onClick={() => handleExecute(opp.id)}
                            disabled={isExecuting}
                            className="inline-flex items-center gap-1 text-xs font-bold text-white bg-amber-600 px-3 py-1 rounded hover:bg-amber-700 transition-colors"
                          >
                            {isExecuting ? "Executing..." : "Request Approval"}
                          </button>
                        ) : (
                          <button
                            onClick={() => handleExecute(opp.id)}
                            disabled={isExecuting}
                            className="inline-flex items-center gap-1 text-xs font-bold text-white bg-indigo-600 px-3 py-1 rounded hover:bg-indigo-700 transition-colors shadow-2xs"
                          >
                            {isExecuting ? "Executing..." : "Execute Recovery"}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400 text-xs">
                    No recovery opportunities match selected filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <AIAnalysisModal
        opportunity={selectedOpportunity}
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onExecute={handleExecute}
        isExecuting={!!executingId}
      />
    </div>
  );
}
