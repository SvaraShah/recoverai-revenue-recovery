// ─── Enums ───────────────────────────────────────────────

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
export type RecoveryStatus =
  | "IDENTIFIED"
  | "ELIGIBLE"
  | "RECOMMENDED"
  | "PENDING_APPROVAL"
  | "EXECUTING"
  | "RECOVERED"
  | "PARTIALLY_RECOVERED"
  | "FAILED"
  | "ESCALATED"
  | "STOPPED"
  | "DISMISSED"
  | "EXPIRED"
  | "SKIPPED";
export type RecoveryAction = "SMART_RETRY" | "PAYMENT_LINK" | "EMAIL_REMINDER" | "SMS_REMINDER" | "SCHEDULED_RETRY" | "MANUAL_REVIEW" | "ESCALATE" | "OFFER_ALTERNATIVE";
export type CampaignType = "SMART_RETRY" | "EMAIL" | "SMS" | "PAYMENT_LINK" | "MIXED";
export type CampaignStatus = "DRAFT" | "ACTIVE" | "PAUSED" | "COMPLETED" | "CANCELLED";
export type InsightType = "TREND" | "ANOMALY" | "RECOMMENDATION" | "PATTERN";
export type InsightSeverity = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";

// ─── Models ──────────────────────────────────────────────

export interface Merchant {
  id: string;
  name: string;
  email: string;
  industry: string;
  monthlyVolume: number;
  currency: string;
  timezone: string;
  createdAt: string;
}

export interface Customer {
  id: string;
  email: string;
  name: string;
  phone?: string;
  totalTransactions: number;
  successfulPayments: number;
  failedPayments: number;
  totalSpent: number;
  lastPaymentDate?: string;
  riskScore: number;
}

export interface Transaction {
  id: string;
  externalId: string;
  amount: number;
  currency: string;
  status: TransactionStatus;
  paymentMethod: PaymentMethod;
  gateway: string;
  failureReason?: FailureReason;
  failureMessage?: string;
  cardLast4?: string;
  bankName?: string;
  deviceType?: string;
  retryCount: number;
  customerId: string;
  customer?: Customer;
  merchantId: string;
  recoveryOpportunity?: RecoveryOpportunity;
  createdAt: string;
}

export interface RecoveryOpportunity {
  id: string;
  transactionId: string;
  transaction?: Transaction;
  recoveryScore: number;
  estimatedRecoverableAmount: number;
  expectedValue?: number;
  priority?: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  recommendedAction: RecoveryAction;
  recommendedChannel?: "EMAIL" | "SMS" | "WHATSAPP" | "RETRY";
  recommendedDelay?: number;
  reasonCodes?: string; // stringified JSON array
  aiExplanation?: string;
  failureDiagnosis: string;
  diagnosisDetails?: Record<string, unknown>;
  recommendedTiming: string;
  timingRationale?: string;
  status: RecoveryStatus;
  aiConfidence: number;
  autoExecute: boolean;
  executedAt?: string;
  recoveredAmount?: number;
  attemptCount: number;
  lastAttemptAt?: string;
  expiresAt: string;
  createdAt: string;
}

export interface RecoveryCampaign {
  id: string;
  name: string;
  description?: string;
  type: CampaignType;
  status: CampaignStatus;
  targetCount: number;
  recoveredCount: number;
  recoveredAmount: number;
  totalAtRisk: number;
  startDate?: string;
  endDate?: string;
  opportunities?: CampaignOpportunity[];
  createdAt: string;
}

export interface CampaignOpportunity {
  id: string;
  campaignId: string;
  opportunityId: string;
  opportunity?: RecoveryOpportunity;
  status: RecoveryStatus;
  executedAt?: string;
  result?: Record<string, unknown>;
}

export interface AuditLog {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  details?: Record<string, unknown>;
  outcome?: string;
  timestamp: string;
}

export interface AIInsight {
  id: string;
  type: InsightType;
  severity: InsightSeverity;
  title: string;
  description: string;
  data?: Record<string, unknown>;
  actionable: boolean;
  actionUrl?: string;
  dismissed: boolean;
  createdAt: string;
}

// ─── API Response Types ──────────────────────────────────

export interface DashboardOverview {
  totalRevenueAtRisk: number;
  totalRecovered: number;
  recoveryRate: number;
  activeOpportunities: number;
  totalTransactions: number;
  failedTransactions: number;
  activeCampaigns: number;
  avgRecoveryScore: number;
  revenueAtRiskChange: number;
  recoveredChange: number;
  recoveryRateChange: number;
  opportunitiesChange: number;
}

export interface TrendDataPoint {
  date: string;
  atRisk: number;
  recovered: number;
  recoveryRate: number;
}

export interface FailureBreakdown {
  reason: string;
  count: number;
  amount: number;
  percentage: number;
}

export interface RecentActivity {
  id: string;
  type: string;
  description: string;
  amount?: number;
  status: string;
  timestamp: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface AnalyticsData {
  revenueOverTime: TrendDataPoint[];
  recoveryByMethod: { method: string; count: number; amount: number; rate: number }[];
  failureDistribution: FailureBreakdown[];
  recoveryByAction: { action: string; count: number; amount: number; successRate: number }[];
  topCustomers: { customer: Customer; recoverableAmount: number; recoveryScore: number }[];
}

export interface GuardrailBreakdownItem {
  rule: string;
  count: number;
}

export interface BatchRunSummary {
  totalTransactionsProcessed: number;
  totalAtRiskAmount: number;
  totalRecoveredAmount: number;
  recoveryRatePercent: number;
  stoppedByGuardrail: GuardrailBreakdownItem[];
  escalatedToApproval: number;
  executionTimeMs: number;
}

export interface BatchRunResult {
  id: string;
  totalTransactions: number;
  eligibleTransactions: number;
  attemptedRecoveries: number;
  successfulRecoveries: number;
  failedRecoveries: number;
  stoppedRecoveries: number;
  escalatedRecoveries: number;
  totalRevenueAtRisk: number;
  totalExpectedRecovery: number;
  totalRecoveredRevenue: number;
  recoveryRate: number;
  guardrailsEnabled: boolean;
  approvalRequired: boolean;
  summary?: BatchRunSummary;
}
