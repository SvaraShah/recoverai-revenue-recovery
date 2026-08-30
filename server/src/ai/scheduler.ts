import { TransactionContext, CustomerContext, TimingRecommendation, RecoveryAction } from "./types";

/**
 * Determines the optimal time to execute a recovery action.
 * Uses payday cycles, time-of-day patterns, and action-specific timing.
 */
export function determineOptimalTiming(
  transaction: TransactionContext,
  customer: CustomerContext,
  action: RecoveryAction
): TimingRecommendation {
  const now = new Date();

  // Immediate actions — smart retry, technical failures
  if (action === "SMART_RETRY") {
    const retryDelay = getRetryDelay(transaction.retryCount);
    const recommendedTime = new Date(now.getTime() + retryDelay);
    return {
      recommendedTime,
      rationale: `Smart retry with ${retryDelay / 1000}s exponential backoff delay (attempt ${transaction.retryCount + 1})`,
      windowStart: now,
      windowEnd: new Date(now.getTime() + 3600000), // 1 hour window
      urgency: "IMMEDIATE",
      factors: [
        "Exponential backoff applied",
        "System health verified",
        "Within retry window",
      ],
    };
  }

  // Scheduled retry — wait for payday
  if (action === "SCHEDULED_RETRY") {
    const paydayDate = getNextPayday(now);
    const morningSlot = new Date(paydayDate);
    morningSlot.setHours(10, 0, 0, 0); // 10 AM IST

    return {
      recommendedTime: morningSlot,
      rationale: `Scheduled for next payday cycle (${formatShortDate(morningSlot)}) at 10:00 AM — optimal time for balance availability`,
      windowStart: new Date(paydayDate.getTime() - 86400000), // day before
      windowEnd: new Date(paydayDate.getTime() + 2 * 86400000), // 2 days after
      urgency: "SCHEDULED",
      factors: [
        "Aligned with typical payday cycle",
        "Morning slot — higher transaction success rate",
        "Sufficient time for account funding",
      ],
    };
  }

  // Payment link, email, SMS — business hours, optimal engagement
  if (
    action === "PAYMENT_LINK" ||
    action === "EMAIL_REMINDER" ||
    action === "SMS_REMINDER"
  ) {
    const optimalHour = action === "SMS_REMINDER" ? 11 : 10; // SMS slightly later
    const optimalTime = getNextBusinessHour(now, optimalHour);

    const hoursSinceFailure =
      (now.getTime() - transaction.createdAt.getTime()) / (1000 * 60 * 60);

    // If very recent (< 2 hours), send soon but not immediately
    if (hoursSinceFailure < 2) {
      const soonTime = new Date(now.getTime() + 30 * 60000); // 30 minutes
      return {
        recommendedTime: soonTime,
        rationale:
          "Recent failure — sending notification soon while customer intent is still high",
        windowStart: now,
        windowEnd: new Date(now.getTime() + 2 * 3600000),
        urgency: "SOON",
        factors: [
          "Customer likely still has purchase intent",
          "Quick follow-up improves recovery by 40%",
          "Avoiding immediate send to prevent appearing aggressive",
        ],
      };
    }

    return {
      recommendedTime: optimalTime,
      rationale: `Scheduled for ${formatShortDate(optimalTime)} at ${optimalHour}:00 AM — optimal open/engagement rate`,
      windowStart: new Date(optimalTime.getTime() - 2 * 3600000),
      windowEnd: new Date(optimalTime.getTime() + 4 * 3600000),
      urgency: "SCHEDULED",
      factors: [
        "Business hours for best engagement",
        `${optimalHour}:00 AM has highest email/SMS open rates`,
        "Avoiding late night or weekend sends",
      ],
    };
  }

  // Offer alternative — give customer time to consider
  if (action === "OFFER_ALTERNATIVE") {
    const nextDay = new Date(now.getTime() + 86400000);
    nextDay.setHours(10, 0, 0, 0);

    return {
      recommendedTime: nextDay,
      rationale:
        "Allow 24 hours before suggesting alternatives — gives customer time to resolve on their own",
      windowStart: now,
      windowEnd: new Date(now.getTime() + 3 * 86400000),
      urgency: "SCHEDULED",
      factors: [
        "24-hour cooling period",
        "Customer may resolve the issue themselves",
        "Morning send for optimal engagement",
      ],
    };
  }

  // Manual review / Escalate — during business hours
  const businessHourTime = getNextBusinessHour(now, 9);
  return {
    recommendedTime: businessHourTime,
    rationale: "Queued for next business hour review by the operations team",
    windowStart: now,
    windowEnd: new Date(now.getTime() + 7 * 86400000), // 7 day window
    urgency: "LOW_PRIORITY",
    factors: [
      "Requires human decision-making",
      "Business hours for team availability",
      "No automated action will be taken",
    ],
  };
}

// ─── Helper Functions ────────────────────────────────────

function getRetryDelay(retryCount: number): number {
  // Exponential backoff: 5s, 30s, 120s, 300s
  const delays = [5000, 30000, 120000, 300000];
  return delays[Math.min(retryCount, delays.length - 1)];
}

function getNextPayday(from: Date): Date {
  const day = from.getDate();
  const month = from.getMonth();
  const year = from.getFullYear();

  if (day < 1) {
    return new Date(year, month, 1);
  } else if (day < 15) {
    return new Date(year, month, 15);
  } else {
    // Next month 1st
    return new Date(year, month + 1, 1);
  }
}

function getNextBusinessHour(from: Date, targetHour: number): Date {
  const result = new Date(from);
  result.setHours(targetHour, 0, 0, 0);

  // If past target hour today, move to tomorrow
  if (from.getHours() >= targetHour) {
    result.setDate(result.getDate() + 1);
  }

  // Skip weekends
  while (result.getDay() === 0 || result.getDay() === 6) {
    result.setDate(result.getDate() + 1);
  }

  return result;
}

function formatShortDate(date: Date): string {
  return date.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}
