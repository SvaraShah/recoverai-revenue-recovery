import prisma from "../utils/prisma";
import { Prisma } from "@prisma/client";
import { createAIEngine, runFullAnalysis, getActiveEngineName } from "../ai/engine";
import { TransactionContext, CustomerContext, RecoveryStatus, TransactionStatus, PaymentMethod, FailureReason } from "../ai/types";
import { appSettings } from "../routes/index";
import { clearInsightCache } from "../ai/insightGenerator";
import { AppError } from "../middleware/errorHandler";

interface RecoveryFilters {
  status?: string;
  minScore?: string;
  maxScore?: string;
  action?: string;
  page?: string;
  limit?: string;
  sort?: string;
  order?: "asc" | "desc";
}

// Helper to audit state transitions
async function createAuditLog(
  action: string,
  opportunityId: string,
  previousState: string,
  newState: string,
  reason: string,
  actualAmount: number | null = null
) {
  const opp = await prisma.recoveryOpportunity.findFirst({
    where: {
      OR: [
        { id: opportunityId },
        { transactionId: opportunityId },
        { transaction: { externalId: opportunityId } },
      ],
    },
    include: { transaction: true },
  });
  if (!opp) return;

  await prisma.auditLog.create({
    data: {
      action,
      entityType: "RecoveryOpportunity",
      entityId: opp.id,
      details: {
        transactionId: opp.transaction.externalId || opp.transactionId,
        previousState,
        newState,
        reason,
        recoveryScore: opp.recoveryScore,
        confidence: opp.aiConfidence,
        expectedAmount: opp.estimatedRecoverableAmount,
        actualAmount,
        guardrailResult: {
          maxRetries: appSettings.maxRetryAttempts,
          attemptCount: opp.attemptCount,
        },
      } as any,
      outcome: newState,
    },
  });
}

