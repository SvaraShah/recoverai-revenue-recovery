import prisma from "../utils/prisma";

// ─── Helpers ─────────────────────────────────────────────

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randBetween(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randFloat(min: number, max: number): number {
  return Math.round((Math.random() * (max - min) + min) * 100) / 100;
}

function daysAgo(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(randBetween(6, 22), randBetween(0, 59), randBetween(0, 59));
  return d;
}

const firstNames = ["Aarav", "Vivaan", "Aditya", "Vihaan", "Arjun", "Sai", "Reyansh", "Ayaan", "Krishna", "Ishaan", "Priya", "Ananya", "Diya", "Saanvi", "Aanya", "Aadhya", "Isha", "Riya", "Neha", "Pooja", "Rahul", "Amit", "Rohit", "Suresh", "Karan", "Nisha", "Meera", "Kavita", "Deepak", "Vikram"];
const lastNames = ["Sharma", "Verma", "Gupta", "Singh", "Kumar", "Patel", "Reddy", "Nair", "Iyer", "Joshi", "Mehta", "Shah", "Chopra", "Malhotra", "Kapoor", "Bhat", "Rao", "Pillai", "Menon", "Das"];

const gateways = ["Razorpay", "Razorpay", "Razorpay", "PayU", "Cashfree", "Stripe"];
const banks = ["HDFC Bank", "ICICI Bank", "SBI", "Axis Bank", "Kotak Mahindra", "Punjab National Bank", "Bank of Baroda", "Yes Bank", "IndusInd Bank", "Federal Bank"];
const devices = ["mobile", "desktop", "tablet"];

const failureReasons: string[] = ["INSUFFICIENT_FUNDS", "CARD_EXPIRED", "BANK_TIMEOUT", "FRAUD_SUSPECTED", "TECHNICAL_ERROR", "AUTHENTICATION_FAILED", "LIMIT_EXCEEDED", "NETWORK_ERROR", "INVALID_CARD", "PROCESSOR_DECLINED"];
const paymentMethods: string[] = ["CREDIT_CARD", "DEBIT_CARD", "UPI", "NET_BANKING", "WALLET", "EMI"];

const failureMessages: Record<string, string[]> = {
  INSUFFICIENT_FUNDS: ["Account balance insufficient", "Transaction declined - low balance"],
  CARD_EXPIRED: ["Card expired. Please use a valid card", "Payment declined - card expiry date invalid"],
  BANK_TIMEOUT: ["Bank server did not respond in time", "Request timed out - issuer bank unavailable"],
  FRAUD_SUSPECTED: ["Transaction flagged by risk engine", "Suspicious activity detected"],
  TECHNICAL_ERROR: ["Internal processing error", "Gateway connection failed", "API timeout"],
  AUTHENTICATION_FAILED: ["3D Secure authentication failed", "OTP verification failed", "Customer dropped off during authentication"],
  LIMIT_EXCEEDED: ["Daily transaction limit exceeded", "Card spending limit reached"],
  NETWORK_ERROR: ["Network connection lost", "Connection reset by peer"],
  INVALID_CARD: ["Invalid card number", "Card number does not match any known card"],
  PROCESSOR_DECLINED: ["Do not honor", "Transaction not permitted", "Restricted card"],
};

/**
 * Idempotent startup seed: only runs if the database has no merchants (i.e., is empty).
 * Uses the same data shape as prisma/seed.ts but is importable from compiled server code.
 */
export async function seedIfEmpty(): Promise<void> {
  const merchantCount = await prisma.merchant.count();
  if (merchantCount > 0) {
    console.log("📦 Database already seeded — skipping startup seed.");
    return;
  }

  console.log("🌱 Empty database detected — running startup seed...\n");

  // ─── Create Merchant ─────────────────────────────────
  const merchant = await prisma.merchant.create({
    data: {
      name: "TechMart India",
      email: "admin@techmart.in",
      industry: "E-commerce",
      monthlyVolume: 15000000,
      currency: "INR",
      timezone: "Asia/Kolkata",
    },
  });
  console.log("✅ Merchant created");

  // ─── Create Customers ────────────────────────────────
  const customers = [];
  for (let i = 0; i < 80; i++) {
    const firstName = pick(firstNames);
    const lastName = pick(lastNames);
    const totalTx = randBetween(1, 50);
    const successRate = randFloat(0.3, 0.95);
    const successful = Math.round(totalTx * successRate);
    const failed = totalTx - successful;

    const customer = await prisma.customer.create({
      data: {
        name: `${firstName} ${lastName}`,
        email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}${i}@example.com`,
        phone: `+91${randBetween(7000000000, 9999999999)}`,
        totalTransactions: totalTx,
        successfulPayments: successful,
        failedPayments: failed,
        totalSpent: randBetween(1000, 500000),
        lastPaymentDate: daysAgo(randBetween(0, 60)),
        riskScore: randFloat(0, 100),
        merchantId: merchant.id,
      },
    });
    customers.push(customer);
  }
  console.log(`✅ ${customers.length} customers created`);

  // ─── Create Transactions ─────────────────────────────
  const transactions = [];
  const statuses: string[] = ["SUCCESS", "FAILED", "DECLINED", "ABANDONED", "PENDING"];
  const statusWeights = [0.45, 0.25, 0.12, 0.10, 0.08];

  for (let i = 0; i < 500; i++) {
    const rand = Math.random();
    let status: string = "SUCCESS";
    let cumulative = 0;
    for (let j = 0; j < statuses.length; j++) {
      cumulative += statusWeights[j];
      if (rand <= cumulative) {
        status = statuses[j];
        break;
      }
    }

    const customer = pick(customers);
    const paymentMethod = pick(paymentMethods);
    const failureReason = status !== "SUCCESS" && status !== "PENDING"
      ? pick(failureReasons)
      : null;

    const amount = paymentMethod === "EMI"
      ? randBetween(10000, 200000)
      : paymentMethod === "UPI"
      ? randBetween(100, 15000)
      : randBetween(200, 80000);

    const tx = await prisma.transaction.create({
      data: {
        externalId: `pay_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}_${i}`,
        amount,
        currency: "INR",
        status,
        paymentMethod,
        gateway: pick(gateways),
        failureReason,
        failureMessage: failureReason ? pick(failureMessages[failureReason]) : null,
        cardLast4: paymentMethod === "CREDIT_CARD" || paymentMethod === "DEBIT_CARD"
          ? `${randBetween(1000, 9999)}`
          : null,
        bankName: pick(banks),
        deviceType: pick(devices),
        retryCount: status === "FAILED" ? randBetween(0, 3) : 0,
        customerId: customer.id,
        merchantId: merchant.id,
        createdAt: daysAgo(randBetween(0, 45)),
      },
    });
    transactions.push(tx);
  }
  console.log(`✅ ${transactions.length} transactions created`);

  // ─── Create Recovery Opportunities ───────────────────
  const failedTxs = transactions.filter(
    (t) => t.status === "FAILED" || t.status === "DECLINED" || t.status === "ABANDONED"
  );

  const toAnalyze = failedTxs.slice(0, Math.floor(failedTxs.length * 0.7));
  const opportunities = [];
  const recoveryStatuses: string[] = ["IDENTIFIED", "IN_PROGRESS", "RECOVERED", "PARTIALLY_RECOVERED", "FAILED", "EXPIRED"];
  const recoveryWeights = [0.30, 0.15, 0.25, 0.10, 0.12, 0.08];
  const actions: string[] = ["SMART_RETRY", "PAYMENT_LINK", "EMAIL_REMINDER", "SMS_REMINDER", "SCHEDULED_RETRY", "MANUAL_REVIEW", "ESCALATE", "OFFER_ALTERNATIVE"];

  for (const tx of toAnalyze) {
    const rand = Math.random();
    let rstatus: string = "IDENTIFIED";
    let cumulative = 0;
    for (let j = 0; j < recoveryStatuses.length; j++) {
      cumulative += recoveryWeights[j];
      if (rand <= cumulative) {
        rstatus = recoveryStatuses[j];
        break;
      }
    }

    const score = randBetween(15, 95);
    const confidence = randFloat(0.5, 0.95);
    const action = score >= 80 ? pick(["SMART_RETRY", "PAYMENT_LINK"] as string[])
      : score >= 60 ? pick(["PAYMENT_LINK", "EMAIL_REMINDER", "SCHEDULED_RETRY"] as string[])
      : score >= 40 ? pick(["EMAIL_REMINDER", "SMS_REMINDER", "OFFER_ALTERNATIVE"] as string[])
      : pick(["MANUAL_REVIEW", "ESCALATE"] as string[]);

    const isRecovered = rstatus === "RECOVERED" || rstatus === "PARTIALLY_RECOVERED";
    const recoveredPct = rstatus === "RECOVERED" ? randFloat(0.8, 1.0) : rstatus === "PARTIALLY_RECOVERED" ? randFloat(0.3, 0.7) : 0;

    const opp = await prisma.recoveryOpportunity.create({
      data: {
        transactionId: tx.id,
        recoveryScore: score,
        estimatedRecoverableAmount: Math.round(tx.amount * randFloat(0.5, 0.95)),
        failureDiagnosis: `Analysis of ${tx.failureReason || "unknown"} failure: ${failureMessages[tx.failureReason as string]?.[0] || "Transaction processing failed"}`,
        diagnosisDetails: {
          category: tx.failureReason === "FRAUD_SUSPECTED" ? "FRAUD" : tx.failureReason === "TECHNICAL_ERROR" || tx.failureReason === "NETWORK_ERROR" ? "TECHNICAL" : "CUSTOMER",
          severity: score >= 70 ? "LOW" : score >= 40 ? "MEDIUM" : "HIGH",
          isRecoverable: tx.failureReason !== "FRAUD_SUSPECTED",
        },
        recommendedAction: action,
        recommendedTiming: daysAgo(-randBetween(0, 7)),
        timingRationale: "Optimal timing based on customer payment patterns and business hours",
        status: rstatus,
        aiConfidence: confidence,
        autoExecute: score >= 80 && tx.failureReason !== "FRAUD_SUSPECTED",
        executedAt: isRecovered ? daysAgo(randBetween(0, 10)) : null,
        recoveredAmount: isRecovered ? Math.round(tx.amount * recoveredPct) : null,
        attemptCount: rstatus === "IDENTIFIED" ? 0 : randBetween(1, 3),
        lastAttemptAt: rstatus !== "IDENTIFIED" ? daysAgo(randBetween(0, 5)) : null,
        expiresAt: daysAgo(-randBetween(3, 30)),
        createdAt: tx.createdAt,
      },
    });
    opportunities.push(opp);
  }
  console.log(`✅ ${opportunities.length} recovery opportunities created`);

  // ─── Create Campaigns ────────────────────────────────
  const campaignData = [
    { name: "Q3 Smart Retry Blitz", type: "SMART_RETRY", status: "ACTIVE", desc: "Automated smart retries for technical failures and bank timeouts" },
    { name: "Card Update Outreach", type: "EMAIL", status: "ACTIVE", desc: "Email campaign for expired card holders to update payment details" },
    { name: "Weekend Recovery Push", type: "PAYMENT_LINK", status: "COMPLETED", desc: "Payment link campaign targeting weekend abandoned carts" },
    { name: "High-Value Recovery", type: "MIXED", status: "ACTIVE", desc: "Multi-channel recovery for transactions over ₹25,000" },
    { name: "UPI Retry Campaign", type: "SMART_RETRY", status: "COMPLETED", desc: "Smart retries for UPI failures from bank timeouts" },
    { name: "Payday Recovery Wave", type: "SMS", status: "DRAFT", desc: "SMS reminders timed with payday cycles for insufficient fund failures" },
    { name: "Authentication Drop-off", type: "PAYMENT_LINK", status: "PAUSED", desc: "Re-engagement for customers who dropped off during 3DS authentication" },
    { name: "August Recovery Sprint", type: "MIXED", status: "ACTIVE", desc: "End-of-month push to recover August revenue" },
  ];

  const oppPool = [...opportunities];
  for (const cd of campaignData) {
    const oppSlice = oppPool.splice(0, Math.min(randBetween(8, 25), oppPool.length));
    if (oppSlice.length === 0) continue;

    const recoveredOps = oppSlice.filter(o => o.status === "RECOVERED" || o.status === "PARTIALLY_RECOVERED");
    const totalRecovered = recoveredOps.reduce((s, o) => s + (o.recoveredAmount || 0), 0);
    const totalAtRisk = oppSlice.reduce((s, o) => s + o.estimatedRecoverableAmount, 0);

    await prisma.recoveryCampaign.create({
      data: {
        name: cd.name,
        description: cd.desc,
        type: cd.type,
        status: cd.status,
        targetCount: oppSlice.length,
        recoveredCount: recoveredOps.length,
        recoveredAmount: totalRecovered,
        totalAtRisk,
        startDate: cd.status !== "DRAFT" ? daysAgo(randBetween(5, 30)) : null,
        endDate: cd.status === "COMPLETED" ? daysAgo(randBetween(0, 5)) : null,
        opportunities: {
          create: oppSlice.map((o) => ({
            opportunityId: o.id,
            status: o.status,
            executedAt: o.executedAt,
          })),
        },
      },
    });
  }
  console.log("✅ Campaigns created");

  // ─── Create AI Insights ──────────────────────────────
  const insights = [
    {
      type: "TREND",
      severity: "HIGH",
      title: "Bank Timeout Failures Up 34% This Week",
      description: "HDFC Bank and ICICI Bank are showing elevated timeout rates, particularly between 2-4 PM IST. This correlates with their scheduled maintenance windows. Consider routing through alternative gateways during these hours.",
      data: { affectedBanks: ["HDFC Bank", "ICICI Bank"], timeRange: "2-4 PM IST", increasePercent: 34 },
      actionUrl: "/transactions?failureReason=BANK_TIMEOUT",
    },
    {
      type: "ANOMALY",
      severity: "CRITICAL",
      title: "Unusual Spike in Card Expired Failures",
      description: "22 card expiry failures detected in the last 6 hours — 3x the normal rate. This may indicate a batch of cards reaching their expiry date. Proactive outreach to affected customers is recommended.",
      data: { normalRate: 7, currentRate: 22, period: "6 hours" },
      actionUrl: "/recovery?action=PAYMENT_LINK",
    },
    {
      type: "RECOMMENDATION",
      severity: "MEDIUM",
      title: "Enable Auto-Retry for UPI Transactions",
      description: "UPI failures due to technical errors have a 92% success rate on first retry. Currently, auto-retry is disabled for UPI. Enabling it could recover an estimated ₹2.3L per month automatically.",
      data: { successRate: 92, estimatedRecovery: 230000, method: "UPI" },
      actionUrl: "/settings",
    },
    {
      type: "PATTERN",
      severity: "LOW",
      title: "Monday Mornings Show Highest Recovery Rate",
      description: "Recovery actions executed between 9-11 AM on Mondays have a 78% success rate vs. 52% average. Consider scheduling campaigns to launch on Monday mornings.",
      data: { bestDay: "Monday", bestTime: "9-11 AM", successRate: 78, avgRate: 52 },
    },
    {
      type: "TREND",
      severity: "MEDIUM",
      title: "Net Banking Failures Declining",
      description: "Net banking failure rate has dropped from 18% to 11% over the past 30 days, suggesting improved bank integration stability. Good news for recovery campaigns targeting this segment.",
      data: { previousRate: 18, currentRate: 11, period: "30 days" },
    },
    {
      type: "RECOMMENDATION",
      severity: "HIGH",
      title: "₹4.7L Recoverable from Abandoned Transactions",
      description: "127 abandoned transactions from the last 7 days have a recovery score above 70. Sending payment links within 24 hours of abandonment yields 3x higher conversion. 83 of these are still within the optimal window.",
      data: { totalAmount: 470000, count: 127, highScore: 83, timeWindow: "24 hours" },
      actionUrl: "/recovery?status=IDENTIFIED",
    },
    {
      type: "ANOMALY",
      severity: "MEDIUM",
      title: "Razorpay Gateway Latency Increase",
      description: "Average response time from Razorpay gateway has increased from 1.2s to 2.8s in the last 4 hours. This may be causing some timeout failures. Monitor closely.",
      data: { normalLatency: 1.2, currentLatency: 2.8, gateway: "Razorpay" },
    },
    {
      type: "PATTERN",
      severity: "LOW",
      title: "EMI Payments Have Highest Success Rate",
      description: "EMI transactions show a 94% success rate compared to 82% for credit cards. Suggesting EMI as an alternative for high-value failed transactions could improve recovery.",
      data: { emiRate: 94, cardRate: 82, upiRate: 87 },
    },
  ];

  for (const insight of insights) {
    await prisma.aIInsight.create({
      data: {
        ...insight,
        data: insight.data as any,
        actionable: !!insight.actionUrl,
        actionUrl: insight.actionUrl || null,
        createdAt: daysAgo(randBetween(0, 7)),
      },
    });
  }
  console.log("✅ AI Insights created");

  // ─── Create Audit Logs ───────────────────────────────
  const auditActions = [
    "AI_ANALYSIS", "RECOVERY_EXECUTION", "CAMPAIGN_CREATED",
    "CAMPAIGN_ACTIVATED", "SETTINGS_UPDATED", "BULK_EXECUTION",
  ];

  for (let i = 0; i < 30; i++) {
    await prisma.auditLog.create({
      data: {
        action: pick(auditActions),
        entityType: pick(["RecoveryOpportunity", "RecoveryCampaign", "Transaction"]),
        entityId: opportunities.length > 0 ? pick(opportunities).id : "system",
        details: {
          automated: Math.random() > 0.5,
          source: pick(["ai_engine", "user_action", "scheduled_task"]),
        },
        outcome: pick(["SUCCESS", "RECOVERED", "FAILED", "CREATED", "UPDATED"]),
        timestamp: daysAgo(randBetween(0, 30)),
      },
    });
  }
  console.log("✅ Audit logs created");

  // Print summary
  const counts = await Promise.all([
    prisma.merchant.count(),
    prisma.customer.count(),
    prisma.transaction.count(),
    prisma.recoveryOpportunity.count(),
    prisma.recoveryCampaign.count(),
    prisma.aIInsight.count(),
    prisma.auditLog.count(),
  ]);

  console.log("\n🎉 Startup seed complete!");
  console.log("📊 Database Summary:");
  console.log(`   Merchants:              ${counts[0]}`);
  console.log(`   Customers:              ${counts[1]}`);
  console.log(`   Transactions:           ${counts[2]}`);
  console.log(`   Recovery Opportunities: ${counts[3]}`);
  console.log(`   Campaigns:              ${counts[4]}`);
  console.log(`   AI Insights:            ${counts[5]}`);
  console.log(`   Audit Logs:             ${counts[6]}`);
}
