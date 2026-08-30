import { useState } from "react";
import {
  Sparkles,
  Play,
  Clock,
  Target,
  TrendingUp,
  CheckCircle2,
  AlertCircle,
  Zap,
  Mail,
  MessageSquare,
  Link2,
  RefreshCw,
  UserCheck,
  Filter,
  Sliders,
  ShieldAlert,
  ShieldCheck,
  User,
  Activity,
  FileText,
} from "lucide-react";
import { cn, formatCurrency, getStatusColor, getScoreColor, getScoreBg, truncateId } from "@/lib/utils";
import { useFetch } from "@/hooks/useFetch";
import { recoveryApi } from "@/lib/api";
import type { PaginatedResponse, RecoveryOpportunity } from "@/types";

const actionIcons: Record<string, React.ElementType> = {
  SMART_RETRY: RefreshCw,
  PAYMENT_LINK: Link2,
  EMAIL_REMINDER: Mail,
  SMS_REMINDER: MessageSquare,
  SCHEDULED_RETRY: Clock,
  MANUAL_REVIEW: UserCheck,
  ESCALATE: AlertCircle,
  OFFER_ALTERNATIVE: Zap,
};

const statusFilters = [
  { value: "ALL", label: "All" },
  { value: "RECOMMENDED", label: "Recommended" },
  { value: "ELIGIBLE", label: "Eligible" },
  { value: "PENDING_APPROVAL", label: "Pending Approval" },
  { value: "EXECUTING", label: "Executing" },
  { value: "RECOVERED", label: "Recovered" },
  { value: "STOPPED", label: "Stopped" },
  { value: "FAILED", label: "Failed" },
  { value: "ESCALATED", label: "Escalated" },
];

