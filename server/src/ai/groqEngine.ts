import { callGroq, isGroqAvailable } from "./groqClient";
import { analyzeFailure as mockAnalyzeFailure } from "./analyzer";
import { scoreRecoveryProbability as mockScoreRecovery } from "./scorer";
import { recommendAction as mockRecommendAction } from "./recommender";
import { determineOptimalTiming } from "./scheduler";
import {
  IRecoveryAIEngine,
  TransactionContext,
  CustomerContext,
  FailureAnalysis,
  RecoveryScore,
  ActionRecommendation,
  TimingRecommendation,
  RecoveryAction,
  FailureReason,
} from "./types";

const VALID_FAILURE_REASONS: FailureReason[] = [
  "INSUFFICIENT_FUNDS", "CARD_EXPIRED", "BANK_TIMEOUT", "FRAUD_SUSPECTED",
  "TECHNICAL_ERROR", "AUTHENTICATION_FAILED", "LIMIT_EXCEEDED", "NETWORK_ERROR",
  "INVALID_CARD", "PROCESSOR_DECLINED",
];

const VALID_RECOVERY_ACTIONS: RecoveryAction[] = [
  "SMART_RETRY", "PAYMENT_LINK", "EMAIL_REMINDER", "SMS_REMINDER",
  "SCHEDULED_RETRY", "MANUAL_REVIEW", "ESCALATE", "OFFER_ALTERNATIVE",
];

const VALID_CATEGORIES = ["CUSTOMER", "TECHNICAL", "BANK", "FRAUD"] as const;
const VALID_SEVERITIES = ["LOW", "MEDIUM", "HIGH", "CRITICAL"] as const;

/**
 * GroqRecoveryAIEngine — Real LLM-powered AI engine for revenue recovery.
 *
 * Implements IRecoveryAIEngine using Groq API calls with structured JSON output.
 * Falls back to the deterministic mock engine for any individual method that fails.
 *
 * Design principles:
 * - Groq provides reasoning and diagnosis — backend enforces policy
 * - Every Groq call has a try/catch with mock fallback
 * - All Groq responses are validated against known enums
 * - The scheduler remains deterministic (timing = policy, not AI)
 */
export class GroqRecoveryAIEngine implements IRecoveryAIEngine {

