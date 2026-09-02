import prisma from "../utils/prisma";
import { InsightType, InsightSeverity } from "../ai/types";
import { generateGroqInsights } from "../ai/insightGenerator";
import { isGroqAvailable } from "../ai/groqClient";

export const insightService = {
  async getAll(filters?: { type?: string; severity?: string }) {
    const where: any = { dismissed: false };
    if (filters?.type) where.type = filters.type as InsightType;
    if (filters?.severity) where.severity = filters.severity as InsightSeverity;

    // ─── 1. Generate Groq-powered insights from real data ──────
    let groqInsights: any[] = [];

    try {
      // Query real aggregated data for the insight generator
      const [
        totalTxCount,
        failedTxCount,
        allOpps,
        batchRuns,
        failureGroups,
        transactions,
      ] = await Promise.all([
        prisma.transaction.count(),
        prisma.transaction.count({
          where: { status: { in: ["FAILED", "DECLINED", "ABANDONED"] } },
        }),
        prisma.recoveryOpportunity.findMany({
          include: { transaction: true },
        }),
        prisma.recoveryBatchRun.findMany({ orderBy: { createdAt: "desc" } }),
        prisma.transaction.groupBy({
          by: ["failureReason"],
          where: { failureReason: { not: null }, status: { in: ["FAILED", "DECLINED"] } },
          _count: true,
          _sum: { amount: true },
        }),
        prisma.transaction.findMany({
          select: { amount: true, gateway: true, paymentMethod: true },
          where: { status: { in: ["FAILED", "DECLINED", "ABANDONED"] } },
        }),
      ]);

      const totalOpps = allOpps.length;
      const recoveredOpps = allOpps.filter(o => o.status === "RECOVERED" || o.status === "PARTIALLY_RECOVERED");
      const stoppedCount = allOpps.filter(o => o.status === "STOPPED").length;
      const escalatedCount = allOpps.filter(o => o.status === "ESCALATED" || o.status === "PENDING_APPROVAL").length;
      const failedCount = allOpps.filter(o => o.status === "FAILED").length;
      const totalRevenueAtRisk = allOpps.reduce((s, o) => s + o.transaction.amount, 0);
      const totalRecovered = recoveredOpps.reduce((s, o) => s + (o.recoveredAmount || 0), 0);
      const highValueOpps = allOpps.filter(o => o.transaction.amount > 25000);
      const avgScore = totalOpps > 0
        ? Math.round(allOpps.reduce((s, o) => s + o.recoveryScore, 0) / totalOpps)
        : 0;

      // Find top gateway and payment method among failures
      const gatewayCount: Record<string, number> = {};
      const methodCount: Record<string, number> = {};
      transactions.forEach(t => {
        gatewayCount[t.gateway] = (gatewayCount[t.gateway] || 0) + 1;
        methodCount[t.paymentMethod] = (methodCount[t.paymentMethod] || 0) + 1;
      });
      const topGateway = Object.entries(gatewayCount).sort((a, b) => b[1] - a[1])[0]?.[0] || "Unknown";
      const topMethod = Object.entries(methodCount).sort((a, b) => b[1] - a[1])[0]?.[0] || "Unknown";

      const failureBreakdown = failureGroups.map(f => ({
        reason: f.failureReason || "UNKNOWN",
        count: f._count,
        amount: Math.round(f._sum.amount || 0),
      }));

      const lastRun = batchRuns[0];

      // Call Groq insight generator with real data
      groqInsights = await generateGroqInsights({
        totalTransactions: totalTxCount,
        failedTransactions: failedTxCount,
        failureBreakdown,
        recoveryStats: {
          total: totalOpps,
          recovered: recoveredOpps.length,
          stopped: stoppedCount,
          escalated: escalatedCount,
          failed: failedCount,
          totalRevenueAtRisk,
          totalRecovered,
        },
        recentPatterns: {
          topGateway,
          topPaymentMethod: topMethod,
          avgRecoveryScore: avgScore,
          highValueCount: highValueOpps.length,
          highValueAmount: highValueOpps.reduce((s, o) => s + o.transaction.amount, 0),
        },
        batchRunStats: {
          totalRuns: batchRuns.length,
          lastRunRecoveryRate: lastRun?.recoveryRate || 0,
          lastRunRecovered: lastRun?.totalRecoveredRevenue || 0,
        },
      });
    } catch (e) {
      console.error("Failed to generate Groq insights:", e);
    }

    // ─── 2. Fetch database seed insights as secondary source ──
    const dbInsights = await prisma.aIInsight.findMany({
      where,
      orderBy: [{ severity: "asc" }, { createdAt: "desc" }],
    });

    // ─── 3. Combine: Groq insights first, then DB insights ────
    // Filter Groq insights by query params
    let filteredGroq = groqInsights;
    if (filters?.type) filteredGroq = filteredGroq.filter(i => i.type === filters.type);
    if (filters?.severity) filteredGroq = filteredGroq.filter(i => i.severity === filters.severity);

    // If Groq produced insights, prioritize them; DB insights are supplementary
    return [...filteredGroq, ...dbInsights];
  },

  async dismiss(id: string) {
    // Groq-generated insights are ephemeral (not persisted)
    if (id.startsWith("groq-") || id.startsWith("dynamic-")) {
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
