import prisma from "../utils/prisma";
import { CampaignStatus, CampaignType } from "../ai/types";

export const campaignService = {
  async getAll() {
    return prisma.recoveryCampaign.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        _count: { select: { opportunities: true } },
      },
    });
  },

  async getById(id: string) {
    return prisma.recoveryCampaign.findUnique({
      where: { id },
      include: {
        opportunities: {
          include: {
            opportunity: {
              include: {
                transaction: {
                  include: {
                    customer: {
                      select: { id: true, name: true, email: true },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });
  },

  async create(data: {
    name: string;
    description?: string;
    type: CampaignType;
    filters?: Record<string, unknown>;
  }) {
    // Find matching opportunities based on filters
    const opportunities = await prisma.recoveryOpportunity.findMany({
      where: {
        status: { in: ["IDENTIFIED", "IN_PROGRESS"] },
        ...(data.type !== "MIXED" && {
          recommendedAction: data.type === "SMART_RETRY" ? "SMART_RETRY"
            : data.type === "EMAIL" ? "EMAIL_REMINDER"
            : data.type === "SMS" ? "SMS_REMINDER"
            : "PAYMENT_LINK",
        }),
      },
      select: {
        id: true,
        estimatedRecoverableAmount: true,
      },
      take: 100,
    });

    const totalAtRisk = opportunities.reduce(
      (sum, o) => sum + o.estimatedRecoverableAmount,
      0
    );

    const campaign = await prisma.recoveryCampaign.create({
      data: {
        name: data.name,
        description: data.description,
        type: data.type,
        status: "DRAFT",
        targetCount: opportunities.length,
        totalAtRisk: Math.round(totalAtRisk),
        filters: data.filters as any,
        opportunities: {
          create: opportunities.map((o) => ({
            opportunityId: o.id,
          })),
        },
      },
      include: {
        _count: { select: { opportunities: true } },
      },
    });

    return campaign;
  },

  async update(id: string, data: { status?: CampaignStatus; name?: string }) {
    const campaign = await prisma.recoveryCampaign.update({
      where: { id },
      data: {
        ...(data.status && { status: data.status }),
        ...(data.name && { name: data.name }),
        ...(data.status === "ACTIVE" && { startDate: new Date() }),
        ...(data.status === "COMPLETED" && { endDate: new Date() }),
      },
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        action: "CAMPAIGN_UPDATE",
        entityType: "RecoveryCampaign",
        entityId: id,
        details: data as any,
        outcome: data.status || "UPDATED",
      },
    });

    return campaign;
  },
};