export const recoveryService = {
  async getAll(filters: RecoveryFilters = {}) {
    const page = parseInt(filters.page || "1");
    const limit = parseInt(filters.limit || "10");
    const skip = (page - 1) * limit;

    const where: Prisma.RecoveryOpportunityWhereInput = {};

    if (filters.status && filters.status !== "ALL") {
      where.status = filters.status;
    }

    if (filters.minScore || filters.maxScore) {
      where.recoveryScore = {};
      if (filters.minScore) where.recoveryScore.gte = parseFloat(filters.minScore);
      if (filters.maxScore) where.recoveryScore.lte = parseFloat(filters.maxScore);
    }

    if (filters.action) {
      where.recommendedAction = filters.action;
    }

    const sortField = filters.sort || "createdAt";
    const sortOrder = filters.order || "desc";

    const [data, total] = await Promise.all([
      prisma.recoveryOpportunity.findMany({
        where,
        include: {
          transaction: {
            include: { customer: true },
          },
        },
        orderBy: { [sortField]: sortOrder },
        skip,
        take: limit,
      }),
      prisma.recoveryOpportunity.count({ where }),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  },

  async getById(id: string) {
    return prisma.recoveryOpportunity.findFirst({
      where: {
        OR: [
          { id },
          { transactionId: id },
          { transaction: { externalId: id } },
        ],
      },
      include: {
        transaction: {
          include: { customer: true },
        },
      },
    });
  },

  async analyzeTransaction(transactionId: string) {
    // Find transaction by internal UUID id OR public externalId
    const transaction = await prisma.transaction.findFirst({
      where: {
        OR: [
          { id: transactionId },
          { externalId: transactionId },
        ],
      },
      include: { customer: true },
    });

    if (!transaction) throw new AppError(404, "Transaction not found");

    // Check if opportunity already exists for this transaction
    const existing = await prisma.recoveryOpportunity.findFirst({
      where: { transactionId: transaction.id },
      include: {
        transaction: {
          include: { customer: true },
        },
      },
    });

    if (existing) {
      // Re-evaluate deterministic Fraud / Invalid Card policy on pre-existing records
      if (
        transaction.failureReason === "FRAUD_SUSPECTED" ||
        transaction.failureReason === "INVALID_CARD"
      ) {
        const updatedExisting = await prisma.recoveryOpportunity.update({
          where: { id: existing.id },
          data: {
            status: "STOPPED",
            autoExecute: false,
            timingRationale: `POLICY BLOCKED: Recovery action prohibited for fraud/invalid-card risk (${transaction.failureReason})`,
          },
          include: {
            transaction: {
              include: { customer: true },
            },
          },
        });

        // Log audit event for policy intercept on pre-existing opportunity
        const aiEngine = getActiveEngineName();
        await prisma.auditLog.create({
          data: {
            action: "RECOVERY_STOPPED",
            entityType: "RecoveryOpportunity",
            entityId: existing.id,
            details: {
              transactionId: transaction.externalId || transaction.id,
              aiEngine,
              failureReason: transaction.failureReason,
              policyRuleTriggered: "Rule 2: Fraud / Invalid Card Risk Intercept",
              aiRecommendation: updatedExisting.recommendedAction,
              policyOverride: `POLICY BLOCKED: Recovery action prohibited for fraud/invalid-card risk (${transaction.failureReason})`,
              escalation: "Escalated to human/manual review",
              score: updatedExisting.recoveryScore,
              confidence: updatedExisting.aiConfidence,
              status: "STOPPED",
              guardrailDecision: `POLICY BLOCKED: Recovery action prohibited for fraud/invalid-card risk (${transaction.failureReason})`,
            } as any,
            outcome: "STOPPED",
          },
        });

        return updatedExisting;
      }
      // Re-evaluate deterministic High Value policy (>25,000) on pre-existing records
      else if (
        transaction.amount > 25000 &&
        existing.status !== "STOPPED" &&
        existing.status !== "RECOVERED" &&
        existing.status !== "EXECUTING"
      ) {
        const updatedExisting = await prisma.recoveryOpportunity.update({
          where: { id: existing.id },
          data: {
            status: "PENDING_APPROVAL",
            autoExecute: false,
            timingRationale: `Guardrail Check: High-value transaction (₹${transaction.amount}) requires human approval`,
          },
          include: {
            transaction: {
              include: { customer: true },
            },
          },
        });

        // Audit log entry for high value approval check
        const aiEngine = getActiveEngineName();
        await prisma.auditLog.create({
          data: {
            action: "APPROVAL_REQUIRED",
            entityType: "RecoveryOpportunity",
            entityId: existing.id,
            details: {
              transactionId: transaction.externalId || transaction.id,
              aiEngine,
              amount: transaction.amount,
              policyRuleTriggered: "Rule 3: High-Value Threshold (>₹25,000) Intercept",
              aiRecommendation: updatedExisting.recommendedAction,
              status: "PENDING_APPROVAL",
              guardrailDecision: `Guardrail Check: High-value transaction (₹${transaction.amount}) requires human approval`,
            } as any,
            outcome: "PENDING_APPROVAL",
          },
        });

        return updatedExisting;
      }
      return existing;
    }

    const engine = createAIEngine();

    const txContext: TransactionContext = {
      id: transaction.id,
      amount: transaction.amount,
      currency: transaction.currency,
      status: transaction.status as TransactionStatus,
      paymentMethod: transaction.paymentMethod as PaymentMethod,
      gateway: transaction.gateway,
      failureReason: transaction.failureReason as FailureReason | null,
      failureMessage: transaction.failureMessage,
      retryCount: transaction.retryCount,
      maxRetries: transaction.maxRetries,
      createdAt: transaction.createdAt,
    };

    const custContext: CustomerContext = {
      id: transaction.customer.id,
      totalTransactions: transaction.customer.totalTransactions,
      successfulPayments: transaction.customer.successfulPayments,
      failedPayments: transaction.customer.failedPayments,
      totalSpent: transaction.customer.totalSpent,
      lastPaymentDate: transaction.customer.lastPaymentDate,
      riskScore: transaction.customer.riskScore,
    };

    const result = await runFullAnalysis(engine, txContext, custContext);

    // Guardrail Checks to decide initial State/Intervention
    let status: string = "RECOMMENDED";
    let timingRationale = result.timing.rationale || "";
    let autoExecute = result.action.autoExecuteRecommended;

    // Rule 2 check (permanently invalid / fraud risk)
    if (
      txContext.failureReason === "FRAUD_SUSPECTED" ||
      txContext.failureReason === "INVALID_CARD"
    ) {
      status = "STOPPED";
      timingRationale = `POLICY BLOCKED: Recovery action prohibited for fraud/invalid-card risk (${txContext.failureReason})`;
      autoExecute = false;
    }
    // Rule 1 check (max retry count reached)
    else if (txContext.retryCount >= appSettings.maxRetryAttempts) {
      status = "STOPPED";
      timingRationale = `Guardrail Blocked: Max retry count limit reached (${txContext.retryCount}/${appSettings.maxRetryAttempts})`;
      autoExecute = false;
    }
    // Rule 5 check (customer outreach frequency limits)
    else if (custContext.failedPayments >= 6) {
      status = "STOPPED";
      timingRationale = `Guardrail Blocked: Customer frequency limit exceeded (${custContext.failedPayments} failed payments)`;
      autoExecute = false;
    }
    // Rule 3 check (high value threshold)
    else if (txContext.amount > 25000) {
      status = "PENDING_APPROVAL";
      timingRationale = `Guardrail Check: High-value transaction (₹${txContext.amount}) requires approval`;
      autoExecute = false;
    }
    // Rule 4 check (low confidence)
    else if (result.score.confidence < (appSettings.confidenceThreshold * 100)) {
      status = "ELIGIBLE";
      timingRationale = `Guardrail Check: Low confidence (${result.score.confidence}%) below threshold`;
      autoExecute = false;
    }

    console.log(`[AI] policy check completed: status=${status}`);

    const opportunity = await prisma.recoveryOpportunity.create({
      data: {
        transactionId: transaction.id,
        recoveryScore: result.score.score,
        estimatedRecoverableAmount: result.action.estimatedRecoverableAmount,
        expectedValue: result.score.expectedValue,
        priority: result.score.priority,
        recommendedAction: result.action.primaryAction,
        recommendedChannel: result.score.recommendedChannel,
        recommendedDelay: result.score.recommendedDelay,
        reasonCodes: JSON.stringify(result.score.reasonCodes),
        aiExplanation: result.score.aiExplanation,
        failureDiagnosis: result.analysis.diagnosis,
        diagnosisDetails: result.analysis.details as any,
        recommendedTiming: result.timing.recommendedTime,
        timingRationale,
        aiConfidence: result.score.confidence,
        status,
        autoExecute,
        expiresAt: result.timing.windowEnd,
      },
      include: {
        transaction: {
          include: { customer: true },
        },
      },
    });

    console.log(`[AI] opportunity persisted: ${opportunity.id}`);

    // Audit log — record which AI engine made this decision and policy override
    const aiEngine = getActiveEngineName();
    await prisma.auditLog.create({
      data: {
        action: status === "STOPPED" ? "RECOVERY_STOPPED" : "AI_ANALYSIS",
        entityType: "RecoveryOpportunity",
        entityId: opportunity.id,
        details: {
          transactionId: transaction.externalId || transaction.id,
          aiEngine,
          failureReason: transaction.failureReason,
          policyRuleTriggered: status === "STOPPED" ? "Rule 2: Fraud / Invalid Card Risk Intercept" : null,
          aiRecommendation: result.action.primaryAction,
          groqReasoning: result.action.reasoning,
          groqDiagnosis: result.analysis.diagnosis,
          aiExplanation: result.score.aiExplanation,
          status,
          guardrailDecision: timingRationale,
          policyOverride: status === "STOPPED" || status === "PENDING_APPROVAL" ? timingRationale : null,
          escalation: status === "STOPPED" ? "Escalated to human/manual review" : null,
          score: result.score.score,
          confidence: result.score.confidence,
          factors: result.score.factors,
        } as any,
        outcome: status,
      },
    });

    console.log(`[AI] audit persisted`);

    // Clear insight cache so AI Insights page reflects this new analysis
    clearInsightCache();

    return opportunity;
  },

  async executeRecovery(opportunityId: string) {
    const opportunity = await prisma.recoveryOpportunity.findFirst({
      where: {
        OR: [
          { id: opportunityId },
          { transactionId: opportunityId },
          { transaction: { externalId: opportunityId } },
        ],
      },
      include: { transaction: { include: { customer: true } } },
    });

    if (!opportunity) throw new AppError(404, "Recovery opportunity not found");

    // Strict Rule 2 Guardrail check before executing
    if (
      opportunity.status === "STOPPED" ||
      opportunity.transaction.failureReason === "FRAUD_SUSPECTED" ||
      opportunity.transaction.failureReason === "INVALID_CARD"
    ) {
      throw new AppError(400, "POLICY BLOCKED: Recovery action prohibited for fraud/invalid-card risk.");
    }

    const previousState = opportunity.status;

    // Rule 6: If already recovered, stop further actions
    if (opportunity.status === "RECOVERED") {
      throw new AppError(400, "Opportunity is already recovered");
    }

    // Rule 1: Max retry check before executing
    if (opportunity.attemptCount >= appSettings.maxRetryAttempts) {
      await prisma.recoveryOpportunity.update({
        where: { id: opportunity.id },
        data: { status: "STOPPED" },
      });
      await createAuditLog(
        "RECOVERY_STOPPED",
        opportunity.id,
        previousState,
        "STOPPED",
        `Retry attempts reached limits (${opportunity.attemptCount}/${appSettings.maxRetryAttempts})`
      );
      throw new AppError(400, "Max retry count limits reached. Bounded retry policy applied.");
    }

    // Transition to EXECUTING
    await prisma.recoveryOpportunity.update({
      where: { id: opportunity.id },
      data: { status: "EXECUTING" },
    });
    await createAuditLog("RECOVERY_EXECUTED", opportunity.id, previousState, "EXECUTING", "Outreach recovery action initiated");

    // Simulate recovery execution using deterministic logic
    const scoreVal = opportunity.recoveryScore;
    const failureReason = opportunity.transaction.failureReason;

    // Technically failed transactions are highly recoverable; fraud is non-recoverable
    let successChance = scoreVal * 0.85;
    if (failureReason === "TECHNICAL_ERROR" || failureReason === "NETWORK_ERROR") {
      successChance += 10;
    } else if (failureReason === "FRAUD_SUSPECTED") {
      successChance = 0;
    }

    const roll = Math.random() * 100;
    const isSuccess = roll <= successChance;

    let targetState = "FAILED";
    let recoveredAmount = null;

    if (isSuccess) {
      targetState = "RECOVERED";
      recoveredAmount = opportunity.estimatedRecoverableAmount;
    } else {
      // Rule 7: Repeated attempts fail, escalate to manual review
      if (opportunity.attemptCount + 1 >= appSettings.maxRetryAttempts) {
        targetState = "ESCALATED";
      } else {
        targetState = "FAILED";
      }
    }

    const updated = await prisma.recoveryOpportunity.update({
      where: { id: opportunity.id },
      data: {
        status: targetState,
        executedAt: new Date(),
        recoveredAmount: recoveredAmount ? Math.round(recoveredAmount) : null,
        attemptCount: { increment: 1 },
        lastAttemptAt: new Date(),
      },
      include: {
        transaction: {
          include: { customer: true },
        },
      },
    });

    // Audit log with AI engine metadata
    await createAuditLog(
      targetState === "RECOVERED" ? "RECOVERY_SUCCEEDED" : targetState === "ESCALATED" ? "RECOVERY_ESCALATED" : "RECOVERY_FAILED",
      opportunity.id,
      "EXECUTING",
      targetState,
      targetState === "RECOVERED"
        ? `Recovery action successful. Recovered ₹${recoveredAmount}`
        : `Recovery attempt failed (attempt ${opportunity.attemptCount + 1})`,
      recoveredAmount
    );

    // Clear insight cache so analytics reflect the new outcome
    clearInsightCache();

    return updated;
  },

  async bulkExecute(ids: string[]) {
    const results = await Promise.all(
      ids.map((id) =>
        this.executeRecovery(id).catch((err) => ({
          id,
          error: err.message,
        }))
      )
    );
    return { results };
  },

  // ─── Batch Runs ──────────────────────────────────────────

  async getBatchRuns() {
    return prisma.recoveryBatchRun.findMany({
      orderBy: { createdAt: "desc" },
    });
  },

  async getBatchRunById(id: string) {
    return prisma.recoveryBatchRun.findUnique({
      where: { id },
      include: { opportunities: true },
    });
  },

  async createBatchRun(config: { batchSize: number; guardrailsEnabled: boolean; approvalRequired: boolean }) {
    const startTime = Date.now();
    const guardrailCounts: Record<string, number> = {
      "Fraud / Invalid Card": 0,
      "Max Retry Attempts": 0,
      "Customer Frequency Limit": 0,
      "High Value (>₹25k) Approval": 0,
      "Low Confidence (<50%)": 0,
    };

    // Get opportunities that are in identified/pending/recommended states
    const activeOpps = await prisma.recoveryOpportunity.findMany({
      where: {
        status: { in: ["IDENTIFIED", "ELIGIBLE", "RECOMMENDED", "PENDING_APPROVAL"] },
      },
      take: config.batchSize,
    });

    let opportunitiesToProcess = [...activeOpps];

    // If we don't have enough, analyze failed transactions on-the-fly to populate the batch!
    if (opportunitiesToProcess.length < config.batchSize) {
      const neededCount = config.batchSize - opportunitiesToProcess.length;
      const unanalyzedFailedTxs = await prisma.transaction.findMany({
        where: {
          status: { in: ["FAILED", "DECLINED", "ABANDONED"] },
          recoveryOpportunity: null,
        },
        take: neededCount,
      });

      for (const tx of unanalyzedFailedTxs) {
        try {
          const opp = await this.analyzeTransaction(tx.id);
          opportunitiesToProcess.push(opp);
        } catch (e) {
          // ignore
        }
      }
    }

    opportunitiesToProcess = opportunitiesToProcess.slice(0, config.batchSize);

    // Create the batch run object
    const batchRun = await prisma.recoveryBatchRun.create({
      data: {
        totalTransactions: opportunitiesToProcess.length,
        eligibleTransactions: 0,
        attemptedRecoveries: 0,
        successfulRecoveries: 0,
        failedRecoveries: 0,
        stoppedRecoveries: 0,
        escalatedRecoveries: 0,
        totalRevenueAtRisk: 0,
        totalExpectedRecovery: 0,
        totalRecoveredRevenue: 0,
        recoveryRate: 0,
        averageRecoveryTime: 0,
        guardrailsEnabled: config.guardrailsEnabled,
        approvalRequired: config.approvalRequired,
      },
    });

    let eligibleTransactions = 0;
    let attemptedRecoveries = 0;
    let successfulRecoveries = 0;
    let failedRecoveries = 0;
    let stoppedRecoveries = 0;
    let escalatedRecoveries = 0;
    let totalRevenueAtRisk = 0;
    let totalExpectedRecovery = 0;
    let totalRecoveredRevenue = 0;
    const batchResults: any[] = [];

    for (const opp of opportunitiesToProcess) {
      const fullOpp = await prisma.recoveryOpportunity.findUnique({
        where: { id: opp.id },
        include: { transaction: { include: { customer: true } } },
      });
      if (!fullOpp) continue;

      totalRevenueAtRisk += fullOpp.transaction.amount;
      const expectedVal = fullOpp.expectedValue || (fullOpp.estimatedRecoverableAmount * (fullOpp.recoveryScore / 100));
      totalExpectedRecovery += expectedVal;

      const previousState = fullOpp.status;
      let targetState = previousState;
      let checkAction = false;
      let stopReason = "";
      let escalateReason = "";

      if (config.guardrailsEnabled) {
        // RULE 2: Fraud / invalid credentials check
        if (
          fullOpp.transaction.failureReason === "FRAUD_SUSPECTED" ||
          fullOpp.transaction.failureReason === "INVALID_CARD"
        ) {
          targetState = "STOPPED";
          stopReason = `Guardrail Blocked: Permanently invalid failure (${fullOpp.transaction.failureReason})`;
          stoppedRecoveries++;
          guardrailCounts["Fraud / Invalid Card"]++;
        }
        // RULE 1: Max retry check
        else if (fullOpp.attemptCount >= appSettings.maxRetryAttempts) {
          targetState = "STOPPED";
          stopReason = `Guardrail Blocked: Retry attempts exceeded (${fullOpp.attemptCount}/${appSettings.maxRetryAttempts})`;
          stoppedRecoveries++;
          guardrailCounts["Max Retry Attempts"]++;
        }
        // RULE 5: outreach threshold
        else if (fullOpp.transaction.customer.failedPayments >= 6) {
          targetState = "STOPPED";
          stopReason = `Guardrail Blocked: Customer frequency limit exceeded`;
          stoppedRecoveries++;
          guardrailCounts["Customer Frequency Limit"]++;
        }
        // RULE 3: High value merchant approval check
        else if (config.approvalRequired && fullOpp.transaction.amount > 25000) {
          targetState = "PENDING_APPROVAL";
          escalateReason = `Guardrail Check: High-value transaction (₹${fullOpp.transaction.amount}) requires approval`;
          escalatedRecoveries++;
          guardrailCounts["High Value (>₹25k) Approval"]++;
        }
        // RULE 4: confidence check
        else if (fullOpp.aiConfidence < (appSettings.confidenceThreshold * 100)) {
          targetState = "PENDING_APPROVAL";
          escalateReason = `Guardrail Check: Confidence (${fullOpp.aiConfidence}%) below threshold`;
          escalatedRecoveries++;
          guardrailCounts["Low Confidence (<50%)"]++;
        } else {
          eligibleTransactions++;
          checkAction = true;
        }
      } else {
        eligibleTransactions++;
        checkAction = true;
      }

      let recoveredAmount = null;

      if (checkAction) {
        attemptedRecoveries++;
        const successChance = fullOpp.recoveryScore * 0.85;
        const roll = Math.random() * 100;
        const isSuccess = roll <= successChance;

        if (isSuccess) {
          targetState = "RECOVERED";
          recoveredAmount = fullOpp.estimatedRecoverableAmount;
          successfulRecoveries++;
          totalRecoveredRevenue += recoveredAmount;
        } else {
          // Rule 7: Repeated attempts fail, escalate
          if (fullOpp.attemptCount + 1 >= appSettings.maxRetryAttempts) {
            targetState = "ESCALATED";
            escalatedRecoveries++;
          } else {
            targetState = "FAILED";
            failedRecoveries++;
          }
        }

        await prisma.recoveryOpportunity.update({
          where: { id: fullOpp.id },
          data: {
            status: targetState,
            attemptCount: fullOpp.attemptCount + 1,
            lastAttemptAt: new Date(),
            recoveredAmount,
            batchRunId: batchRun.id,
          },
        });

        // Audit log
        await prisma.auditLog.create({
          data: {
            action: targetState === "RECOVERED" ? "RECOVERY_SUCCEEDED" : targetState === "ESCALATED" ? "RECOVERY_ESCALATED" : "RECOVERY_FAILED",
            entityType: "RecoveryOpportunity",
            entityId: fullOpp.id,
            details: {
              transactionId: fullOpp.transactionId,
              aiEngine: getActiveEngineName(),
              previousState,
              newState: targetState,
              reason: targetState === "RECOVERED" ? `Recovery successful — ₹${recoveredAmount}` : `Recovery attempt failed`,
              recoveryScore: fullOpp.recoveryScore,
              confidence: fullOpp.aiConfidence,
              expectedAmount: fullOpp.estimatedRecoverableAmount,
              batchId: batchRun.id,
            } as any,
            outcome: targetState,
          },
        });
      } else {
        await prisma.recoveryOpportunity.update({
          where: { id: fullOpp.id },
          data: {
            status: targetState,
            batchRunId: batchRun.id,
          },
        });

        await prisma.auditLog.create({
          data: {
            action: targetState === "STOPPED" ? "RECOVERY_STOPPED" : "APPROVAL_REQUIRED",
            entityType: "RecoveryOpportunity",
            entityId: fullOpp.id,
            details: {
              transactionId: fullOpp.transactionId,
              aiEngine: getActiveEngineName(),
              previousState,
              newState: targetState,
              reason: targetState === "STOPPED" ? stopReason : escalateReason,
              recoveryScore: fullOpp.recoveryScore,
              confidence: fullOpp.aiConfidence,
              expectedAmount: fullOpp.estimatedRecoverableAmount,
              batchId: batchRun.id,
            } as any,
            outcome: targetState,
          },
        });
      }

      batchResults.push({
        opportunityId: fullOpp.id,
        customerName: fullOpp.transaction.customer.name,
        amount: fullOpp.transaction.amount,
        action: fullOpp.recommendedAction,
        score: fullOpp.recoveryScore,
        confidence: fullOpp.aiConfidence,
        previousState,
        newState: targetState,
        stopReason,
        escalateReason,
        recoveredAmount,
      });
    }

    const recoveryRate = attemptedRecoveries > 0
      ? Math.round((successfulRecoveries / attemptedRecoveries) * 100)
      : 0;

    const updatedBatchRun = await prisma.recoveryBatchRun.update({
      where: { id: batchRun.id },
      data: {
        completedAt: new Date(),
        eligibleTransactions,
        attemptedRecoveries,
        successfulRecoveries,
        failedRecoveries,
        stoppedRecoveries,
        escalatedRecoveries,
        totalRevenueAtRisk,
        totalExpectedRecovery,
        totalRecoveredRevenue,
        recoveryRate,
        averageRecoveryTime: attemptedRecoveries > 0 ? 12.5 : 0,
        results: batchResults as any,
      },
    });

    // Clear insight cache after batch run so insights refresh
    clearInsightCache();

    const executionTimeMs = Date.now() - startTime;

    const summary = {
      totalTransactionsProcessed: opportunitiesToProcess.length,
      totalAtRiskAmount: Math.round(totalRevenueAtRisk),
      totalRecoveredAmount: Math.round(totalRecoveredRevenue),
      recoveryRatePercent: recoveryRate,
      stoppedByGuardrail: Object.entries(guardrailCounts)
        .filter(([_, count]) => count > 0)
        .map(([rule, count]) => ({ rule, count })),
      escalatedToApproval: escalatedRecoveries,
      executionTimeMs,
    };

    return {
      ...updatedBatchRun,
      summary,
    };
  },

  async getAuditLogs() {
    return prisma.auditLog.findMany({
      orderBy: { timestamp: "desc" },
      take: 100,
    });
  },

  async getPerformanceMetrics() {
    const failedPaymentsCount = await prisma.transaction.count({
      where: { status: { in: ["FAILED", "DECLINED", "ABANDONED"] } },
    });

    const opps = await prisma.recoveryOpportunity.findMany({
      include: { transaction: true },
    });

    const totalRevenueAtRisk = opps.reduce((sum, o) => sum + o.transaction.amount, 0);
    const totalExpectedRecovery = opps.reduce((sum, o) => sum + (o.expectedValue || (o.estimatedRecoverableAmount * (o.recoveryScore / 100))), 0);
    const totalRecoveredRevenue = opps.reduce((sum, o) => sum + (o.recoveredAmount || 0), 0);

    const recoveredCount = opps.filter(o => o.status === "RECOVERED").length;
    const attemptedCount = opps.filter(o => o.attemptCount > 0 || o.status === "EXECUTING" || o.status === "RECOVERED").length;
    const stoppedCount = opps.filter(o => o.status === "STOPPED").length;
    const escalatedCount = opps.filter(o => o.status === "ESCALATED" || o.status === "PENDING_APPROVAL").length;
    const opportunitiesCount = opps.filter(o => o.status !== "STOPPED" && o.status !== "EXPIRED").length;
    const aiAnalyzedCount = opps.length;

    const recoveryRate = attemptedCount > 0 ? Math.round((recoveredCount / attemptedCount) * 100) : 0;
    const stopRate = opps.length > 0 ? Math.round((stoppedCount / opps.length) * 100) : 0;
    const escalationRate = opps.length > 0 ? Math.round((escalatedCount / opps.length) * 100) : 0;

    // Calculate lift: base recovery rate is typically around 15%, so Lift is recoveryRate - 15%
    const recoveryLift = Math.max(0, recoveryRate - 15);

    // Calculate attempts per recovery
    const totalAttempts = opps.reduce((sum, o) => sum + o.attemptCount, 0);
    const attemptsPerRecovery = recoveredCount > 0 ? parseFloat((totalAttempts / recoveredCount).toFixed(1)) : 0;

    // Get batch runs for estimated vs actual comparison
    const batchRuns = await prisma.recoveryBatchRun.findMany({
      orderBy: { createdAt: "asc" },
      take: 10,
    });

    const estimatedVsActual = batchRuns.map(run => ({
      name: `Batch ${run.id.slice(0, 4)}`,
      estimated: run.totalExpectedRecovery,
      actual: run.totalRecoveredRevenue,
    }));

    return {
      failedPaymentsCount,
      aiAnalyzedCount,
      opportunitiesCount,
      outreachDispatchedCount: attemptedCount,
      recoveredCount,
      totalTransactions: failedPaymentsCount,
      attemptedRecoveries: attemptedCount,
      successfulRecoveries: recoveredCount,
      stoppedRecoveries: stoppedCount,
      totalRevenueAtRisk,
      totalExpectedRecovery,
      totalRecoveredRevenue,
      recoveryLift,
      recoveryRate,
      averageRecoveryTime: 12.5,
      attemptsPerRecovery,
      stopRate,
      escalationRate,
      stoppedCount,
      escalatedCount,
      estimatedVsActual,
    };
  },
};
