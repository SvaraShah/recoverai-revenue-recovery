import { useFetch } from "@/hooks/useFetch";
import { recoveryApi } from "@/lib/api";
import { formatDate, truncateId } from "@/lib/utils";
import { Sparkles, ShieldAlert, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import ErrorState from "@/components/ErrorState";

interface AuditLogEntry {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  details: {
    transactionId?: string;
    aiEngine?: string;
    previousState?: string;
    newState?: string;
    reason?: string;
    recoveryScore?: number;
    confidence?: number;
    recommendedAction?: string;
    policyOverride?: string;
    actor?: string;
    expectedAmount?: number;
  };
  outcome?: string;
  timestamp: string;
}

export default function AuditLogPage() {
  const {
    data: logs,
    loading,
    error,
    refetch,
  } = useFetch<AuditLogEntry[]>(
    () => recoveryApi.getAuditLog(),
    []
  );

  const safeLogs = Array.isArray(logs) ? logs : [];

  if (error && safeLogs.length === 0) {
    return (
      <ErrorState
        title="Failed to load audit ledger"
        message={error}
        onRetry={refetch}
      />
    );
  }

  return (
    <div className="space-y-4 select-none">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-200 pb-3">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Audit Ledger</h1>
          <p className="text-xs text-slate-500 mt-0.5 font-medium">
            Verifiable log of AI agent decisions, policy guardrails, and execution actions.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono font-semibold text-slate-500 bg-slate-100 border border-slate-200 px-3 py-1.5 rounded-lg">
            {safeLogs.length} Ledger Entries
          </span>
        </div>
      </div>

      {/* Audit Log Table/Timeline Hybrid */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500 sticky top-0">
              <tr>
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">Event / Action</th>
                <th className="py-3 px-4">Entity / Transaction</th>
                <th className="py-3 px-4">State Transition</th>
                <th className="py-3 px-4">Actor</th>
                <th className="py-3 px-4 text-right">Details & Reasoning</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading && safeLogs.length === 0 ? (
                [...Array(6)].map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={6} className="py-3.5 px-4"><div className="h-4 bg-slate-100 rounded" /></td>
                  </tr>
                ))
              ) : safeLogs.length > 0 ? (
                safeLogs.map((log) => {
                  const actionStr = log.action || "LOG_ENTRY";
                  const isAi = actionStr === "AI_ANALYSIS";
                  const isStopped = actionStr === "RECOVERY_STOPPED" || log.details?.policyOverride;

                  return (
                    <tr key={log.id || Math.random().toString()} className="hover:bg-slate-50/80 transition-colors">
                      {/* Timestamp */}
                      <td className="py-3 px-4 font-mono text-[11px] text-slate-400 whitespace-nowrap">
                        {log.timestamp ? formatDate(log.timestamp) : "Recently"}
                      </td>

                      {/* Event / Action */}
                      <td className="py-3 px-4">
                        <span className={cn(
                          "inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border",
                          isStopped ? "bg-red-50 text-red-700 border-red-200" :
                          isAi ? "bg-indigo-50 text-indigo-700 border-indigo-200" :
                          "bg-slate-100 text-slate-700 border-slate-200"
                        )}>
                          {isStopped ? <ShieldAlert className="h-3 w-3" /> : isAi ? <Sparkles className="h-3 w-3 text-indigo-600" /> : <CheckCircle2 className="h-3 w-3 text-slate-500" />}
                          <span>{actionStr.replace(/_/g, " ")}</span>
                        </span>
                      </td>

                      {/* Entity / Transaction */}
                      <td className="py-3 px-4 font-mono text-[11px] text-slate-700 font-semibold">
                        {log.details?.transactionId ? `#${truncateId(log.details.transactionId)}` : log.entityId ? truncateId(log.entityId) : "N/A"}
                      </td>

                      {/* State Transition */}
                      <td className="py-3 px-4">
                        {log.details?.previousState || log.details?.newState ? (
                          <div className="flex items-center gap-1 text-[11px] font-mono font-semibold text-slate-700">
                            <span className="text-slate-400">{log.details.previousState || "INIT"}</span>
                            <span>→</span>
                            <span className="text-slate-900">{log.details.newState || "UPDATED"}</span>
                          </div>
                        ) : (
                          <span className="text-slate-400 text-[11px]">—</span>
                        )}
                      </td>

                      {/* Actor */}
                      <td className="py-3 px-4">
                        <span className="font-semibold text-slate-700 text-[11px]">
                          {log.details?.actor || (isAi ? "Groq AI Agent" : "Recovery Engine")}
                        </span>
                      </td>

                      {/* Details & Reasoning */}
                      <td className="py-3 px-4 text-right">
                        <p className="text-xs font-medium text-slate-800 line-clamp-1">
                          {log.details?.reason || log.details?.policyOverride || "Action executed"}
                        </p>
                        {log.details?.recoveryScore !== undefined && (
                          <p className="text-[10px] font-mono text-slate-400">
                            Score: {log.details.recoveryScore}/100 | Confidence: {log.details.confidence}%
                          </p>
                        )}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400 text-xs">
                    No audit log entries recorded yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
