const API_BASE = (import.meta.env.VITE_API_URL || "") + "/api";

class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.name = "ApiError";
  }
}

async function request<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const url = `${API_BASE}${endpoint}`;
  const response = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
    ...options,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: "Request failed" }));
    throw new ApiError(response.status, error.message || `HTTP ${response.status}`);
  }

  return response.json();
}

// ─── Dashboard ───────────────────────────────────────────

export const dashboardApi = {
  getOverview: () => request<import("@/types").DashboardOverview>("/dashboard/overview"),
  getTrends: (period: string = "30d") =>
    request<import("@/types").TrendDataPoint[]>(`/dashboard/trends?period=${period}`),
  getRecentActivity: () =>
    request<import("@/types").RecentActivity[]>("/dashboard/recent-activity"),
  getFailureBreakdown: () =>
    request<import("@/types").FailureBreakdown[]>("/dashboard/failure-breakdown"),
};

// Helper to clean query params
function buildQueryString(params?: Record<string, string>): string {
  if (!params) return "";
  const cleanedParams: Record<string, string> = {};
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      if (key === "status" && value.toUpperCase() === "ALL") {
        return;
      }
      cleanedParams[key] = value;
    }
  });
  const search = new URLSearchParams(cleanedParams).toString();
  return search ? `?${search}` : "";
}

// ─── Transactions ────────────────────────────────────────

export const transactionsApi = {
  getAll: (params?: Record<string, string>) => {
    const query = buildQueryString(params);
    return request<import("@/types").PaginatedResponse<import("@/types").Transaction>>(`/transactions${query}`);
  },
  getById: (id: string) => request<import("@/types").Transaction>(`/transactions/${id}`),
  analyze: (id: string) => request<import("@/types").RecoveryOpportunity>(`/transactions/${id}/analyze`, { method: "POST" }),
};

// ─── Recovery ────────────────────────────────────────────

export const recoveryApi = {
  getAll: (params?: Record<string, string>) => {
    const query = buildQueryString(params);
    return request<import("@/types").PaginatedResponse<import("@/types").RecoveryOpportunity>>(`/recovery${query}`);
  },
  getById: (id: string) => request<import("@/types").RecoveryOpportunity>(`/recovery/${id}`),
  execute: (id: string) => request<import("@/types").RecoveryOpportunity>(`/recovery/${id}/execute`, { method: "POST" }),
  bulkExecute: (ids: string[]) =>
    request<{ results: import("@/types").RecoveryOpportunity[] }>("/recovery/bulk-execute", {
      method: "POST",
      body: JSON.stringify({ ids }),
    }),
  getGuardrails: () => request<any>("/recovery/guardrails"),
  updateGuardrails: (data: any) =>
    request<any>("/recovery/guardrails", {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  getPerformance: () => request<any>("/recovery/performance"),
  getAuditLog: () => request<any[]>("/recovery/audit-log"),
  getBatchRuns: () => request<any[]>("/recovery/batch-runs"),
  getBatchRunById: (id: string) => request<any>(`/recovery/batch-runs/${id}`),
  createBatchRun: (data: { batchSize: number; guardrailsEnabled: boolean; approvalRequired: boolean }) =>
    request<import("@/types").BatchRunResult>("/recovery/batch-run", {
      method: "POST",
      body: JSON.stringify(data),
    }),
};

// ─── Campaigns ───────────────────────────────────────────

export const campaignsApi = {
  getAll: () => request<import("@/types").RecoveryCampaign[]>("/campaigns"),
  getById: (id: string) => request<import("@/types").RecoveryCampaign>(`/campaigns/${id}`),
  create: (data: Partial<import("@/types").RecoveryCampaign>) =>
    request<import("@/types").RecoveryCampaign>("/campaigns", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  update: (id: string, data: Partial<import("@/types").RecoveryCampaign>) =>
    request<import("@/types").RecoveryCampaign>(`/campaigns/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
};

// ─── Insights ────────────────────────────────────────────

export const insightsApi = {
  getAll: (params?: Record<string, string>) => {
    const query = params ? `?${new URLSearchParams(params)}` : "";
    return request<import("@/types").AIInsight[]>(`/insights${query}`);
  },
  dismiss: (id: string) =>
    request<void>(`/insights/${id}/dismiss`, { method: "POST" }),
};

// ─── Analytics ───────────────────────────────────────────

export const analyticsApi = {
  getRevenue: (period: string = "30d") =>
    request<import("@/types").TrendDataPoint[]>(`/analytics/revenue?period=${period}`),
  getRecoveryRate: (period: string = "30d") =>
    request<import("@/types").TrendDataPoint[]>(`/analytics/recovery-rate?period=${period}`),
  getFailureReasons: () =>
    request<import("@/types").FailureBreakdown[]>("/analytics/failure-reasons"),
  getPaymentMethods: () =>
    request<{ method: string; count: number; amount: number; rate: number }[]>("/analytics/payment-methods"),
  getFullAnalytics: (period: string = "30d") =>
    request<import("@/types").AnalyticsData>(`/analytics?period=${period}`),
};

// ─── Settings ────────────────────────────────────────────

export const settingsApi = {
  get: () => request<Record<string, unknown>>("/settings"),
  update: (data: Record<string, unknown>) =>
    request<Record<string, unknown>>("/settings", {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
};
