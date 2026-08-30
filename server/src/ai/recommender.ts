import {
  FailureAnalysis,
  RecoveryScore,
  ActionRecommendation,
  TransactionContext,
  RecoveryAction,
} from "./types";

/**
 * Recommends the optimal recovery action based on failure analysis and recovery score.
 * Maps the combination of score + failure type to specific, bounded actions.
 */
export function recommendAction(
  analysis: FailureAnalysis,
  score: RecoveryScore,
  transaction: TransactionContext
): ActionRecommendation {
  const { primaryCause, details } = analysis;
  const { score: recoveryScore } = score;

  // Fraud — always escalate, never auto-execute
  if (primaryCause === "FRAUD_SUSPECTED" || details.category === "FRAUD") {
    return {
      primaryAction: "ESCALATE",
      alternativeActions: ["MANUAL_REVIEW"],
      reasoning:
        "Transaction flagged for fraud — must be reviewed by a human before any recovery action. Auto-execution is disabled for safety.",
      estimatedSuccessRate: 0.05,
      estimatedRecoverableAmount: 0,
      autoExecuteRecommended: false,
      prerequisites: [
        "Manual fraud review required",
        "Customer identity verification needed",
      ],
    };
  }

  // Non-recoverable with low score
  if (!details.isRecoverable && recoveryScore < 30) {
    return {
      primaryAction: "MANUAL_REVIEW",
      alternativeActions: ["ESCALATE"],
      reasoning:
        "Low recovery probability with non-recoverable failure category. Manual review recommended to assess options.",
      estimatedSuccessRate: 0.1,
      estimatedRecoverableAmount: transaction.amount * 0.1,
      autoExecuteRecommended: false,
      prerequisites: ["Human review of failure details"],
    };
  }

  // Technical/Network errors with high score → Smart Retry
  if (
    (primaryCause === "TECHNICAL_ERROR" || primaryCause === "NETWORK_ERROR") &&
    recoveryScore >= 70 &&
    transaction.retryCount < transaction.maxRetries
  ) {
    return {
      primaryAction: "SMART_RETRY",
      alternativeActions: ["PAYMENT_LINK", "SCHEDULED_RETRY"],
      reasoning:
        "Technical/network failure with high recovery score and retries available. Smart retry is safe and has the highest success probability.",
      estimatedSuccessRate: 0.85,
      estimatedRecoverableAmount: transaction.amount * 0.85,
      autoExecuteRecommended: true,
      prerequisites: [
        "Verify system/gateway health before retry",
        "Ensure retry window has not expired",
      ],
    };
  }

  // Bank timeout → Smart Retry or Scheduled Retry
  if (primaryCause === "BANK_TIMEOUT") {
    if (recoveryScore >= 60 && transaction.retryCount < transaction.maxRetries) {
      return {
        primaryAction: "SMART_RETRY",
        alternativeActions: ["SCHEDULED_RETRY", "PAYMENT_LINK"],
        reasoning:
          "Bank timeout — likely a transient issue. Smart retry with backoff is recommended.",
        estimatedSuccessRate: 0.7,
        estimatedRecoverableAmount: transaction.amount * 0.7,
        autoExecuteRecommended: true,
        prerequisites: [
          "Check bank service status",
          "Apply exponential backoff",
        ],
      };
    }
    return {
      primaryAction: "SCHEDULED_RETRY",
      alternativeActions: ["PAYMENT_LINK", "EMAIL_REMINDER"],
      reasoning:
        "Bank timeout with moderate recovery probability. Schedule retry during off-peak hours for better success.",
      estimatedSuccessRate: 0.5,
      estimatedRecoverableAmount: transaction.amount * 0.5,
      autoExecuteRecommended: false,
      prerequisites: ["Identify optimal retry time window"],
    };
  }

  // Card expired → Payment link
  if (primaryCause === "CARD_EXPIRED") {
    return {
      primaryAction: "PAYMENT_LINK",
      alternativeActions: ["EMAIL_REMINDER", "SMS_REMINDER"],
      reasoning:
        "Card has expired — customer needs to provide updated payment details. Sending a payment link is the most effective approach.",
      estimatedSuccessRate: recoveryScore >= 60 ? 0.65 : 0.4,
      estimatedRecoverableAmount:
        transaction.amount * (recoveryScore >= 60 ? 0.65 : 0.4),
      autoExecuteRecommended: recoveryScore >= 70,
      prerequisites: [
        "Generate secure payment link",
        "Personalize customer communication",
      ],
    };
  }

  // Authentication failed → Payment link with alternative methods
  if (primaryCause === "AUTHENTICATION_FAILED") {
    return {
      primaryAction: "PAYMENT_LINK",
      alternativeActions: ["SMS_REMINDER", "OFFER_ALTERNATIVE"],
      reasoning:
        "Authentication flow failed — customer may have abandoned 3DS/OTP. A fresh payment link with simplified checkout is recommended.",
      estimatedSuccessRate: 0.55,
      estimatedRecoverableAmount: transaction.amount * 0.55,
      autoExecuteRecommended: recoveryScore >= 75,
      prerequisites: [
        "Generate simplified checkout link",
        "Offer multiple payment methods",
      ],
    };
  }

  // Insufficient funds → Scheduled retry (payday timing)
  if (primaryCause === "INSUFFICIENT_FUNDS") {
    return {
      primaryAction: "SCHEDULED_RETRY",
      alternativeActions: ["PAYMENT_LINK", "OFFER_ALTERNATIVE", "EMAIL_REMINDER"],
      reasoning:
        "Insufficient funds — schedule retry around customer's payday cycle (1st or 15th of month) for best results.",
      estimatedSuccessRate: recoveryScore >= 50 ? 0.55 : 0.3,
      estimatedRecoverableAmount:
        transaction.amount * (recoveryScore >= 50 ? 0.55 : 0.3),
      autoExecuteRecommended: false,
      prerequisites: [
        "Identify customer payday pattern",
        "Set appropriate retry timing",
      ],
    };
  }

  // Limit exceeded → Offer alternative
  if (primaryCause === "LIMIT_EXCEEDED") {
    return {
      primaryAction: "OFFER_ALTERNATIVE",
      alternativeActions: ["PAYMENT_LINK", "SCHEDULED_RETRY"],
      reasoning:
        "Transaction exceeds payment limit. Offer split payments, EMI options, or alternative higher-limit payment methods.",
      estimatedSuccessRate: 0.45,
      estimatedRecoverableAmount: transaction.amount * 0.45,
      autoExecuteRecommended: false,
      prerequisites: [
        "Prepare alternative payment options",
        "Calculate EMI breakdown if applicable",
      ],
    };
  }

  // Default fallback — high score gets payment link, low gets manual review
  if (recoveryScore >= 50) {
    return {
      primaryAction: "PAYMENT_LINK",
      alternativeActions: ["EMAIL_REMINDER", "SMS_REMINDER"],
      reasoning:
        "Moderate-to-high recovery probability. Sending a payment link gives the customer a direct, low-friction path to complete payment.",
      estimatedSuccessRate: 0.5,
      estimatedRecoverableAmount: transaction.amount * 0.5,
      autoExecuteRecommended: false,
      prerequisites: ["Generate payment link", "Compose notification"],
    };
  }

  return {
    primaryAction: "MANUAL_REVIEW",
    alternativeActions: ["EMAIL_REMINDER", "ESCALATE"],
    reasoning:
      "Low recovery probability. Manual review by the operations team is recommended before taking action.",
    estimatedSuccessRate: 0.15,
    estimatedRecoverableAmount: transaction.amount * 0.15,
    autoExecuteRecommended: false,
    prerequisites: ["Assign to recovery specialist"],
  };
}
