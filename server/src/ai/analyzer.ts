import { TransactionContext, FailureAnalysis, FailureReason } from "./types";

/**
 * Analyzes why a transaction failed and produces a detailed diagnosis.
 * This is the mock/deterministic implementation — replace with LLM calls for production.
 */
export function analyzeFailure(transaction: TransactionContext): FailureAnalysis {
  const reason = transaction.failureReason || inferFailureReason(transaction);

  const diagnosisMap: Record<FailureReason, FailureAnalysis> = {
    INSUFFICIENT_FUNDS: {
      primaryCause: "INSUFFICIENT_FUNDS",
      diagnosis: "The customer's account did not have sufficient balance to complete this transaction.",
      details: {
        category: "CUSTOMER",
        severity: "MEDIUM",
        isRecoverable: true,
        suggestedActions: [
          "Wait for customer's payday cycle and retry",
          "Send payment link with flexible payment options",
          "Offer EMI or split payment alternative",
        ],
        relatedFactors: [
          "Transaction amount relative to typical spending pattern",
          "Time of month (pre/post payday)",
          "Customer's historical payment reliability",
        ],
      },
    },
    CARD_EXPIRED: {
      primaryCause: "CARD_EXPIRED",
      diagnosis: "The payment card used has expired and needs to be updated with a new card.",
      details: {
        category: "CUSTOMER",
        severity: "LOW",
        isRecoverable: true,
        suggestedActions: [
          "Send payment link requesting updated card details",
          "Email customer with card update reminder",
          "Offer alternative payment methods",
        ],
        relatedFactors: [
          "Card expiry date",
          "Customer has other saved payment methods",
          "Likelihood of card renewal by bank",
        ],
      },
    },
    BANK_TIMEOUT: {
      primaryCause: "BANK_TIMEOUT",
      diagnosis: "The issuing bank did not respond within the expected timeframe, causing the transaction to timeout.",
      details: {
        category: "BANK",
        severity: "MEDIUM",
        isRecoverable: true,
        suggestedActions: [
          "Retry immediately via smart retry",
          "Route through alternative payment gateway",
          "Schedule retry during off-peak banking hours",
        ],
        relatedFactors: [
          "Bank's current service status",
          "Network congestion patterns",
          "Time of day and banking load",
        ],
      },
    },
    FRAUD_SUSPECTED: {
      primaryCause: "FRAUD_SUSPECTED",
      diagnosis: "The transaction was flagged as potentially fraudulent by the risk engine or issuing bank.",
      details: {
        category: "FRAUD",
        severity: "CRITICAL",
        isRecoverable: false,
        suggestedActions: [
          "Escalate to manual review team",
          "Request additional verification from customer",
          "Do NOT auto-retry — requires human review",
        ],
        relatedFactors: [
          "Transaction velocity anomalies",
          "Unusual location or device",
          "Amount significantly higher than average",
        ],
      },
    },
    TECHNICAL_ERROR: {
      primaryCause: "TECHNICAL_ERROR",
      diagnosis: "A technical error occurred in the payment processing pipeline.",
      details: {
        category: "TECHNICAL",
        severity: "LOW",
        isRecoverable: true,
        suggestedActions: [
          "Auto-retry immediately",
          "Switch to backup payment gateway",
          "Verify system health before retry",
        ],
        relatedFactors: [
          "Gateway uptime status",
          "Recent system deployment changes",
          "API version compatibility",
        ],
      },
    },
    AUTHENTICATION_FAILED: {
      primaryCause: "AUTHENTICATION_FAILED",
      diagnosis: "3D Secure or OTP authentication failed — customer may have entered incorrect credentials or abandoned the auth flow.",
      details: {
        category: "CUSTOMER",
        severity: "MEDIUM",
        isRecoverable: true,
        suggestedActions: [
          "Send payment link for customer to re-attempt",
          "Offer alternative payment method (UPI, wallet)",
          "SMS reminder with simplified checkout link",
        ],
        relatedFactors: [
          "Authentication method used",
          "Customer's device type",
          "Historical authentication success rate",
        ],
      },
    },
    LIMIT_EXCEEDED: {
      primaryCause: "LIMIT_EXCEEDED",
      diagnosis: "The transaction amount exceeds the customer's daily/monthly transaction limit.",
      details: {
        category: "CUSTOMER",
        severity: "MEDIUM",
        isRecoverable: true,
        suggestedActions: [
          "Schedule retry at start of next billing cycle",
          "Suggest splitting into smaller transactions",
          "Offer EMI payment option",
        ],
        relatedFactors: [
          "Customer's card/account limits",
          "Amount relative to daily limit",
          "Time until limit resets",
        ],
      },
    },
    NETWORK_ERROR: {
      primaryCause: "NETWORK_ERROR",
      diagnosis: "A network connectivity issue prevented the transaction from completing.",
      details: {
        category: "TECHNICAL",
        severity: "LOW",
        isRecoverable: true,
        suggestedActions: [
          "Auto-retry immediately",
          "Use alternative network path",
          "Verify connectivity before retry",
        ],
        relatedFactors: [
          "Regional network status",
          "CDN/proxy health",
          "ISP-level issues",
        ],
      },
    },
    INVALID_CARD: {
      primaryCause: "INVALID_CARD",
      diagnosis: "The card number provided is invalid or the card has been cancelled/blocked.",
      details: {
        category: "CUSTOMER",
        severity: "HIGH",
        isRecoverable: true,
        suggestedActions: [
          "Send payment link requesting valid card",
          "Offer alternative payment methods",
          "Contact customer for card verification",
        ],
        relatedFactors: [
          "Card validation check results",
          "Whether card was recently replaced",
          "Customer's other saved payment methods",
        ],
      },
    },
    PROCESSOR_DECLINED: {
      primaryCause: "PROCESSOR_DECLINED",
      diagnosis: "The payment processor declined the transaction. This could be due to various bank-side policies.",
      details: {
        category: "BANK",
        severity: "MEDIUM",
        isRecoverable: true,
        suggestedActions: [
          "Retry with different processor/gateway",
          "Send payment link with alternative methods",
          "Schedule retry after 24-48 hours",
        ],
        relatedFactors: [
          "Processor decline code",
          "Specific bank policies",
          "Transaction risk scoring by processor",
        ],
      },
    },
  };

  return diagnosisMap[reason];
}

function inferFailureReason(transaction: TransactionContext): FailureReason {
  // Simple heuristic-based inference when no explicit reason is given
  if (transaction.retryCount >= transaction.maxRetries) return "BANK_TIMEOUT";
  if (transaction.paymentMethod === "CREDIT_CARD" || transaction.paymentMethod === "DEBIT_CARD") {
    return "TECHNICAL_ERROR";
  }
  return "NETWORK_ERROR";
}
