import {
  CheckCircle2,
  XCircle,
  Clock,
  Sparkles,
  ShieldAlert,
  ShieldCheck,
  TrendingUp,
  Cpu,
  Zap,
  History,
  Target,
} from "lucide-react";
import { cn, formatCurrency, formatDate } from "@/lib/utils";
import type { RecoveryOpportunity } from "@/types";

interface AgentWorkflowProps {
  opportunity: RecoveryOpportunity;
  className?: string;
}

export default function AgentWorkflow({ opportunity, className }: AgentWorkflowProps) {
  const {
    transaction,
    recoveryScore,
    aiConfidence,
    recommendedAction,
    recommendedChannel,
    failureDiagnosis,
    diagnosisDetails,
    aiExplanation,
    timingRationale,
    status,
    attemptCount,
    recoveredAmount,
    createdAt,
    executedAt,
  } = opportunity;

  const isStopped = status === "STOPPED";
  const isPendingApproval = status === "PENDING_APPROVAL";
  const isRecovered = status === "RECOVERED";
  const isExecuting = status === "EXECUTING";
  const isEscalated = status === "ESCALATED";

  const stages = [
    {
      id: "DETECT",
      label: "1. DETECT",
      title: "Failed Payment Identified",
      status: "completed",
      detail: transaction
        ? `${transaction.paymentMethod.replace(/_/g, " ")} failure on ${transaction.gateway} gateway`
        : "Failed transaction ingested into agent pipeline",
      timestamp: createdAt ? formatDate(createdAt) : null,
      icon: CheckCircle2,
    },
    {
      id: "DIAGNOSE",
      label: "2. DIAGNOSE",
      title: "Groq AI Failure Diagnosis",
      status: "completed",
      detail: failureDiagnosis || "Failure analyzed by Groq model",
      subText: (diagnosisDetails as any)?.category
        ? `Root Cause Category: ${(diagnosisDetails as any).category} | Severity: ${(diagnosisDetails as any).severity || "MEDIUM"}`
        : undefined,
      icon: Sparkles,
    },
    {
      id: "SCORE",
      label: "3. SCORE",
      title: "Recovery Probability & Expected Value",
      status: "completed",
      detail: `Predictive Score: ${recoveryScore}/100 | AI Confidence: ${aiConfidence}%`,
      subText: aiExplanation || "Multi-factor probabilistic score computed",
      icon: TrendingUp,
    },
    {
      id: "DECIDE",
      label: "4. DECIDE",
      title: "AI Recommended Intervention",
      status: "completed",
      detail: `${recommendedAction.replace(/_/g, " ")} via ${recommendedChannel || "EMAIL"}`,
      subText: `Estimated Recoverable Value: ${formatCurrency(opportunity.estimatedRecoverableAmount)}`,
      icon: Cpu,
    },
    {
      id: "POLICY_CHECK",
      label: "5. POLICY CHECK",
      title: "Bounded Safety Guardrail Evaluation",
      status: isStopped ? "blocked" : isPendingApproval ? "pending" : "completed",
      detail: isStopped
        ? "AI recommendation overridden by policy guardrail"
        : isPendingApproval
        ? "Rule 3 Triggered: High-value transaction (>₹25,000) requires manual approval"
        : "Passed all 7 deterministic safety rules",
      subText: timingRationale || undefined,
      icon: isStopped ? ShieldAlert : ShieldCheck,
    },
    {
      id: "ACT",
      label: "6. ACT",
      title: "Recovery Action Dispatch",
      status: isStopped
        ? "skipped"
        : isPendingApproval
        ? "pending"
        : isRecovered || isExecuting || isEscalated
        ? "completed"
        : "pending",
      detail: isStopped
        ? "Outreach blocked by policy engine"
        : isRecovered
        ? `Recovered ${formatCurrency(recoveredAmount || opportunity.estimatedRecoverableAmount)} via ${recommendedChannel || "channel"}`
        : isExecuting
        ? "Outreach action actively dispatching..."
        : isPendingApproval
        ? "Awaiting merchant authorization"
        : `Queued for outreach (${attemptCount} attempts made)`,
      timestamp: executedAt ? formatDate(executedAt) : null,
      icon: Zap,
    },
    {
      id: "AUDIT",
      label: "7. AUDIT",
      title: "Immutable Ledger Logging",
      status: "completed",
      detail: "State transition & decision parameters logged to audit ledger",
      subText: "Verifiable log entry created",
      icon: History,
    },
    {
      id: "MEASURE",
      label: "8. MEASURE",
      title: "Recovery Realization & Telemetry",
      status: isRecovered ? "completed" : isStopped ? "blocked" : "pending",
      detail: isRecovered
        ? `Realized revenue: ${formatCurrency(recoveredAmount || opportunity.estimatedRecoverableAmount)}`
        : isStopped
        ? "Zero revenue loss from unauthorized retries"
        : "Telemetry monitoring for conversion",
      icon: Target,
    },
  ];

  return (
    <div className={cn("rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs space-y-4", className)}>
      {/* Header Bar */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-violet-600 text-white shadow-2xs">
            <Cpu className="h-4 w-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Agent Execution Pipeline</h4>
            <p className="text-[11px] text-slate-500">Autonomous bounded decision flow</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-2.5 py-0.5 text-[11px] font-bold text-violet-700 border border-violet-200">
            Powered by Groq
          </span>
          <span className={cn(
            "inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold border uppercase tracking-wider",
            status === "RECOVERED" ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
            status === "STOPPED" ? "bg-red-50 text-red-700 border-red-200" :
            status === "PENDING_APPROVAL" ? "bg-amber-50 text-amber-700 border-amber-200" :
            "bg-blue-50 text-blue-700 border-blue-200"
          )}>
            {status}
          </span>
        </div>
      </div>

      {/* Stepper Timeline */}
      <div className="relative space-y-2.5 pl-2">
        {stages.map((stage) => {
          const isBlocked = stage.status === "blocked";
          const isSkipped = stage.status === "skipped";
          const isPending = stage.status === "pending";

          return (
            <div
              key={stage.id}
              className={cn(
                "relative flex items-start gap-3 rounded-xl border p-3 transition-all text-xs",
                isBlocked
                  ? "border-red-200 bg-red-50/60"
                  : isPending
                  ? "border-amber-200 bg-amber-50/40"
                  : isSkipped
                  ? "border-slate-200 bg-slate-50/50 opacity-60"
                  : "border-slate-200 bg-slate-50/70"
              )}
            >
              {/* Status Icon */}
              <div className="mt-0.5 shrink-0">
                {isBlocked ? (
                  <ShieldAlert className="h-4.5 w-4.5 text-red-600" />
                ) : isPending ? (
                  <Clock className="h-4.5 w-4.5 text-amber-600 animate-pulse" />
                ) : isSkipped ? (
                  <XCircle className="h-4.5 w-4.5 text-slate-400" />
                ) : (
                  <CheckCircle2 className="h-4.5 w-4.5 text-emerald-600" />
                )}
              </div>

              {/* Stage Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[10px] font-bold tracking-wider text-slate-400 uppercase">
                      {stage.label}
                    </span>
                    <h5 className={cn(
                      "text-xs font-bold",
                      isBlocked ? "text-red-900" : "text-slate-900"
                    )}>
                      {stage.title}
                    </h5>
                  </div>
                  {stage.timestamp && (
                    <span className="text-[10px] text-slate-400 font-mono">{stage.timestamp}</span>
                  )}
                </div>

                <p className={cn(
                  "text-xs mt-0.5 font-medium",
                  isBlocked ? "text-red-800 font-bold" : "text-slate-700"
                )}>
                  {stage.detail}
                </p>

                {stage.subText && (
                  <p className="text-[11px] text-slate-500 mt-1 bg-white/80 rounded-lg px-2.5 py-1 border border-slate-200/80 font-medium">
                    {stage.subText}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Policy Guardrail Banner */}
      {(isStopped || isPendingApproval) && (
        <div className={cn(
          "rounded-xl p-3.5 text-xs border flex items-start gap-3",
          isStopped ? "bg-red-100/80 border-red-300 text-red-950" : "bg-amber-100/80 border-amber-300 text-amber-950"
        )}>
          <ShieldAlert className="h-5 w-5 shrink-0 mt-0.5 text-red-600" />
          <div>
            <p className="font-bold text-xs uppercase tracking-wider">
              {isStopped ? "POLICY BLOCK INTERCEPT" : "HUMAN APPROVAL REQUIRED"}
            </p>
            <p className="mt-0.5 text-xs font-medium leading-relaxed">
              {timingRationale || (isStopped ? "Autonomous action halted under merchant safety rules." : "Transaction exceeds autonomous execution threshold.")}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