  async analyzeFailure(transaction: TransactionContext): Promise<FailureAnalysis> {
    console.log(`[AI] analyzeFailure started`);
    try {
      const systemPrompt = `You are an expert payment failure analyst for an Indian payment recovery platform. You diagnose why payment transactions fail and assess recoverability.

You MUST respond with a valid JSON object matching this exact structure:
{
  "primaryCause": "<one of: INSUFFICIENT_FUNDS, CARD_EXPIRED, BANK_TIMEOUT, FRAUD_SUSPECTED, TECHNICAL_ERROR, AUTHENTICATION_FAILED, LIMIT_EXCEEDED, NETWORK_ERROR, INVALID_CARD, PROCESSOR_DECLINED>",
  "diagnosis": "<2-3 sentence expert diagnosis of what went wrong and why>",
  "details": {
    "category": "<one of: CUSTOMER, TECHNICAL, BANK, FRAUD>",
    "severity": "<one of: LOW, MEDIUM, HIGH, CRITICAL>",
    "isRecoverable": <true or false>,
    "suggestedActions": ["<action 1>", "<action 2>", "<action 3>"],
    "relatedFactors": ["<factor 1>", "<factor 2>", "<factor 3>"]
  }
}

Rules:
- primaryCause MUST be one of the exact enum values listed above
- category MUST be one of: CUSTOMER, TECHNICAL, BANK, FRAUD
- severity MUST be one of: LOW, MEDIUM, HIGH, CRITICAL
- FRAUD_SUSPECTED is always category=FRAUD, severity=CRITICAL, isRecoverable=false
- Provide specific, actionable suggestedActions relevant to the Indian payment ecosystem
- Consider Indian payment gateways (Razorpay, PayU, Cashfree), UPI, net banking`;

      const userPrompt = `Analyze this failed payment transaction:

Transaction ID: ${transaction.id}
Amount: ₹${transaction.amount.toLocaleString("en-IN")}
Currency: ${transaction.currency}
Status: ${transaction.status}
Payment Method: ${transaction.paymentMethod}
Gateway: ${transaction.gateway}
Failure Reason: ${transaction.failureReason || "Not specified"}
Failure Message: ${transaction.failureMessage || "Not specified"}
Retry Count: ${transaction.retryCount} of ${transaction.maxRetries} max
Transaction Time: ${transaction.createdAt.toISOString()}
Hours Since Failure: ${Math.round((Date.now() - transaction.createdAt.getTime()) / (1000 * 60 * 60))}

Provide your expert diagnosis as structured JSON.`;

      const raw = await callGroq<any>({ systemPrompt, userPrompt });

      // Validate and sanitize the response
      const analysis: FailureAnalysis = {
        primaryCause: VALID_FAILURE_REASONS.includes(raw.primaryCause)
          ? raw.primaryCause
          : (transaction.failureReason || "TECHNICAL_ERROR"),
        diagnosis: typeof raw.diagnosis === "string" && raw.diagnosis.length > 0
          ? raw.diagnosis
          : "AI analysis completed.",
        details: {
          category: VALID_CATEGORIES.includes(raw.details?.category)
            ? raw.details.category
            : "TECHNICAL",
          severity: VALID_SEVERITIES.includes(raw.details?.severity)
            ? raw.details.severity
            : "MEDIUM",
          isRecoverable: typeof raw.details?.isRecoverable === "boolean"
            ? raw.details.isRecoverable
            : raw.primaryCause !== "FRAUD_SUSPECTED",
          suggestedActions: Array.isArray(raw.details?.suggestedActions)
            ? raw.details.suggestedActions.slice(0, 5).map(String)
            : ["Review transaction details"],
          relatedFactors: Array.isArray(raw.details?.relatedFactors)
            ? raw.details.relatedFactors.slice(0, 5).map(String)
            : [],
        },
      };

      console.log(`[AI] analyzeFailure completed`);
      return analysis;
    } catch (err) {
      console.warn("⚠️ Groq analyzeFailure failed, using deterministic fallback:", (err as Error).message);
      return mockAnalyzeFailure(transaction);
    }
  }

