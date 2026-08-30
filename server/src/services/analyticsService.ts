import prisma from "../utils/prisma";
import { InsightType, InsightSeverity } from "../ai/types";

export const insightService = {
  async getAll(filters?: { type?: string; severity?: string }) {
    const where: any = { dismissed: false };
    if (filters?.type) where.type = filters.type as InsightType;
    if (filters?.severity) where.severity = filters.severity as InsightSeverity;

    // Fetch database insights
    const dbInsights = await prisma.aIInsight.findMany({
      where,
      orderBy: [{ severity: "asc" }, { createdAt: "desc" }],
    });

    // Generate dynamic insights from actual simulation outcomes!
    const dynamicInsights: any[] = [];

    try {
      const [allOpps, batchRuns] = await Promise.all([
        prisma.recoveryOpportunity.findMany({
          include: { transaction: true }
        }),
        prisma.recoveryBatchRun.findMany()
      ]);

      const totalOpps = allOpps.length;
      const stoppedCount = allOpps.filter(o => o.status === "STOPPED").length;
      const escalatedCount = allOpps.filter(o => o.status === "ESCALATED" || o.status === "PENDING_APPROVAL").length;
      const highValueCount = allOpps.filter(o => o.transaction.amount > 25000).length;

      if (totalOpps > 0) {
        if (stoppedCount > 0) {
          dynamicInsights.push({
            id: "dynamic-insight-stopped",
            type: "PATTERN",
            severity: "HIGH",
            title: `Outreach Prevented for ${stoppedCount} Low-Confidence Transactions`,
            description: `Agent guardrails automatically stopped recovery actions for ${stoppedCount} opportunities where confidence score fell below 50% or maximum retry limits were reached. This prevented unnecessary user messaging.`,
            data: { stopped: stoppedCount, pct: Math.round((stoppedCount / totalOpps) * 100) },
            actionable: true,
            actionUrl: "/recovery?status=STOPPED",
            dismissed: false,
            createdAt: new Date(),
          });
        }

        if (escalatedCount > 0) {
          dynamicInsights.push({
            id: "dynamic-insight-escalated",
            type: "RECOMMENDATION",
            severity: "MEDIUM",
            title: `${escalatedCount} High-Value Recovery Actions Pending Approval`,
            description: `A total of ${escalatedCount} recovery opportunities exceeded the ₹25,000 threshold. Under Rule 3, these actions require merchant approval before execution.`,
            data: { escalated: escalatedCount, highValue: highValueCount },
            actionable: true,
            actionUrl: "/recovery?status=PENDING_APPROVAL",
            dismissed: false,
            createdAt: new Date(),
          });
        }
      }

      if (batchRuns.length > 0) {
        const lastRun = batchRuns[0];
        if (lastRun.attemptedRecoveries > 0) {
          dynamicInsights.push({
            id: "dynamic-insight-batch-success",
            type: "TREND",
            severity: "HIGH",
            title: `Batch ${lastRun.id.slice(0, 4)} Yielded a ${lastRun.recoveryRate}% Recovery Lift`,
            description: `Our latest recovery run recovered ₹${lastRun.totalRecoveredRevenue.toLocaleString()} of ₹${lastRun.totalExpectedRecovery.toLocaleString()} expected revenue with guardrails enabled.`,
            data: { rate: lastRun.recoveryRate, recovered: lastRun.totalRecoveredRevenue },
            actionable: false,
            dismissed: false,
            createdAt: new Date(),
          });
        }
      }
    } catch (e) {
      console.error("Failed to generate dynamic insights:", e);
    }

    // Filter dynamic insights based on query parameters
    let filteredDynamic = dynamicInsights;
    if (filters?.type) filteredDynamic = filteredDynamic.filter(i => i.type === filters.type);
    if (filters?.severity) filteredDynamic = filteredDynamic.filter(i => i.severity === filters.severity);

    return [...filteredDynamic, ...dbInsights];
  },

  async dismiss(id: string) {
    if (id.startsWith("dynamic-")) {
      return { id, dismissed: true };
    }
    return prisma.aIInsight.update({
      where: { id },
      data: { dismissed: true },
    });
  },
};

