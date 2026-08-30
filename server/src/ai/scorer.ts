import { TransactionContext, CustomerContext, RecoveryScore } from "./types";

/**
 * Scores the probability of successfully recovering revenue from a failed transaction.
 * Uses a weighted multi-factor model and computes rich explainable metadata.
 */
export function scoreRecoveryProbability(
  transaction: TransactionContext,
  customer: CustomerContext
): RecoveryScore {
  const factors: RecoveryScore["factors"] = [];

  // Factor 1: Customer Payment History (weight: 25%)
  const successRate =
    customer.totalTransactions > 0
      ? customer.successfulPayments / customer.totalTransactions
      : 0.5;
  const historyScore = Math.min(successRate * 100, 100);
  factors.push({
    name: "Customer Payment History",
    weight: 0.25,
    value: historyScore,
    contribution: historyScore * 0.25,
    reasoning:
      successRate >= 0.8
        ? "Customer has a strong payment track record"
        : successRate >= 0.5
        ? "Customer has a moderate payment history"
        : "Customer has a poor payment history — higher risk",
  });

  // Factor 2: Failure Reason Recoverability (weight: 30%)
  const recoverabilityMap: Record<string, number> = {
    TECHNICAL_ERROR: 95,
    NETWORK_ERROR: 92,
    BANK_TIMEOUT: 80,
    AUTHENTICATION_FAILED: 70,
    CARD_EXPIRED: 65,
    INSUFFICIENT_FUNDS: 55,
    LIMIT_EXCEEDED: 50,
    PROCESSOR_DECLINED: 45,
    INVALID_CARD: 35,
    FRAUD_SUSPECTED: 5,
  };
  const recoverability = transaction.failureReason
    ? recoverabilityMap[transaction.failureReason] || 40
    : 40;
  factors.push({
    name: "Failure Reason Recoverability",
    weight: 0.3,
    value: recoverability,
    contribution: recoverability * 0.3,
    reasoning: `${transaction.failureReason || "Unknown"} failures have a ${recoverability}% base recoverability rate`,
  });

  // Factor 3: Transaction Amount (weight: 15%)
  // Smaller amounts are easier to recover
  let amountScore: number;
  if (transaction.amount <= 500) amountScore = 90;
  else if (transaction.amount <= 2000) amountScore = 80;
  else if (transaction.amount <= 10000) amountScore = 65;
  else if (transaction.amount <= 25000) amountScore = 45;
  else amountScore = 25; // High amounts have lower auto-recovery rates
  factors.push({
    name: "Transaction Amount",
    weight: 0.15,
    value: amountScore,
    contribution: amountScore * 0.15,
    reasoning:
      transaction.amount <= 2000
        ? "Small transaction amount — easier to recover"
        : transaction.amount <= 10000
        ? "Moderate amount — reasonable recovery chances"
        : "High-value transaction — requires extra validation",
  });

  // Factor 4: Time Since Failure (weight: 15%)
  const hoursSinceFailure =
    (Date.now() - transaction.createdAt.getTime()) / (1000 * 60 * 60);
  let freshnessScore: number;
  if (hoursSinceFailure <= 1) freshnessScore = 95;
  else if (hoursSinceFailure <= 6) freshnessScore = 85;
  else if (hoursSinceFailure <= 24) freshnessScore = 70;
  else if (hoursSinceFailure <= 72) freshnessScore = 50;
  else if (hoursSinceFailure <= 168) freshnessScore = 30;
  else freshnessScore = 15;
  factors.push({
    name: "Time Since Failure",
    weight: 0.15,
    value: freshnessScore,
    contribution: freshnessScore * 0.15,
    reasoning:
      hoursSinceFailure <= 6
        ? "Very recent failure — high urgency window"
        : hoursSinceFailure <= 24
        ? "Failed within last day — still a good window"
        : `${Math.floor(hoursSinceFailure / 24)} days since failure — recovery window narrowing`,
  });

  // Factor 5: Retry Count (weight: 10%)
  const maxRetries = transaction.maxRetries || 3;
  const retriesRemaining = maxRetries - transaction.retryCount;
  const retryScore =
    retriesRemaining > 0 ? (retriesRemaining / maxRetries) * 100 : 10;
  factors.push({
    name: "Retry Attempts Remaining",
    weight: 0.1,
    value: retryScore,
    contribution: retryScore * 0.1,
    reasoning:
      retriesRemaining > 0
        ? `${retriesRemaining} retry attempts remaining out of ${maxRetries}`
        : "All retry attempts exhausted — requires alternative approach",
  });

  // Factor 6: Customer Engagement (weight: 5%)
  const daysSinceLastPayment = customer.lastPaymentDate
    ? (Date.now() - new Date(customer.lastPaymentDate).getTime()) / (1000 * 60 * 60 * 24)
    : 365;
  const engagementScore =
    daysSinceLastPayment <= 7
      ? 90
      : daysSinceLastPayment <= 30
      ? 70
      : daysSinceLastPayment <= 90
      ? 50
      : 20;
  factors.push({
    name: "Customer Engagement",
    weight: 0.05,
    value: engagementScore,
    contribution: engagementScore * 0.05,
    reasoning:
      daysSinceLastPayment <= 30
        ? "Active customer — recently transacted"
        : "Inactive customer — may need re-engagement",
  });

  // Calculate total score
  const totalScore = Math.max(0, Math.min(100, Math.round(
    factors.reduce((sum, f) => sum + f.contribution, 0)
  )));

  // Calculate confidence based on data completeness (0-100)
  let confidenceVal = 60; // base
  if (customer.totalTransactions > 10) confidenceVal += 15;
  if (customer.totalTransactions > 50) confidenceVal += 10;
  if (transaction.failureReason) confidenceVal += 10;
  if (customer.lastPaymentDate) confidenceVal += 5;
  const confidence = Math.min(confidenceVal, 98);

  // Expected value
  const expectedValue = Math.round(transaction.amount * (totalScore / 100));

  // Priority
  let priority: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" = "MEDIUM";
  if (transaction.amount > 25000 && totalScore >= 50) {
    priority = "CRITICAL";
  } else if (transaction.amount > 10000 || totalScore >= 80) {
    priority = "HIGH";
  } else if (transaction.amount < 1500 && totalScore < 40) {
    priority = "LOW";
  }

  // Recommended Channel
  let recommendedChannel: "EMAIL" | "SMS" | "WHATSAPP" | "RETRY" = "EMAIL";
  if (
    transaction.failureReason === "TECHNICAL_ERROR" ||
    transaction.failureReason === "NETWORK_ERROR" ||
    transaction.failureReason === "BANK_TIMEOUT"
  ) {
    recommendedChannel = "RETRY";
  } else if (transaction.paymentMethod === "UPI") {
    recommendedChannel = "WHATSAPP";
  } else if (transaction.paymentMethod === "WALLET" || transaction.amount < 2000) {
    recommendedChannel = "SMS";
  }

  // Recommended Delay (in minutes)
  let recommendedDelay = 15; // default 15 mins for payment link
  if (recommendedChannel === "RETRY") {
    // Smart retry is immediate
    recommendedDelay = transaction.retryCount === 0 ? 0 : 2;
  } else if (transaction.failureReason === "INSUFFICIENT_FUNDS") {
    // Wait for payday or hours
    recommendedDelay = 1440; // 24 hours
  } else if (recommendedChannel === "EMAIL") {
    recommendedDelay = 60; // 1 hour
  } else if (recommendedChannel === "SMS") {
    recommendedDelay = 30; // 30 mins
  }

  // Reason Codes
  const reasonCodes: string[] = [];
  if (successRate >= 0.8) reasonCodes.push("HIGH_CUSTOMER_LOYALTY");
  if (transaction.failureReason === "TECHNICAL_ERROR" || transaction.failureReason === "NETWORK_ERROR") {
    reasonCodes.push("TEMPORARY_CONNECTION_ISSUE");
  }
  if (hoursSinceFailure <= 2) reasonCodes.push("FRESH_FAILURE_WINDOW");
  if (transaction.retryCount === 0) reasonCodes.push("FIRST_FAILURE_ATTEMPT");
  if (transaction.amount > 25000) reasonCodes.push("HIGH_VALUE_TRANSACTION");
  if (transaction.failureReason === "CARD_EXPIRED") reasonCodes.push("EXPIRED_CREDENTIALS");
  if (transaction.failureReason === "FRAUD_SUSPECTED") reasonCodes.push("RISK_FLAGGED");

  // AI Explanation
  const reasonPhrases: Record<string, string> = {
    HIGH_CUSTOMER_LOYALTY: "customer has a strong transaction success history of " + Math.round(successRate * 100) + "%",
    TEMPORARY_CONNECTION_ISSUE: "failure was caused by a transient network or gateway error",
    FRESH_FAILURE_WINDOW: "payment failure occurred very recently",
    FIRST_FAILURE_ATTEMPT: "system has not attempted any retries yet",
    HIGH_VALUE_TRANSACTION: "transaction amount is high (₹" + transaction.amount.toLocaleString() + ")",
    EXPIRED_CREDENTIALS: "card has expired and requires updated credentials",
    RISK_FLAGGED: "risk engine flagged this transaction for potential fraud",
  };

  const selectedReasons = reasonCodes.map(code => reasonPhrases[code]).filter(Boolean);
  let aiExplanation = "RecoverAI engine recommends recovery intervention because ";
  if (selectedReasons.length > 0) {
    aiExplanation += selectedReasons.join(" and ") + ". ";
  } else {
    aiExplanation += "the customer transaction has a moderate baseline likelihood of successful re-payment. ";
  }

  if (recommendedChannel === "RETRY") {
    aiExplanation += "A direct gateway Smart Retry is scheduled immediately to bypass client-side friction.";
  } else if (recommendedChannel === "WHATSAPP") {
    aiExplanation += "Outreach via WhatsApp is suggested as the customer is paying via UPI and likely on mobile.";
  } else {
    aiExplanation += "We recommend sending a personalized " + recommendedChannel.toLowerCase() + " payment link to prompt updated checkout.";
  }

  // Risk level
  const riskLevel =
    totalScore >= 75 ? "LOW" : totalScore >= 40 ? "MEDIUM" : "HIGH";

  return {
    score: totalScore,
    confidence,
    factors,
    riskLevel,
    expectedValue,
    priority,
    recommendedChannel,
    recommendedDelay,
    reasonCodes,
    aiExplanation,
  };
}