  async scoreRecoveryProbability(
    transaction: TransactionContext,
    customer: CustomerContext
  ): Promise<RecoveryScore> {
    console.log(`[AI] scoreRecoveryProbability started`);
    // Always compute the deterministic base score — this is the source of truth for weighted factors
    const baseScore = mockScoreRecovery(transaction, customer);

    try {
      const systemPrompt = `You are an AI recovery scoring assistant for an Indian payment platform. You receive a deterministic recovery score computed by the system and must enhance it with reasoning.

You MUST respond with valid JSON matching this structure:
{
  "adjustedConfidence": <number 0-100, your confidence in recovery success>,
  "aiExplanation": "<2-3 sentence explanation of why this transaction is or isn't recoverable, specific to the context>",
  "additionalReasonCodes": ["<reason_code_1>", "<reason_code_2>"],
  "priorityRecommendation": "<one of: CRITICAL, HIGH, MEDIUM, LOW>",
  "recommendedChannel": "<one of: EMAIL, SMS, WHATSAPP, RETRY>",
  "reasoning": "<brief internal reasoning about the score adjustment>"
}

Rules:
- You are ENHANCING an existing deterministic score, not replacing it
- adjustedConfidence reflects your confidence in the base score's accuracy
- If the base score seems correct, keep adjustedConfidence close to the system confidence
- additionalReasonCodes should be short SCREAMING_SNAKE_CASE codes
- Consider the customer's payment history, failure type, transaction amount, and time factors
- Be specific about Indian payment ecosystem factors (UPI, Razorpay, bank patterns)`;

      const successRate = customer.totalTransactions > 0
        ? (customer.successfulPayments / customer.totalTransactions * 100).toFixed(1)
        : "unknown";

      const hoursSinceFailure = Math.round(
        (Date.now() - transaction.createdAt.getTime()) / (1000 * 60 * 60)
      );

      const userPrompt = `Enhance this recovery score with AI reasoning:

SYSTEM SCORE:
- Recovery Score: ${baseScore.score}/100
- System Confidence: ${baseScore.confidence}%
- Risk Level: ${baseScore.riskLevel}
- Priority: ${baseScore.priority}
- Recommended Channel: ${baseScore.recommendedChannel}

TRANSACTION CONTEXT:
- Amount: ₹${transaction.amount.toLocaleString("en-IN")}
- Payment Method: ${transaction.paymentMethod}
- Gateway: ${transaction.gateway}
- Failure Reason: ${transaction.failureReason || "Unknown"}
- Retry Count: ${transaction.retryCount}/${transaction.maxRetries}
- Hours Since Failure: ${hoursSinceFailure}

CUSTOMER CONTEXT:
- Total Transactions: ${customer.totalTransactions}
- Success Rate: ${successRate}%
- Failed Payments: ${customer.failedPayments}
- Total Spent: ₹${customer.totalSpent.toLocaleString("en-IN")}
- Risk Score: ${customer.riskScore.toFixed(1)}
- Days Since Last Payment: ${customer.lastPaymentDate ? Math.round((Date.now() - new Date(customer.lastPaymentDate).getTime()) / (1000 * 60 * 60 * 24)) : "unknown"}

SCORING FACTORS:
${baseScore.factors.map(f => `- ${f.name}: ${f.value}/100 (weight: ${f.weight}, contribution: ${f.contribution.toFixed(1)}) — ${f.reasoning}`).join("\n")}

Provide your enhanced assessment as structured JSON.`;

      const raw = await callGroq<any>({ systemPrompt, userPrompt });

      // Merge Groq reasoning into the deterministic score
      // The base score stays — Groq enhances confidence and explanation
      const scoreResult = {
        ...baseScore,
        confidence: typeof raw.adjustedConfidence === "number"
          ? Math.max(0, Math.min(100, Math.round(raw.adjustedConfidence)))
          : baseScore.confidence,
        aiExplanation: typeof raw.aiExplanation === "string" && raw.aiExplanation.length > 0
          ? raw.aiExplanation
          : baseScore.aiExplanation,
        priority: VALID_SEVERITIES.includes(raw.priorityRecommendation)
          ? raw.priorityRecommendation as RecoveryScore["priority"]
          : baseScore.priority,
        recommendedChannel: (["EMAIL", "SMS", "WHATSAPP", "RETRY"] as const).includes(raw.recommendedChannel)
          ? raw.recommendedChannel as RecoveryScore["recommendedChannel"]
          : baseScore.recommendedChannel,
        reasonCodes: [
          ...baseScore.reasonCodes,
          ...(Array.isArray(raw.additionalReasonCodes)
            ? raw.additionalReasonCodes.slice(0, 3).map(String)
            : []),
        ],
      };
      console.log(`[AI] scoreRecoveryProbability completed`);
      return scoreResult;
    } catch (err) {
      console.warn("⚠️ Groq scoreRecoveryProbability failed, using deterministic score:", (err as Error).message);
      return baseScore;
    }
  }

