import prisma from "../utils/prisma";
import { Prisma } from "@prisma/client";

export const dashboardService = {
  async getOverview() {
    const [
      totalTransactions,
      failedTransactions,
      successTransactions,
      recoveryOpportunities,
      activeOpportunities,
      recoveredOpportunities,
      activeCampaigns,
    ] = await Promise.all([
      prisma.transaction.count(),
      prisma.transaction.count({
        where: { status: { in: ["FAILED", "DECLINED", "ABANDONED"] } },
      }),
      prisma.transaction.count({ where: { status: "SUCCESS" } }),
      prisma.recoveryOpportunity.findMany({
        select: {
          estimatedRecoverableAmount: true,
          recoveredAmount: true,
          recoveryScore: true,
          status: true,
        },
      }),
      prisma.recoveryOpportunity.count({
        where: { status: { in: ["IDENTIFIED", "IN_PROGRESS"] } },
      }),
      prisma.recoveryOpportunity.findMany({
        where: { status: { in: ["RECOVERED", "PARTIALLY_RECOVERED"] } },
        select: { recoveredAmount: true },
      }),
      prisma.recoveryCampaign.count({
        where: { status: "ACTIVE" },
      }),
    ]);

    const totalRevenueAtRisk = recoveryOpportunities.reduce(
      (sum, o) => sum + o.estimatedRecoverableAmount,
      0
    );
    const totalRecovered = recoveredOpportunities.reduce(
      (sum, o) => sum + (o.recoveredAmount || 0),
      0
    );
    const recoveryRate =
      totalRevenueAtRisk > 0
        ? (totalRecovered / totalRevenueAtRisk) * 100
        : 0;
    const avgRecoveryScore =
      recoveryOpportunities.length > 0
        ? recoveryOpportunities.reduce((sum, o) => sum + o.recoveryScore, 0) /
          recoveryOpportunities.length
        : 0;

    return {
      totalRevenueAtRisk: Math.round(totalRevenueAtRisk),
      totalRecovered: Math.round(totalRecovered),
      recoveryRate: Math.round(recoveryRate * 10) / 10,
      activeOpportunities,
      totalTransactions,
      failedTransactions,
      activeCampaigns,
      avgRecoveryScore: Math.round(avgRecoveryScore),
      // Simulated period-over-period changes
      revenueAtRiskChange: -5.2,
      recoveredChange: 12.8,
      recoveryRateChange: 3.4,
      opportunitiesChange: -8,
    };
  },

  async getTrends(period: string = "30d") {
    const days = period === "7d" ? 7 : period === "90d" ? 90 : 30;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const transactions = await prisma.transaction.findMany({
      where: { createdAt: { gte: startDate } },
      select: {
        amount: true,
        status: true,
        createdAt: true,
      },
      orderBy: { createdAt: "asc" },
    });

    const recoveries = await prisma.recoveryOpportunity.findMany({
      where: { createdAt: { gte: startDate } },
      select: {
        estimatedRecoverableAmount: true,
        recoveredAmount: true,
        status: true,
        createdAt: true,
      },
    });

    // Group by date
    const dateMap = new Map<string, { atRisk: number; recovered: number }>();
    for (let i = 0; i < days; i++) {
      const d = new Date(startDate);
      d.setDate(d.getDate() + i);
      const key = d.toISOString().split("T")[0];
      dateMap.set(key, { atRisk: 0, recovered: 0 });
    }

    transactions
      .filter((t) => t.status !== "SUCCESS")
      .forEach((t) => {
        const key = t.createdAt.toISOString().split("T")[0];
        const entry = dateMap.get(key);
        if (entry) entry.atRisk += t.amount;
      });

    recoveries
      .filter((r) => r.status === "RECOVERED" || r.status === "PARTIALLY_RECOVERED")
      .forEach((r) => {
        const key = r.createdAt.toISOString().split("T")[0];
        const entry = dateMap.get(key);
        if (entry) entry.recovered += r.recoveredAmount || 0;
      });

    return Array.from(dateMap.entries()).map(([date, data]) => ({
      date,
      atRisk: Math.round(data.atRisk),
      recovered: Math.round(data.recovered),
      recoveryRate: data.atRisk > 0 ? Math.round((data.recovered / data.atRisk) * 100) : 0,
    }));
  },

  async getRecentActivity() {
    const recentRecoveries = await prisma.recoveryOpportunity.findMany({
      take: 10,
      orderBy: { updatedAt: "desc" },
      include: {
        transaction: {
          include: { customer: true },
        },
      },
    });

    return recentRecoveries.map((r) => ({
      id: r.id,
      type: r.recommendedAction,
      description: `${r.recommendedAction.replace(/_/g, " ")} for ${r.transaction.customer.name} — ₹${r.transaction.amount.toLocaleString()}`,
      amount: r.transaction.amount,
      status: r.status,
      timestamp: r.updatedAt.toISOString(),
    }));
  },

  async getFailureBreakdown() {
    const failures = await prisma.transaction.groupBy({
      by: ["failureReason"],
      where: {
        status: { in: ["FAILED", "DECLINED"] },
        failureReason: { not: null },
      },
      _count: true,
      _sum: { amount: true },
    });

    const total = failures.reduce((sum, f) => sum + f._count, 0);

    return failures
      .map((f) => ({
        reason: f.failureReason || "UNKNOWN",
        count: f._count,
        amount: Math.round(f._sum.amount || 0),
        percentage: total > 0 ? Math.round((f._count / total) * 1000) / 10 : 0,
      }))
      .sort((a, b) => b.count - a.count);
  },
};
