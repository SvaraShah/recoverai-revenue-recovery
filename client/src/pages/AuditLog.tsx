import { useFetch } from "@/hooks/useFetch";
import { recoveryApi } from "@/lib/api";
import { formatCurrency, formatDateTime, truncateId } from "@/lib/utils";
import { ShieldCheck, History, ArrowRight, User } from "lucide-react";
import { cn } from "@/lib/utils";

interface AuditLogEntry {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  details: {
    transactionId?: string;
    previousState?: string;
    newState?: string;
    reason?: string;
    recoveryScore?: number;
    confidence?: number;
    expectedAmount?: number;
    actualAmount?: number | null;
    guardrailResult?: {
      maxRetries: number;
      attemptCount: number;
    };
  };
  outcome: string;
  userId?: string;
  ipAddress?: string;
  timestamp: string;
}

export default function AuditLogPage() {
  const { data: logs, loading } = useFetch<AuditLogEntry[]>(
    () => recoveryApi.getAuditLog(),
    []
  );

  const getActionBadgeColor = (action: string) => {
    switch (action) {
      case "AI_ANALYSIS": return "bg-sky-50 text-sky-700 border-sky-200";
      case "RECOVERY_EXECUTED": return "bg-blue-50 text-blue-700 border-blue-200";
      case "RECOVERY_SUCCEEDED": return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "RECOVERY_FAILED": return "bg-red-50 text-red-700 border-red-200";
      case "RECOVERY_STOPPED": return "bg-slate-50 text-slate-700 border-slate-200";
      case "RECOVERY_ESCALATED": return "bg-amber-50 text-amber-700 border-amber-200";
      case "APPROVAL_REQUIRED": return "bg-purple-50 text-purple-700 border-purple-200";
      default: return "bg-slate-50 text-slate-700 border-slate-200";
    }
  };

  return (
    <div className="space-y-5">
      {/* Header Card */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50">
          <History className="h-5 w-5 text-blue-600" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-slate-900">Agent Audit Trail</h3>
          <p className="text-xs text-slate-500">
            Immutable log of all AI diagnostic steps, guardrail validations, and simulated outreach actions.
          </p>
        </div>
      </div>

      {/* Logs Table */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-16 rounded-xl border border-slate-200 bg-white animate-pulse" />
          ))}
        </div>
      ) : logs && logs.length > 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50 text-left text-slate-500 uppercase tracking-wider">
                  <th className="px-5 py-3 font-semibold">Timestamp</th>
                  <th className="px-5 py-3 font-semibold">Action</th>
                  <th className="px-5 py-3 font-semibold">Target Opportunity</th>
                  <th className="px-5 py-3 font-semibold">State Transition</th>
                  <th className="px-5 py-3 font-semibold">Guardrail & Reason Description</th>
                  <th className="px-5 py-3 font-semibold">Actor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-5 py-3 whitespace-nowrap text-slate-400 font-mono">
                      {formatDateTime(log.timestamp)}
                    </td>
                    <td className="px-5 py-3 whitespace-nowrap">
                      <span className={cn(
                        "px-2 py-0.5 rounded border text-[10px] font-bold uppercase",
                        getActionBadgeColor(log.action)
                      )}>
                        {log.action.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="px-5 py-3 whitespace-nowrap font-mono text-slate-500">
                      {truncateId(log.entityId)}
                    </td>
                    <td className="px-5 py-3 whitespace-nowrap font-medium">
                      {log.details.previousState ? (
                        <div className="flex items-center gap-1">
                          <span className="text-slate-400 font-normal">{log.details.previousState}</span>
                          <ArrowRight className="h-3 w-3 text-slate-300" />
                          <span className="text-slate-900">{log.details.newState}</span>
                        </div>
                      ) : (
                        <span className="text-slate-900">{log.outcome || "CREATED"}</span>
                      )}
                    </td>
                    <td className="px-5 py-3 max-w-md">
                      <p className="font-medium text-slate-800 line-clamp-1">
                        {log.details.reason || "AI Opportunity Analysis generated."}
                      </p>
                      {log.details.guardrailResult && (
                        <p className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-1">
                          <ShieldCheck className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                          Guardrail checked: attempt {log.details.guardrailResult.attemptCount} of {log.details.guardrailResult.maxRetries} allowed retries.
                        </p>
                      )}
                      {log.details.expectedAmount && (
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          Value: {formatCurrency(log.details.expectedAmount)} expected
                          {log.details.actualAmount !== undefined && log.details.actualAmount !== null && (
                            <span className="font-semibold text-emerald-600"> (₹{log.details.actualAmount} actual recovered)</span>
                          )}
                        </p>
                      )}
                    </td>
                    <td className="px-5 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-1.5 text-slate-500">
                        <User className="h-3.5 w-3.5 text-slate-400" />
                        <span>{log.action.startsWith("AI_") ? "AI Agent" : "Merchant Admin"}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400 bg-white rounded-xl border border-slate-200">
          <History className="h-10 w-10 mb-3 text-slate-300" />
          <p className="text-sm">No audit logs found</p>
        </div>
      )}
    </div>
  );
}
