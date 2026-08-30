import prisma from "../utils/prisma";
import { Prisma } from "@prisma/client";
import { TransactionStatus } from "../ai/types";

interface TransactionFilters {
  status?: string;
  paymentMethod?: string;
  search?: string;
  page?: string;
  limit?: string;
  sort?: string;
  order?: string;
}

export const transactionService = {
  async getAll(filters: TransactionFilters) {
    const page = parseInt(filters.page || "1");
    const limit = parseInt(filters.limit || "20");
    const skip = (page - 1) * limit;

    const where: Prisma.TransactionWhereInput = {};

    if (filters.status && filters.status !== "ALL") {
      where.status = filters.status as TransactionStatus;
    }

    if (filters.paymentMethod) {
      where.paymentMethod = filters.paymentMethod as any;
    }

    if (filters.search) {
      where.OR = [
        { externalId: { contains: filters.search } },
        { customer: { name: { contains: filters.search } } },
        { customer: { email: { contains: filters.search } } },
      ];
    }

    const orderBy: Prisma.TransactionOrderByWithRelationInput = {};
    const sortField = filters.sort || "createdAt";
    const sortOrder = (filters.order || "desc") as "asc" | "desc";
    (orderBy as any)[sortField] = sortOrder;

    const [data, total] = await Promise.all([
      prisma.transaction.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          customer: {
            select: {
              id: true,
              name: true,
              email: true,
              totalTransactions: true,
              successfulPayments: true,
            },
          },
          recoveryOpportunity: {
            select: {
              id: true,
              recoveryScore: true,
              status: true,
              recommendedAction: true,
            },
          },
        },
      }),
      prisma.transaction.count({ where }),
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
    return prisma.transaction.findUnique({
      where: { id },
      include: {
        customer: true,
        merchant: {
          select: { id: true, name: true, industry: true },
        },
        recoveryOpportunity: true,
      },
    });
  },
};
