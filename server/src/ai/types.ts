export type TransactionStatus = "SUCCESS" | "FAILED" | "DECLINED" | "ABANDONED" | "PENDING";
export type PaymentMethod = "CREDIT_CARD" | "DEBIT_CARD" | "UPI" | "NET_BANKING" | "WALLET" | "EMI";
export type FailureReason =
  | "INSUFFICIENT_FUNDS"
  | "CARD_EXPIRED"
  | "BANK_TIMEOUT"
  | "FRAUD_SUSPECTED"
  | "TECHNICAL_ERROR"
  | "AUTHENTICATION_FAILED"
  | "LIMIT_EXCEEDED"
  | "NETWORK_ERROR"
  | "INVALID_CARD"
  | "PROCESSOR_DECLINED";
export type RecoveryStatus = "IDENTIFIED" | "IN_PROGRESS" | "RECOVERED" | "PARTIALLY_RECOVERED" | "FAILED" | "EXPIRED" | "SKIPPED";
export type RecoveryAction =
  | "SMART_RETRY"
  | "PAYMENT_LINK"
  | "EMAIL_REMINDER"
  | "SMS_REMINDER"
  | "SCHEDULED_RETRY"
  | "MANUAL_REVIEW"
  | "ESCALATE"
  | "OFFER_ALTERNATIVE";
export type CampaignType = "SMART_RETRY" | "EMAIL" | "SMS" | "PAYMENT_LINK" | "MIXED";
export type CampaignStatus = "DRAFT" | "ACTIVE" | "PAUSED" | "COMPLETED" | "CANCELLED";
export type InsightType = "TREND" | "ANOMALY" | "RECOMMENDATION" | "PATTERN";
export type InsightSeverity = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";

// ─── AI Engine Types ─────────────────────────────────────

export interface FailureAnalysis {
  primaryCause: FailureReason;
  diagnosis: string;
  details: {
    category: "CUSTOMER" | "TECHNICAL" | "BANK" | "FRAUD";
    severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
    isRecoverable: boolean;
    suggestedActions: string[];
    relatedFactors: string[];
  };
}

export interface RecoveryScore {
  score: number; // 0-100
  confidence: number; // 0-100
  factors: {
    name: string;
    weight: number;
    value: number;
    contribution: number;
    reasoning: string;
  }[];
  riskLevel: "LOW" | "MEDIUM" | "HIGH";
  expectedValue: number;
  priority: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  recommendedChannel: "EMAIL" | "SMS" | "WHATSAPP" | "RETRY";
  recommendedDelay: number; // in minutes
  reasonCodes: string[];
  aiExplanation: string;
}

export interface ActionRecommendation {
  primaryAction: RecoveryAction;
  alternativeActions: RecoveryAction[];
  reasoning: string;
  estimatedSuccessRate: number;
  estimatedRecoverableAmount: number;
  autoExecuteRecommended: boolean;
  prerequisites: string[];
}

export interface TimingRecommendation {
  recommendedTime: Date;
  rationale: string;
  windowStart: Date;
  windowEnd: Date;
  urgency: "IMMEDIATE" | "SOON" | "SCHEDULED" | "LOW_PRIORITY";
  factors: string[];
}

export interface TransactionContext {
  id: string;
  amount: number;
  currency: string;
  status: TransactionStatus;
  paymentMethod: PaymentMethod;
  gateway: string;
  failureReason: FailureReason | null;
  failureMessage: string | null;
  retryCount: number;
  maxRetries: number;
  createdAt: Date;
}

export interface CustomerContext {
  id: string;
  totalTransactions: number;
  successfulPayments: number;
  failedPayments: number;
  totalSpent: number;
  lastPaymentDate: Date | null;
  riskScore: number;
}

// ─── AI Engine Interface ─────────────────────────────────
// This interface defines the contract any AI provider must implement.
// Swap the MockRecoveryAIEngine for an LLM-backed one by implementing this.

export interface IRecoveryAIEngine {
  analyzeFailure(transaction: TransactionContext): Promise<FailureAnalysis>;
  scoreRecoveryProbability(
    transaction: TransactionContext,
    customer: CustomerContext
  ): Promise<RecoveryScore>;
  recommendAction(
    analysis: FailureAnalysis,
    score: RecoveryScore,
    transaction: TransactionContext
  ): Promise<ActionRecommendation>;
  determineOptimalTiming(
    transaction: TransactionContext,
    customer: CustomerContext,
    action: RecoveryAction
  ): Promise<TimingRecommendation>;
}