  async recommendAction(
    analysis: FailureAnalysis,
    score: RecoveryScore,
    transaction: TransactionContext
  ): Promise<ActionRecommendation> {
    console.log(`[AI] recommendAction started`);
    try {
      const systemPrompt = `You are an AI recovery action recommender for an Indian payment platform. You decide the best recovery intervention for a failed payment.

You MUST respond with valid JSON matching this structure:
{
  "primaryAction": "<one of: SMART_RETRY, PAYMENT_LINK, EMAIL_REMINDER, SMS_REMINDER, SCHEDULED_RETRY, MANUAL_REVIEW, ESCALATE, OFFER_ALTERNATIVE>",
  "alternativeActions": ["<action_1>", "<action_2>"],
  "reasoning": "<2-3 sentence explanation of WHY you chose this action>",
  "estimatedSuccessRate": <number 0.0 to 1.0>,
  "estimatedRecoverableAmount": <number in INR>,
  "autoExecuteRecommended": <true or false>,
  "prerequisites": ["<prerequisite_1>", "<prerequisite_2>"]
}

CRITICAL RULES:
- primaryAction and alternativeActions MUST be from the exact enum values listed above
- FRAUD_SUSPECTED failures MUST use ESCALATE — never auto-retry fraud
- autoExecuteRecommended should be false for: FRAUD, high-value (>₹25,000), low confidence, manual review needed
- estimatedSuccessRate should be realistic (not always high)
- SMART_RETRY is only valid if retries remain (retryCount < maxRetries)
- Consider the Indian payment ecosystem (UPI, Razorpay, net banking patterns)
- Provide specific, actionable prerequisites`;

      const userPrompt = `Recommend the best recovery action:

FAILURE ANALYSIS:
- Root Cause: ${analysis.primaryCause}
- Category: ${analysis.details.category}
- Severity: ${analysis.details.severity}
- Is Recoverable: ${analysis.details.isRecoverable}
- Diagnosis: ${analysis.diagnosis}

RECOVERY SCORE:
- Score: ${score.score}/100
- Confidence: ${score.confidence}%
- Priority: ${score.priority}
- Risk Level: ${score.riskLevel}
- Expected Value: ₹${score.expectedValue.toLocaleString("en-IN")}

TRANSACTION:
- Amount: ₹${transaction.amount.toLocaleString("en-IN")}
- Payment Method: ${transaction.paymentMethod}
- Gateway: ${transaction.gateway}
- Failure Reason: ${transaction.failureReason || "Unknown"}
- Retry Count: ${transaction.retryCount}/${transaction.maxRetries}
- Retries Available: ${transaction.maxRetries - transaction.retryCount}

What recovery action should we take? Respond with structured JSON.`;

      const raw = await callGroq<any>({ systemPrompt, userPrompt });

      // Validate primaryAction against known enum
      const primaryAction = VALID_RECOVERY_ACTIONS.includes(raw.primaryAction)
        ? raw.primaryAction as RecoveryAction
        : null;

      if (!primaryAction) {
        console.warn(`⚠️ Groq returned invalid action: ${raw.primaryAction}, falling back to mock`);
        return mockRecommendAction(analysis, score, transaction);
      }

      // Validate alternative actions
      const alternativeActions = Array.isArray(raw.alternativeActions)
        ? raw.alternativeActions
            .filter((a: string) => VALID_RECOVERY_ACTIONS.includes(a as RecoveryAction))
            .slice(0, 3) as RecoveryAction[]
        : [];

      const recommendation: ActionRecommendation = {
        primaryAction,
        alternativeActions,
        reasoning: typeof raw.reasoning === "string" && raw.reasoning.length > 0
          ? raw.reasoning
          : "AI recommendation based on transaction analysis.",
        estimatedSuccessRate: typeof raw.estimatedSuccessRate === "number"
          ? Math.max(0, Math.min(1, raw.estimatedSuccessRate))
          : 0.5,
        estimatedRecoverableAmount: typeof raw.estimatedRecoverableAmount === "number"
          ? Math.max(0, raw.estimatedRecoverableAmount)
          : transaction.amount * 0.5,
        autoExecuteRecommended: typeof raw.autoExecuteRecommended === "boolean"
          ? raw.autoExecuteRecommended
          : false,
        prerequisites: Array.isArray(raw.prerequisites)
          ? raw.prerequisites.slice(0, 5).map(String)
          : [],
      };

      // Safety override: Never auto-execute for fraud
      if (analysis.primaryCause === "FRAUD_SUSPECTED") {
        recommendation.primaryAction = "ESCALATE";
        recommendation.autoExecuteRecommended = false;
      }

      console.log(`[AI] recommendAction completed`);
      return recommendation;
    } catch (err) {
      console.warn("⚠️ Groq recommendAction failed, using deterministic fallback:", (err as Error).message);
      return mockRecommendAction(analysis, score, transaction);
    }
  }

  /**
   * Timing remains deterministic — it's policy, not AI.
   * Uses the existing scheduler.ts directly.
   */
  async determineOptimalTiming(
    transaction: TransactionContext,
    customer: CustomerContext,
    action: RecoveryAction
  ): Promise<TimingRecommendation> {
    return determineOptimalTiming(transaction, customer, action);
  }
}
