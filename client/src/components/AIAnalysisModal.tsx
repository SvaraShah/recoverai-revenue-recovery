import { X, CheckCircle2, Circle, AlertTriangle, Copy } from "lucide-react";
import { cn, formatCurrency, formatDate } from "@/lib/utils";
import type { RecoveryOpportunity } from "@/types";

interface AIAnalysisModalProps {
  opportunity: RecoveryOpportunity | null;
  isOpen: boolean;
  onClose: () => void;
  onExecute?: (opportunityId: string) => Promise<void>;
  isExecuting?: boolean;
}

export default function AIAnalysisModal({
  opportunity,
  isOpen,
  onClose,
  onExecute,
  isExecuting = false,
}: AIAnalysisModalProps) {
  if (!isOpen || !opportunity) return null;

  const {
    transaction,
    recoveryScore,
    aiConfidence,
    recommendedAction,
    recommendedChannel,
    estimatedRecoverableAmount,
    failureDiagnosis,
    status,
  } = opportunity;

  const isStopped = status === "STOPPED" || opportunity.transaction?.failureReason === "FRAUD_SUSPECTED" || opportunity.transaction?.failureReason === "INVALID_CARD";
  const isHighValue = (opportunity.transaction?.amount || opportunity.estimatedRecoverableAmount || 0) > 25000;
  const isPendingApproval = status === "PENDING_APPROVAL" || (isHighValue && !isStopped && status !== "RECOVERED");
  const isRecovered = status === "RECOVERED";

  const stages = [
    { id: "DETECT", label: "Detect", detail: "Revenue risk identified", status: "completed" },
    { id: "DIAGNOSE", label: "Diagnose", detail: failureDiagnosis || "Analysis of transaction failure", status: "completed" },
    { id: "SCORE", label: "Score", detail: `${recoveryScore} / 100`, status: "completed" },
    { id: "DECIDE", label: "Decide", detail: `${recommendedAction.replace(/_/g, " ")} via ${recommendedChannel || "EMAIL"}`, status: "completed" },
    {
      id: "POLICY_CHECK",
      label: "Policy Check",
      title: isStopped ? "POLICY BLOCKED" : isPendingApproval ? "PENDING APPROVAL" : "Autonomous action allowed",
      detail: isStopped
        ? "Recovery action prohibited for fraud risk"
        : isPendingApproval
        ? "High-value transaction (>₹25,000) requires human approval"
        : "Passed all deterministic safety rules",
      status: isStopped ? "blocked" : isPendingApproval ? "pending" : "completed",
    },
    {
      id: "ACT",
      label: "Act",
      detail: isStopped
        ? "Not executed"
        : isPendingApproval
        ? "Waiting for human approval"
        : isRecovered
        ? "Revenue successfully recovered"
        : "Recovery opportunity created",
      status: isStopped ? "blocked" : isPendingApproval ? "pending" : isRecovered ? "completed" : "active",
    },
    { id: "AUDIT", label: "Audit", detail: "Decision recorded", status: "completed" },
    { id: "MEASURE", label: "Measure", detail: isRecovered ? "Telemetry updated" : "Awaiting outcome", status: isRecovered ? "completed" : "pending" },
  ];

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/30 backdrop-blur-xs transition-opacity" onClick={onClose}>
      {/* Right Side Drawer Container */}
      <div
        className="w-full max-w-md h-full bg-white shadow-2xl border-l border-slate-200 overflow-y-auto flex flex-col justify-between animate-slide-in-right select-none"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drawer Header */}
        <div className="p-5 border-b border-slate-100 flex items-start justify-between bg-white sticky top-0 z-10">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-900 tracking-tight">AI Analysis</h2>
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-0.5">Powered by <strong>Groq</strong></p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Drawer Body Content */}
        <div className="p-5 space-y-5 flex-1 overflow-y-auto">
          {/* Transaction Summary Card */}
          <div className="rounded-2xl border border-slate-200/80 bg-slate-50/50 p-4 space-y-3">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Transaction Summary</span>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-black text-slate-900 tabular-nums">
                {formatCurrency(transaction?.amount || estimatedRecoverableAmount)}
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-50 text-red-600 border border-red-200 uppercase">
                {transaction?.status || "FAILED"}
              </span>
            </div>
            <div className="text-xs text-slate-500 font-medium space-y-1 pt-1 border-t border-slate-200/60">
              <div className="flex items-center gap-2">
                <span>{transaction?.gateway || "Razorpay"}</span>
                <span>·</span>
                <span>{transaction?.paymentMethod?.replace(/_/g, " ") || "EMI"}</span>
                <span>·</span>
                <span>{formatDate(transaction?.createdAt || opportunity.createdAt).split(",")[0]}</span>
              </div>
              <p className="text-[11px] font-mono text-slate-400 flex items-center gap-1">
                <span>Transaction ID: {transaction?.externalId || `pay_${opportunity.id.slice(0, 12)}`}</span>
                <Copy className="h-3 w-3 text-slate-400 cursor-pointer hover:text-slate-600" />
              </p>
            </div>
          </div>

          {/* Root Cause Diagnosis Box */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-4 space-y-2 shadow-2xs">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Root Cause</span>
            <p className="text-xs font-bold text-slate-900 leading-snug">
              {failureDiagnosis || "Analysis of transaction failure"}
            </p>
            <div className="pt-1">
              <span className="inline-block px-2.5 py-0.5 rounded text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-100">
                Confidence: {aiConfidence}%
              </span>
            </div>
          </div>

          {/* AI Agent Workflow Vertical Stepper Timeline */}
          <div className="space-y-3 pt-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">AI Agent Workflow</span>

            <div className="relative pl-3 space-y-4 border-l-2 border-slate-200">
              {stages.map((stage) => {
                const isComp = stage.status === "completed";
                const isAct = stage.status === "active";
                const isBlock = stage.status === "blocked";
                const isPend = stage.status === "pending";

                return (
                  <div key={stage.id} className="relative flex items-start gap-3 text-xs">
                    {/* Circle Node */}
                    <div className="absolute -left-[19px] top-0.5 bg-white rounded-full">
                      {isComp ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-600 fill-emerald-100" />
                      ) : isBlock ? (
                        <AlertTriangle className="h-4 w-4 text-red-600 fill-red-50" />
                      ) : isPend ? (
                        <AlertTriangle className="h-4 w-4 text-amber-500 fill-amber-50" />
                      ) : isAct ? (
                        <div className="h-3.5 w-3.5 rounded-full border-2 border-purple-600 bg-purple-100 animate-pulse" />
                      ) : (
                        <Circle className="h-3.5 w-3.5 text-slate-300 fill-white" />
                      )}
                    </div>

                    {/* Step Info */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <span className={cn(
                          "font-bold text-xs",
                          isComp ? "text-slate-900" : isBlock ? "text-red-600" : isPend ? "text-amber-600" : "text-slate-500"
                        )}>
                          {stage.label}
                        </span>
                      </div>
                      {stage.title && (
                        <p className={cn(
                          "text-[11px] font-bold mt-0.5",
                          isBlock ? "text-red-600" : isPend ? "text-amber-600" : "text-slate-900"
                        )}>
                          {stage.title}
                        </p>
                      )}
                      <p className="text-[11px] text-slate-500 mt-0.5 font-medium">{stage.detail}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Drawer Footer Action */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/80 flex items-center justify-between sticky bottom-0">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Recommended Action</span>
            <p className="text-xs font-bold text-slate-900">{recommendedAction.replace(/_/g, " ")}</p>
          </div>

          {onExecute && status !== "RECOVERED" && status !== "STOPPED" ? (
            <button
              onClick={() => onExecute(opportunity.id)}
              disabled={isExecuting}
              className="inline-flex items-center gap-1.5 rounded-xl bg-purple-600 px-4 py-2 text-xs font-bold text-white hover:bg-purple-700 transition-colors shadow-xs disabled:opacity-50"
            >
              {isExecuting ? "Executing..." : "Approve & Execute"}
            </button>
          ) : (
            <button
              onClick={onClose}
              className="rounded-xl border border-purple-200 bg-purple-50/50 px-4 py-2 text-xs font-bold text-purple-700 hover:bg-purple-100 transition-colors"
            >
              View Details
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