export const analyticsService = {
  async getFullAnalytics(period: string = "30d") {
    const days = period === "7d" ? 7 : period === "90d" ? 90 : period === "12m" ? 365 : 30;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const [transactions, opportunities, recoveries] = await Promise.all([
      prisma.transaction.findMany({
        where: { createdAt: { gte: startDate } },
        select: {
          amount: true,
          status: true,
          paymentMethod: true,
          failureReason: true,
          createdAt: true,
        },
      }),
      prisma.recoveryOpportunity.findMany({
        where: { createdAt: { gte: startDate } },
        select: {
          estimatedRecoverableAmount: true,
          recoveredAmount: true,
          recoveryScore: true,
          recommendedAction: true,
          status: true,
          createdAt: true,
        },
      }),
      prisma.recoveryOpportunity.findMany({
        where: {
          createdAt: { gte: startDate },
          status: { in: ["RECOVERED", "PARTIALLY_RECOVERED"] },
        },
        include: {
          transaction: {
            include: {
              customer: {
                select: { id: true, name: true, email: true, totalSpent: true },
              },
            },
          },
        },
      }),
    ]);

    // Revenue over time
    const dateMap = new Map<string, { atRisk: number; recovered: number }>();
    const stepDays = days > 90 ? 7 : 1;
    for (let i = 0; i < days; i += stepDays) {
      const d = new Date(startDate);
      d.setDate(d.getDate() + i);
      dateMap.set(d.toISOString().split("T")[0], { atRisk: 0, recovered: 0 });
    }

    transactions
      .filter((t) => t.status !== "SUCCESS")
      .forEach((t) => {
        const key = t.createdAt.toISOString().split("T")[0];
        const entry = dateMap.get(key);
        if (entry) entry.atRisk += t.amount;
      });

    opportunities
      .filter((o) => o.status === "RECOVERED" || o.status === "PARTIALLY_RECOVERED")
      .forEach((o) => {
        const key = o.createdAt.toISOString().split("T")[0];
        const entry = dateMap.get(key);
        if (entry) entry.recovered += o.recoveredAmount || 0;
      });

    const revenueOverTime = Array.from(dateMap.entries()).map(([date, data]) => ({
      date,
      atRisk: Math.round(data.atRisk),
      recovered: Math.round(data.recovered),
      recoveryRate:
        data.atRisk > 0
          ? Math.round((data.recovered / data.atRisk) * 100)
          : 0,
    }));

    // Recovery by payment method
    const methodMap = new Map<string, { total: number; failed: number; amount: number }>();
    transactions.forEach((t) => {
      const entry = methodMap.get(t.paymentMethod) || {
        total: 0,
        failed: 0,
        amount: 0,
      };
      entry.total++;
      if (t.status !== "SUCCESS") {
        entry.failed++;
        entry.amount += t.amount;
      }
      methodMap.set(t.paymentMethod, entry);
    });

    const recoveryByMethod = Array.from(methodMap.entries()).map(
      ([method, data]) => ({
        method: method.replace(/_/g, " "),
        count: data.failed,
        amount: Math.round(data.amount),
        rate:
          data.total > 0
            ? Math.round(((data.total - data.failed) / data.total) * 100)
            : 0,
      })
    );

    // Failure distribution
    const failureMap = new Map<string, { count: number; amount: number }>();
    transactions
      .filter((t) => t.failureReason)
      .forEach((t) => {
        const entry = failureMap.get(t.failureReason!) || { count: 0, amount: 0 };
        entry.count++;
        entry.amount += t.amount;
        failureMap.set(t.failureReason!, entry);
      });

    const totalFailures = Array.from(failureMap.values()).reduce(
      (sum, f) => sum + f.count,
      0
    );
    const failureDistribution = Array.from(failureMap.entries())
      .map(([reason, data]) => ({
        reason: reason.replace(/_/g, " "),
        count: data.count,
        amount: Math.round(data.amount),
        percentage:
          totalFailures > 0
            ? Math.round((data.count / totalFailures) * 1000) / 10
            : 0,
      }))
      .sort((a, b) => b.count - a.count);

    // Recovery by action type
    const actionMap = new Map<string, { count: number; amount: number; success: number }>();
    opportunities.forEach((o) => {
      const entry = actionMap.get(o.recommendedAction) || {
        count: 0,
        amount: 0,
        success: 0,
      };
      entry.count++;
      entry.amount += o.estimatedRecoverableAmount;
      if (o.status === "RECOVERED" || o.status === "PARTIALLY_RECOVERED") {
        entry.success++;
      }
      actionMap.set(o.recommendedAction, entry);
    });

    const recoveryByAction = Array.from(actionMap.entries()).map(
      ([action, data]) => ({
        action: action.replace(/_/g, " "),
        count: data.count,
        amount: Math.round(data.amount),
        successRate:
          data.count > 0 ? Math.round((data.success / data.count) * 100) : 0,
      })
    );

    // Top recoverable customers
    const customerMap = new Map<string, any>();
    recoveries.forEach((r) => {
      const cust = r.transaction.customer;
      const existing = customerMap.get(cust.id) || {
        customer: cust,
        recoverableAmount: 0,
        recoveryScore: 0,
        count: 0,
      };
      existing.recoverableAmount += r.recoveredAmount || 0;
      existing.recoveryScore += r.recoveryScore;
      existing.count++;
      customerMap.set(cust.id, existing);
    });

    const topCustomers = Array.from(customerMap.values())
      .map((c) => ({
        customer: c.customer,
        recoverableAmount: Math.round(c.recoverableAmount),
        recoveryScore: Math.round(c.recoveryScore / c.count),
      }))
      .sort((a, b) => b.recoverableAmount - a.recoverableAmount)
      .slice(0, 10);

    return {
      revenueOverTime,
      recoveryByMethod,
      failureDistribution,
      recoveryByAction,
      topCustomers,
    };
  },
};
