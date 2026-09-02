import { callGroq, isGroqAvailable } from "./groqClient";

/**
 * Groq-powered AI insight generator.
 *
 * Analyzes actual transaction and recovery data from the database
 * and generates real, dynamic insights using Groq LLM reasoning.
 *
 * Includes a TTL-based cache to avoid excessive API calls.
 */

interface InsightInput {
  totalTransactions: number;
  failedTransactions: number;
  failureBreakdown: { reason: string; count: number; amount: number }[];
  recoveryStats: {
    total: number;
    recovered: number;
    stopped: number;
    escalated: number;
    failed: number;
    totalRevenueAtRisk: number;
    totalRecovered: number;
  };
  recentPatterns: {
    topGateway: string;
    topPaymentMethod: string;
    avgRecoveryScore: number;
    highValueCount: number;
    highValueAmount: number;
  };
  batchRunStats: {
    totalRuns: number;
    lastRunRecoveryRate: number;
    lastRunRecovered: number;
  };
}

interface GeneratedInsight {
  id: string;
  type: "TREND" | "ANOMALY" | "RECOMMENDATION" | "PATTERN";
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  title: string;
  description: string;
  data: Record<string, unknown>;
  actionable: boolean;
  actionUrl: string | null;
  dismissed: boolean;
  createdAt: Date;
  aiEngine: "groq";
}

// ─── Cache ───────────────────────────────────────────────

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
let cachedInsights: GeneratedInsight[] | null = null;
let cacheTimestamp = 0;

function isCacheValid(): boolean {
  return cachedInsights !== null && Date.now() - cacheTimestamp < CACHE_TTL_MS;
}

// ─── Generator ───────────────────────────────────────────

export async function generateGroqInsights(
  data: InsightInput
): Promise<GeneratedInsight[]> {
  // Return cached if valid
  if (isCacheValid()) {
    return cachedInsights!;
  }

  if (!isGroqAvailable()) {
    return [];
  }

  try {
    const systemPrompt = `You are an AI analyst for an Indian payment revenue recovery platform called RecoverAI. You analyze real transaction and recovery data to generate actionable business insights.

You MUST respond with a valid JSON object containing an "insights" array. Each insight MUST match this structure:
{
  "insights": [
    {
      "type": "<one of: TREND, ANOMALY, RECOMMENDATION, PATTERN>",
      "severity": "<one of: CRITICAL, HIGH, MEDIUM, LOW>",
      "title": "<concise insight title, max 80 chars>",
      "description": "<2-4 sentence detailed explanation with specific numbers from the data>",
      "actionable": <true or false>,
      "actionUrl": "<one of: /transactions, /recovery, /campaigns, /analytics, /settings, or null>"
    }
  ]
}

Rules:
- Generate 3-5 insights based on the ACTUAL data provided
- Every number in your descriptions must come from the actual data — do NOT invent statistics
- Focus on: failure trends, recovery opportunities, revenue at risk, actionable recommendations
- Insights should be specific to the Indian payment ecosystem (UPI, Razorpay, INR amounts)
- Use ₹ symbol for currency amounts
- severity=CRITICAL only for truly urgent issues (>30% failure spikes, large revenue at risk)
- Be direct and business-focused, not generic`;

    const failureText = data.failureBreakdown
      .map((f) => `  ${f.reason}: ${f.count} failures, ₹${f.amount.toLocaleString("en-IN")} at risk`)
      .join("\n");

    const userPrompt = `Analyze this real transaction and recovery data and generate insights:

TRANSACTION OVERVIEW:
- Total Transactions: ${data.totalTransactions}
- Failed Transactions: ${data.failedTransactions}
- Failure Rate: ${data.totalTransactions > 0 ? ((data.failedTransactions / data.totalTransactions) * 100).toFixed(1) : 0}%

FAILURE BREAKDOWN:
${failureText}

RECOVERY PERFORMANCE:
- Total Recovery Opportunities: ${data.recoveryStats.total}
- Successfully Recovered: ${data.recoveryStats.recovered}
- Stopped by Guardrails: ${data.recoveryStats.stopped}
- Escalated: ${data.recoveryStats.escalated}
- Failed Recoveries: ${data.recoveryStats.failed}
- Total Revenue at Risk: ₹${data.recoveryStats.totalRevenueAtRisk.toLocaleString("en-IN")}
- Total Recovered Revenue: ₹${data.recoveryStats.totalRecovered.toLocaleString("en-IN")}
- Recovery Rate: ${data.recoveryStats.total > 0 ? ((data.recoveryStats.recovered / data.recoveryStats.total) * 100).toFixed(1) : 0}%

PATTERNS:
- Top Gateway: ${data.recentPatterns.topGateway}
- Top Payment Method: ${data.recentPatterns.topPaymentMethod}
- Average Recovery Score: ${data.recentPatterns.avgRecoveryScore}
- High-Value Transactions (>₹25,000): ${data.recentPatterns.highValueCount} totaling ₹${data.recentPatterns.highValueAmount.toLocaleString("en-IN")}

BATCH RUNS:
- Total Batch Runs: ${data.batchRunStats.totalRuns}
- Last Run Recovery Rate: ${data.batchRunStats.lastRunRecoveryRate}%
- Last Run Recovered: ₹${data.batchRunStats.lastRunRecovered.toLocaleString("en-IN")}

Generate 3-5 insights based ONLY on this data. Every statistic you mention must come from the numbers above.`;

    const raw = await callGroq<any>({ systemPrompt, userPrompt });

    if (!Array.isArray(raw.insights)) {
      console.warn("⚠️ Groq insights response missing 'insights' array");
      return [];
    }

    const validTypes = ["TREND", "ANOMALY", "RECOMMENDATION", "PATTERN"];
    const validSeverities = ["CRITICAL", "HIGH", "MEDIUM", "LOW"];
    const validUrls = ["/transactions", "/recovery", "/campaigns", "/analytics", "/settings", null];

    const insights: GeneratedInsight[] = raw.insights
      .filter((i: any) =>
        validTypes.includes(i.type) &&
        validSeverities.includes(i.severity) &&
        typeof i.title === "string" &&
        typeof i.description === "string"
      )
      .slice(0, 5)
      .map((i: any, idx: number) => ({
        id: `groq-insight-${Date.now()}-${idx}`,
        type: i.type,
        severity: i.severity,
        title: i.title.slice(0, 120),
        description: i.description,
        data: { aiEngine: "groq", generatedAt: new Date().toISOString() },
        actionable: typeof i.actionable === "boolean" ? i.actionable : false,
        actionUrl: validUrls.includes(i.actionUrl) ? i.actionUrl : null,
        dismissed: false,
        createdAt: new Date(),
        aiEngine: "groq" as const,
      }));

    // Update cache
    cachedInsights = insights;
    cacheTimestamp = Date.now();

    return insights;
  } catch (err) {
    console.warn("⚠️ Groq insight generation failed:", (err as Error).message);
    return [];
  }
}

/** Clear the insight cache (useful after new analysis or batch runs) */
export function clearInsightCache(): void {
  cachedInsights = null;
  cacheTimestamp = 0;
}