export default function RecoveryPage() {
  const [status, setStatus] = useState("ALL");
  const [page, setPage] = useState(1);
  const [executing, setExecuting] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  
  // Modals state
  const [selectedOpp, setSelectedOpp] = useState<RecoveryOpportunity | null>(null);
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [batchConfig, setBatchConfig] = useState({ batchSize: 25, guardrailsEnabled: true, approvalRequired: true });
  const [batchRunning, setBatchRunning] = useState(false);
  const [batchResult, setBatchResult] = useState<any | null>(null);

  const { data, loading, refetch } = useFetch<PaginatedResponse<RecoveryOpportunity>>(
    () => recoveryApi.getAll({ status, page: String(page), limit: "12", sort: "recoveryScore", order: "desc" }),
    [status, page]
  );

  const handleExecute = async (id: string) => {
    setExecuting(id);
    try {
      await recoveryApi.execute(id);
      refetch();
      // Update selectedOpp details if open
      if (selectedOpp && selectedOpp.id === id) {
        const fresh = await recoveryApi.getById(id);
        setSelectedOpp(fresh);
      }
    } catch (err: any) {
      alert(err.message || "Failed to execute recovery");
    } finally {
      setExecuting(null);
    }
  };

  const handleBulkExecute = async () => {
    if (selectedIds.size === 0) return;
    try {
      await recoveryApi.bulkExecute(Array.from(selectedIds));
      setSelectedIds(new Set());
      refetch();
    } catch {
      // handle error
    }
  };

  const handleRunBatch = async () => {
    setBatchRunning(true);
    try {
      const res = await recoveryApi.createBatchRun(batchConfig);
      setBatchResult(res);
      refetch();
    } catch {
      alert("Simulation failed to run");
    } finally {
      setBatchRunning(false);
    }
  };

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  // Summary stats
  const totalRecoverable = data?.data.reduce((s, o) => s + o.estimatedRecoverableAmount, 0) || 0;
  const avgScore = data?.data.length
    ? Math.round(data.data.reduce((s, o) => s + o.recoveryScore, 0) / data.data.length)
    : 0;

  return (
    <div className="space-y-5">
      {/* Summary Bar */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm flex items-center gap-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50">
            <Target className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500">Total Opportunities</p>
            <p className="text-xl font-bold text-slate-900">{data?.total || 0}</p>
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm flex items-center gap-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50">
            <TrendingUp className="h-5 w-5 text-emerald-600" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500">Total Recoverable (Est.)</p>
            <p className="text-xl font-bold text-slate-900">{formatCurrency(totalRecoverable)}</p>
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm flex items-center gap-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-50">
            <Sparkles className="h-5 w-5 text-violet-600" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500">Avg Recovery Score</p>
            <p className="text-xl font-bold text-slate-900">{avgScore}<span className="text-sm text-slate-400">/100</span></p>
          </div>
        </div>
      </div>

      {/* Filters & Actions */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-1 overflow-x-auto pb-1 max-w-full">
          {statusFilters.map((tab) => (
            <button
              key={tab.value}
              onClick={() => { setStatus(tab.value); setPage(1); }}
              className={cn(
                "px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap border",
                status === tab.value
                  ? "bg-blue-600 text-white border-blue-600"
                  : "text-slate-600 hover:bg-slate-50 bg-white border-slate-200"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          {selectedIds.size > 0 && (
            <button
              onClick={handleBulkExecute}
              className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-xs font-medium text-white hover:bg-blue-700 transition-colors"
            >
              <Play className="h-3.5 w-3.5" />
              Execute {selectedIds.size} Selected
            </button>
          )}
          <button
            onClick={() => { setShowBatchModal(true); setBatchResult(null); }}
            className="flex items-center gap-2 rounded-lg bg-slate-900 text-white hover:bg-slate-800 px-4 py-2 text-xs font-medium transition-colors"
          >
            <Sliders className="h-3.5 w-3.5" />
            Run Recovery Batch
          </button>
        </div>
      </div>

      {/* Cards Grid */}
      {loading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-64 rounded-xl border border-slate-200 bg-white animate-pulse" />
          ))}
        </div>
      ) : data && data.data.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {data.data.map((opp) => {
            const ActionIcon = actionIcons[opp.recommendedAction] || Zap;
            const isSelected = selectedIds.has(opp.id);
            const canExecute = ["IDENTIFIED", "ELIGIBLE", "RECOMMENDED", "PENDING_APPROVAL"].includes(opp.status);

            return (
              <div
                key={opp.id}
                onClick={() => setSelectedOpp(opp)}
                className={cn(
                  "rounded-xl border bg-white shadow-sm transition-all duration-200 hover:shadow-md cursor-pointer flex flex-col relative",
                  isSelected ? "border-blue-400 ring-2 ring-blue-100" : "border-slate-200"
                )}
              >
                {/* Header */}
                <div className="flex items-start justify-between p-4 pb-3">
                  <div className="flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
                    {canExecute && (
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelect(opp.id)}
                        className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                    )}
                    <div>
                      <p className="text-sm font-semibold text-slate-900">
                        {opp.transaction?.customer?.name || "Customer"}
                      </p>
                      <p className="text-xs text-slate-400">
                        {opp.transaction?.customer?.email || ""}
                      </p>
                    </div>
                  </div>
                  <span className={cn(
                    "px-2 py-0.5 rounded-full text-[10px] font-semibold border uppercase tracking-wider shrink-0",
                    getStatusColor(opp.status)
                  )}>
                    {opp.status.replace(/_/g, " ")}
                  </span>
                </div>

                {/* Score & Amount */}
                <div className="px-4 flex items-center gap-4 flex-1">
                  <div className={cn("flex items-center justify-center rounded-full h-14 w-14 border-2 shrink-0", getScoreBg(opp.recoveryScore))}>
                    <span className={cn("text-lg font-bold", getScoreColor(opp.recoveryScore))}>
                      {opp.recoveryScore}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] text-slate-500">Estimated Recovery</p>
                    <p className="text-base font-bold text-slate-900">
                      {formatCurrency(opp.estimatedRecoverableAmount)}
                    </p>
                    <div className="flex justify-between items-center text-[10px] text-slate-400 mt-0.5">
                      <span>Conf: {Math.round(opp.aiConfidence)}%</span>
                      {opp.priority && (
                        <span className={cn(
                          "px-1 py-0.2 rounded font-bold uppercase text-[9px]",
                          opp.priority === "CRITICAL" ? "bg-red-50 text-red-700" :
                          opp.priority === "HIGH" ? "bg-orange-50 text-orange-700" :
                          opp.priority === "MEDIUM" ? "bg-blue-50 text-blue-700" :
                          "bg-slate-50 text-slate-700"
                        )}>
                          {opp.priority}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Diagnosis */}
                <div className="px-4 mt-3">
                  <p className="text-xs text-slate-600 line-clamp-2">{opp.failureDiagnosis}</p>
                </div>

                {/* Recommended Action */}
                <div className="mx-4 mt-3 rounded-lg bg-slate-50 p-2.5 flex items-center gap-2.5">
                  <div className="flex h-7 w-7 items-center justify-center rounded-md bg-white border border-slate-200 shrink-0">
                    <ActionIcon className="h-3.5 w-3.5 text-blue-600" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-slate-700">
                      {opp.recommendedAction.replace(/_/g, " ")}
                    </p>
                    <p className="text-[10px] text-slate-400 truncate">
                      {opp.timingRationale || `Scheduled Outreach`}
                    </p>
                  </div>
                  {opp.autoExecute && (
                    <span className="ml-auto text-[9px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 uppercase shrink-0">
                      Auto
                    </span>
                  )}
                </div>

                {/* Footer Actions */}
                <div className="flex items-center gap-2 p-4 pt-3 mt-auto" onClick={(e) => e.stopPropagation()}>
                  {canExecute && (
                    <button
                      onClick={() => handleExecute(opp.id)}
                      disabled={executing === opp.id}
                      className={cn(
                        "flex-1 flex items-center justify-center gap-2 rounded-lg py-2 text-xs font-medium transition-colors",
                        executing === opp.id
                          ? "bg-blue-100 text-blue-400 cursor-wait"
                          : "bg-blue-600 text-white hover:bg-blue-700"
                      )}
                    >
                      {executing === opp.id ? (
                        <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Play className="h-3.5 w-3.5" />
                      )}
                      {opp.status === "PENDING_APPROVAL" ? "Approve & Execute" : executing === opp.id ? "Executing..." : "Execute Recovery"}
                    </button>
                  )}
                  {opp.status === "RECOVERED" && opp.recoveredAmount && (
                    <div className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-emerald-50 py-2 border border-emerald-200">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                      <span className="text-xs font-semibold text-emerald-700">
                        Recovered: {formatCurrency(opp.recoveredAmount)}
                      </span>
                    </div>
                  )}
                  {opp.status === "STOPPED" && (
                    <div className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-slate-50 py-2 border border-slate-200 text-slate-500">
                      <AlertCircle className="h-3.5 w-3.5" />
                      <span className="text-xs font-medium">Outreach Blocked</span>
                    </div>
                  )}
                  {opp.status === "ESCALATED" && (
                    <div className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-amber-50 py-2 border border-amber-200 text-amber-700">
                      <AlertCircle className="h-3.5 w-3.5" />
                      <span className="text-xs font-semibold">Manual Action Needed</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400 bg-white rounded-xl border border-slate-200">
          <Filter className="h-10 w-10 mb-3 text-slate-300" />
          <p className="text-sm">No recovery opportunities found</p>
        </div>
      )}

      {/* Pagination */}
      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          {Array.from({ length: Math.min(5, data.totalPages) }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              onClick={() => setPage(p)}
              className={cn(
                "h-8 w-8 rounded-lg text-sm font-medium transition-colors",
                page === p ? "bg-blue-600 text-white" : "border border-slate-200 text-slate-600 hover:bg-slate-50"
              )}
            >
              {p}
            </button>
          ))}
        </div>
      )}

      {/* Batch Simulation Modal */}
      {showBatchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setShowBatchModal(false)}>
          <div className="mx-4 w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl overflow-y-auto max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Run Recovery Batch Simulation</h3>
                <p className="text-xs text-slate-500">Run bounded agent recoveries across failed transactions</p>
              </div>
              <button onClick={() => setShowBatchModal(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            {!batchResult ? (
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">Batch Size</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[25, 50, 100].map((size) => (
                      <button
                        key={size}
                        onClick={() => setBatchConfig({ ...batchConfig, batchSize: size })}
                        className={cn(
                          "py-2 text-sm font-semibold rounded-lg border transition-colors",
                          batchConfig.batchSize === size
                            ? "bg-slate-900 text-white border-slate-900"
                            : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                        )}
                      >
                        {size} Opportunities
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-3 bg-slate-50 rounded-xl p-4 border border-slate-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold text-slate-700">Apply Bounded Guardrails</p>
                      <p className="text-[11px] text-slate-500">Validate limits and invalid states before outreach</p>
                    </div>
                    <button
                      onClick={() => setBatchConfig({ ...batchConfig, guardrailsEnabled: !batchConfig.guardrailsEnabled })}
                      className={cn(
                        "relative h-6 w-11 rounded-full transition-colors",
                        batchConfig.guardrailsEnabled ? "bg-blue-600" : "bg-slate-300"
                      )}
                    >
                      <span className={cn(
                        "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform",
                        batchConfig.guardrailsEnabled ? "translate-x-5" : "translate-x-0.5"
                      )} />
                    </button>
                  </div>
                  <div className="h-px bg-slate-200" />
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold text-slate-700">Require High-Value Approvals</p>
                      <p className="text-[11px] text-slate-500">Escalate recovery &gt; ₹25,000 to pending approval state</p>
                    </div>
                    <button
                      onClick={() => setBatchConfig({ ...batchConfig, approvalRequired: !batchConfig.approvalRequired })}
                      className={cn(
                        "relative h-6 w-11 rounded-full transition-colors",
                        batchConfig.approvalRequired ? "bg-blue-600" : "bg-slate-300"
                      )}
                    >
                      <span className={cn(
                        "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform",
                        batchConfig.approvalRequired ? "translate-x-5" : "translate-x-0.5"
                      )} />
                    </button>
                  </div>
                </div>

                <div className="rounded-lg bg-blue-50 border border-blue-200 p-3 flex items-start gap-2.5">
                  <ShieldCheck className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
                  <p className="text-xs text-blue-800 leading-relaxed">
                    <strong>Simulation Mode:</strong> No real payments are processed. Opportunities will be simulated with transaction-level logic based on failure causes and history.
                  </p>
                </div>

                <button
                  onClick={handleRunBatch}
                  disabled={batchRunning}
                  className="w-full flex items-center justify-center gap-2 rounded-lg bg-blue-600 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:bg-blue-400 transition-colors mt-6"
                >
                  {batchRunning ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      Running Bounded Agent Batch Run...
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4" />
                      Execute Simulation Batch
                    </>
                  )}
                </button>
              </div>
            ) : (
              <div className="space-y-5">
                <div className="rounded-xl border border-slate-200 bg-emerald-50/50 p-4 border-l-4 border-l-emerald-500">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                    <span className="text-sm font-bold text-emerald-900">Simulation Batch Run Completed</span>
                  </div>
                  <p className="text-xs text-emerald-800">
                    Calculated outcomes derived from transaction-level guardrails and scorer.
                  </p>
                </div>

                {/* Batch Metrics Grid */}
                <div className="grid grid-cols-2 gap-3 text-center">
                  <div className="rounded-lg bg-slate-50 border border-slate-200 p-2.5">
                    <p className="text-[10px] text-slate-500 uppercase tracking-wider">Revenue at Risk</p>
                    <p className="text-sm font-bold text-slate-800">{formatCurrency(batchResult.totalRevenueAtRisk)}</p>
                  </div>
                  <div className="rounded-lg bg-slate-50 border border-slate-200 p-2.5">
                    <p className="text-[10px] text-slate-500 uppercase tracking-wider">Expected Recovery</p>
                    <p className="text-sm font-bold text-slate-800">{formatCurrency(batchResult.totalExpectedRecovery)}</p>
                  </div>
                  <div className="rounded-lg bg-emerald-50 border border-emerald-100 p-2.5">
                    <p className="text-[10px] text-emerald-600 uppercase tracking-wider font-semibold">Simulated Recovered</p>
                    <p className="text-base font-bold text-emerald-800">{formatCurrency(batchResult.totalRecoveredRevenue)}</p>
                  </div>
                  <div className="rounded-lg bg-blue-50 border border-blue-100 p-2.5">
                    <p className="text-[10px] text-blue-600 uppercase tracking-wider font-semibold">Realized Rate</p>
                    <p className="text-base font-bold text-blue-800">{batchResult.recoveryRate}%</p>
                  </div>
                </div>

                {/* Detailed counts */}
                <div className="rounded-xl border border-slate-200 p-4 bg-white space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Total Transactions Checked</span>
                    <span className="font-semibold text-slate-800">{batchResult.totalTransactions}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Attempted Recoveries</span>
                    <span className="font-semibold text-slate-800">{batchResult.attemptedRecoveries}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Successful Recoveries</span>
                    <span className="font-semibold text-emerald-600">{batchResult.successfulRecoveries}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Guardrail Stopped (Rule 1/2/5)</span>
                    <span className="font-semibold text-red-600">{batchResult.stoppedRecoveries}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Escalated (Rule 3/4)</span>
                    <span className="font-semibold text-amber-600">{batchResult.escalatedRecoveries}</span>
                  </div>
                </div>

                <div className="space-y-2 bg-slate-50 rounded-xl p-3 border border-slate-200 text-xs text-slate-600">
                  <p className="font-bold text-slate-800 mb-1 text-[11px] uppercase tracking-wider">Agent Guardrail Decisions</p>
                  <div className="flex gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-red-500 mt-1.5 shrink-0" />
                    <p>Stopped recoveries occurred due to reached retry limits (Rule 1) or fraud flags (Rule 2).</p>
                  </div>
                  <div className="flex gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                    <p>Escalated recoveries occurred due to values exceeding ₹25,000 (Rule 3) or AI confidence &lt; 50% (Rule 4).</p>
                  </div>
                </div>

                <button
                  onClick={() => setShowBatchModal(false)}
                  className="w-full rounded-lg bg-slate-900 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 transition-colors"
                >
                  Close & Refresh Page
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Opportunity Detail Modal */}
      {selectedOpp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setSelectedOpp(null)}>
          <div className="mx-4 w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl overflow-y-auto max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">Recovery Opportunity details</h3>
                <p className="text-xs text-slate-400">Opportunity ID: {selectedOpp.id}</p>
              </div>
              <span className={cn(
                "px-2 py-0.5 rounded-full text-xs font-semibold border uppercase tracking-wider",
                getStatusColor(selectedOpp.status)
              )}>
                {selectedOpp.status.replace(/_/g, " ")}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              {/* Transaction & Customer Details */}
              <div className="space-y-3">
                <div className="rounded-xl border border-slate-200 p-3 bg-slate-50/50">
                  <h4 className="font-bold text-slate-800 mb-2 flex items-center gap-1.5">
                    <FileText className="h-3.5 w-3.5 text-slate-500" />
                    Transaction Info
                  </h4>
                  <div className="space-y-1.5 text-slate-600">
                    <div className="flex justify-between"><span className="text-slate-400">ID:</span> <span className="font-mono">{truncateId(selectedOpp.transaction?.externalId || "")}</span></div>
                    <div className="flex justify-between"><span className="text-slate-400">Amount:</span> <span className="font-semibold text-slate-900">{formatCurrency(selectedOpp.transaction?.amount || 0)}</span></div>
                    <div className="flex justify-between"><span className="text-slate-400">Gateway:</span> <span>{selectedOpp.transaction?.gateway}</span></div>
                    <div className="flex justify-between"><span className="text-slate-400">Method:</span> <span>{selectedOpp.transaction?.paymentMethod.replace(/_/g, " ")}</span></div>
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 p-3 bg-slate-50/50">
                  <h4 className="font-bold text-slate-800 mb-2 flex items-center gap-1.5">
                    <User className="h-3.5 w-3.5 text-slate-500" />
                    Customer History
                  </h4>
                  <div className="space-y-1.5 text-slate-600">
                    <div className="flex justify-between"><span className="text-slate-400">Name:</span> <span className="font-medium">{selectedOpp.transaction?.customer?.name}</span></div>
                    <div className="flex justify-between"><span className="text-slate-400">Total Transacted:</span> <span>{selectedOpp.transaction?.customer?.totalTransactions}</span></div>
                    <div className="flex justify-between"><span className="text-slate-400">Success Rate:</span> <span className="font-semibold text-emerald-600">{selectedOpp.transaction?.customer ? Math.round((selectedOpp.transaction.customer.successfulPayments / selectedOpp.transaction.customer.totalTransactions) * 100) : 0}%</span></div>
                    <div className="flex justify-between"><span className="text-slate-400">Risk Score:</span> <span>{selectedOpp.transaction?.customer?.riskScore.toFixed(0)}/100</span></div>
                  </div>
                </div>
              </div>

              {/* AI Diagnostic details */}
              <div className="space-y-3">
                <div className="rounded-xl border border-slate-200 p-3 bg-slate-50/50">
                  <h4 className="font-bold text-slate-800 mb-2 flex items-center gap-1.5">
                    <Activity className="h-3.5 w-3.5 text-slate-500" />
                    Failure Diagnosis
                  </h4>
                  <div className="space-y-1.5 text-slate-600">
                    <div className="flex justify-between"><span className="text-slate-400">Diagnosis:</span> <span>{selectedOpp.failureDiagnosis}</span></div>
                    {selectedOpp.transaction?.failureMessage && (
                      <div className="flex justify-between"><span className="text-slate-400">Raw Message:</span> <span>{selectedOpp.transaction.failureMessage}</span></div>
                    )}
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 p-3 bg-slate-50/50">
                  <h4 className="font-bold text-slate-800 mb-2 flex items-center gap-1.5">
                    <Sliders className="h-3.5 w-3.5 text-slate-500" />
                    AI Engine Output
                  </h4>
                  <div className="space-y-1.5 text-slate-600">
                    <div className="flex justify-between"><span className="text-slate-400">Recovery Score:</span> <span className={cn("font-bold", getScoreColor(selectedOpp.recoveryScore))}>{selectedOpp.recoveryScore}/100</span></div>
                    <div className="flex justify-between"><span className="text-slate-400">Confidence:</span> <span>{Math.round(selectedOpp.aiConfidence)}%</span></div>
                    {selectedOpp.expectedValue !== undefined && (
                      <div className="flex justify-between"><span className="text-slate-400">Expected Value:</span> <span className="font-semibold text-slate-900">{formatCurrency(selectedOpp.expectedValue)}</span></div>
                    )}
                    {selectedOpp.priority && (
                      <div className="flex justify-between"><span className="text-slate-400">Priority Level:</span> <span>{selectedOpp.priority}</span></div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* AI Explanation Paragraph */}
            {selectedOpp.aiExplanation && (
              <div className="mt-3 rounded-xl bg-blue-50 border border-blue-200 p-3.5 text-xs text-blue-900">
                <p className="font-bold text-blue-950 mb-1 flex items-center gap-1">
                  <Sparkles className="h-3.5 w-3.5 text-blue-700" />
                  Explainable Decision Rationale
                </p>
                <p className="leading-relaxed">{selectedOpp.aiExplanation}</p>
              </div>
            )}

            {/* Guardrails Assessment Check list */}
            <div className="mt-4 border border-slate-200 rounded-xl p-4 bg-white">
              <h4 className="text-xs font-bold text-slate-800 mb-3 flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-blue-600" />
                Guardrail Checks
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                {/* Rule 1 */}
                <div className="flex items-center gap-2">
                  {selectedOpp.attemptCount < 3 ? (
                    <ShieldCheck className="h-4 w-4 text-emerald-500 shrink-0" />
                  ) : (
                    <ShieldAlert className="h-4 w-4 text-red-500 shrink-0" />
                  )}
                  <span className="text-slate-600">Retry Limit check ({selectedOpp.attemptCount}/3)</span>
                </div>
                {/* Rule 2 */}
                <div className="flex items-center gap-2">
                  {selectedOpp.transaction?.failureReason !== "FRAUD_SUSPECTED" ? (
                    <ShieldCheck className="h-4 w-4 text-emerald-500 shrink-0" />
                  ) : (
                    <ShieldAlert className="h-4 w-4 text-red-500 shrink-0" />
                  )}
                  <span className="text-slate-600">Fraud Suspicion Check</span>
                </div>
                {/* Rule 3 */}
                <div className="flex items-center gap-2">
                  {(selectedOpp.transaction?.amount || 0) <= 25000 ? (
                    <ShieldCheck className="h-4 w-4 text-emerald-500 shrink-0" />
                  ) : (
                    <ShieldAlert className="h-4 w-4 text-amber-500 shrink-0" />
                  )}
                  <span className="text-slate-600">High-Value Limit Check (&lt;₹25k)</span>
                </div>
                {/* Rule 4 */}
                <div className="flex items-center gap-2">
                  {selectedOpp.aiConfidence >= 50 ? (
                    <ShieldCheck className="h-4 w-4 text-emerald-500 shrink-0" />
                  ) : (
                    <ShieldAlert className="h-4 w-4 text-amber-500 shrink-0" />
                  )}
                  <span className="text-slate-600">Confidence Threshold (&gt;50%)</span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 mt-6 border-t border-slate-100 pt-4" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={() => setSelectedOpp(null)}
                className="flex-1 rounded-lg border border-slate-200 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
              >
                Close
              </button>
              {["IDENTIFIED", "ELIGIBLE", "RECOMMENDED", "PENDING_APPROVAL"].includes(selectedOpp.status) && (
                <button
                  onClick={() => handleExecute(selectedOpp.id)}
                  disabled={executing === selectedOpp.id}
                  className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-blue-600 py-2.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:bg-blue-400 transition-colors"
                >
                  {executing === selectedOpp.id ? (
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Play className="h-3.5 w-3.5" />
                  )}
                  {selectedOpp.status === "PENDING_APPROVAL" ? "Approve & Execute Outreach" : "Execute Outreach"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
