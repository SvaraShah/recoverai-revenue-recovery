import { Router, Request, Response } from "express";
import { asyncHandler } from "../middleware/errorHandler";
import { dashboardService } from "../services/dashboardService";
import { transactionService } from "../services/transactionService";
import { recoveryService } from "../services/recoveryService";
import { campaignService } from "../services/campaignService";
import { insightService, analyticsService } from "../services/analyticsService";
import { getActiveEngineName } from "../ai/engine";
import { isGroqAvailable, GROQ_MODEL } from "../ai/groqClient";

const router = Router();

// ─── Dashboard ───────────────────────────────────────────

router.get(
  "/dashboard/overview",
  asyncHandler(async (_req, res) => {
    const data = await dashboardService.getOverview();
    res.json(data);
  })
);

router.get(
  "/dashboard/summary",
  asyncHandler(async (_req, res) => {
    const data = await dashboardService.getOverview();
    res.json(data);
  })
);

router.get(
  "/dashboard/trends",
  asyncHandler(async (req, res) => {
    const period = (req.query.period as string) || "30d";
    const data = await dashboardService.getTrends(period);
    res.json(data);
  })
);

router.get(
  "/dashboard/recent-activity",
  asyncHandler(async (_req, res) => {
    const data = await dashboardService.getRecentActivity();
    res.json(data);
  })
);

router.get(
  "/dashboard/failure-breakdown",
  asyncHandler(async (_req, res) => {
    const data = await dashboardService.getFailureBreakdown();
    res.json(data);
  })
);

// ─── Transactions ────────────────────────────────────────

router.get(
  "/transactions",
  asyncHandler(async (req, res) => {
    const data = await transactionService.getAll(req.query as any);
    res.json(data);
  })
);

router.get(
  "/transactions/:id",
  asyncHandler(async (req, res) => {
    const data = await transactionService.getById(req.params.id as string);
    if (!data) return res.status(404).json({ message: "Transaction not found" });
    res.json(data);
  })
);

router.post(
  "/transactions/:id/analyze",
  asyncHandler(async (req, res) => {
    const data = await recoveryService.analyzeTransaction(req.params.id as string);
    res.json(data);
  })
);

// ─── Recovery Opportunities ──────────────────────────────

router.get(
  "/recovery",
  asyncHandler(async (req, res) => {
    const data = await recoveryService.getAll(req.query as any);
    res.json(data);
  })
);

router.get(
  "/recovery/opportunities",
  asyncHandler(async (req, res) => {
    const data = await recoveryService.getAll(req.query as any);
    res.json(data);
  })
);

router.get(
  "/recovery/guardrails",
  asyncHandler(async (_req, res) => {
    res.json(appSettings);
  })
);

router.put(
  "/recovery/guardrails",
  asyncHandler(async (req, res) => {
    appSettings = { ...appSettings, ...req.body };
    res.json(appSettings);
  })
);

router.get(
  "/recovery/performance",
  asyncHandler(async (_req, res) => {
    const data = await recoveryService.getPerformanceMetrics();
    res.json(data);
  })
);

router.get(
  "/recovery/audit-log",
  asyncHandler(async (_req, res) => {
    const data = await recoveryService.getAuditLogs();
    res.json(data);
  })
);

router.get(
  "/recovery/batch-runs",
  asyncHandler(async (_req, res) => {
    const data = await recoveryService.getBatchRuns();
    res.json(data);
  })
);

router.get(
  "/recovery/batch-runs/:id",
  asyncHandler(async (req, res) => {
    const data = await recoveryService.getBatchRunById(req.params.id as string);
    if (!data) return res.status(404).json({ message: "Batch run not found" });
    res.json(data);
  })
);

router.post(
  "/recovery/batch-run",
  asyncHandler(async (req, res) => {
    const { batchSize, guardrailsEnabled, approvalRequired } = req.body;
    const data = await recoveryService.createBatchRun({
      batchSize: batchSize ? parseInt(batchSize) : 25,
      guardrailsEnabled: guardrailsEnabled !== false,
      approvalRequired: approvalRequired !== false,
    });
    res.json(data);
  })
);

router.get(
  "/recovery/:id",
  asyncHandler(async (req, res) => {
    const data = await recoveryService.getById(req.params.id as string);
    if (!data) return res.status(404).json({ message: "Recovery opportunity not found" });
    res.json(data);
  })
);

router.post(
  "/recovery/:id/execute",
  asyncHandler(async (req, res) => {
    const data = await recoveryService.executeRecovery(req.params.id as string);
    res.json(data);
  })
);

router.post(
  "/recovery/bulk-execute",
  asyncHandler(async (req, res) => {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids)) {
      return res.status(400).json({ message: "ids array is required" });
    }
    const data = await recoveryService.bulkExecute(ids);
    res.json(data);
  })
);

// ─── Campaigns ───────────────────────────────────────────

router.get(
  "/campaigns",
  asyncHandler(async (_req, res) => {
    const data = await campaignService.getAll();
    res.json(data);
  })
);

router.get(
  "/campaigns/:id",
  asyncHandler(async (req, res) => {
    const data = await campaignService.getById(req.params.id as string);
    if (!data) return res.status(404).json({ message: "Campaign not found" });
    res.json(data);
  })
);

router.post(
  "/campaigns",
  asyncHandler(async (req, res) => {
    const data = await campaignService.create(req.body);
    res.status(201).json(data);
  })
);

router.patch(
  "/campaigns/:id",
  asyncHandler(async (req, res) => {
    const data = await campaignService.update(req.params.id as string, req.body);
    res.json(data);
  })
);

// ─── Insights ────────────────────────────────────────────

router.get(
  "/insights",
  asyncHandler(async (req, res) => {
    const data = await insightService.getAll(req.query as any);
    res.json(data);
  })
);

router.post(
  "/insights/:id/dismiss",
  asyncHandler(async (req, res) => {
    const data = await insightService.dismiss(req.params.id as string);
    res.json(data);
  })
);

// ─── Analytics ───────────────────────────────────────────

router.get(
  "/analytics",
  asyncHandler(async (req, res) => {
    const period = (req.query.period as string) || "30d";
    const data = await analyticsService.getFullAnalytics(period);
    res.json(data);
  })
);

// ─── Settings ────────────────────────────────────────────

export let appSettings = {
  businessName: "RecoverAI Demo",
  currency: "INR",
  timezone: "Asia/Kolkata",
  autoExecuteThreshold: 80,
  maxRetryAttempts: 3,
  cooldownPeriodHours: 24,
  emailNotifications: true,
  webhookUrl: "",
  aiModelPreference: "auto", // "auto" selects groq if key is set, else mock
  confidenceThreshold: 0.7,
};

router.get("/settings", (_req: Request, res: Response) => {
  res.json({
    ...appSettings,
    aiModelPreference: getActiveEngineName() === "groq" ? `groq (${GROQ_MODEL})` : "mock-deterministic",
  });
});

router.patch("/settings", (req: Request, res: Response) => {
  appSettings = { ...appSettings, ...req.body };
  res.json(appSettings);
});

// ─── AI Status ───────────────────────────────────────────

router.get("/ai/status", (_req: Request, res: Response) => {
  res.json({
    engine: getActiveEngineName(),
    model: isGroqAvailable() ? GROQ_MODEL : null,
    available: isGroqAvailable(),
    // Never expose the API key
  });
});

export default router;
