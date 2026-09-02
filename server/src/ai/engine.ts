import { analyzeFailure } from "./analyzer";
import { scoreRecoveryProbability } from "./scorer";
import { recommendAction } from "./recommender";
import { determineOptimalTiming } from "./scheduler";
import { isGroqAvailable, logGroqStatus } from "./groqClient";
import { GroqRecoveryAIEngine } from "./groqEngine";
import {
  IRecoveryAIEngine,
  TransactionContext,
  CustomerContext,
  FailureAnalysis,
  RecoveryScore,
  ActionRecommendation,
  TimingRecommendation,
  RecoveryAction,
} from "./types";

/**
 * MockRecoveryAIEngine — Deterministic AI engine for revenue recovery.
 *
 * Implements the IRecoveryAIEngine interface using rule-based,
 * deterministic logic. Serves as the fallback when Groq is unavailable.
 */
class MockRecoveryAIEngine implements IRecoveryAIEngine {
  async analyzeFailure(transaction: TransactionContext): Promise<FailureAnalysis> {
    await this.simulateLatency(50, 150);
    return analyzeFailure(transaction);
  }

  async scoreRecoveryProbability(
    transaction: TransactionContext,
    customer: CustomerContext
  ): Promise<RecoveryScore> {
    await this.simulateLatency(50, 150);
    return scoreRecoveryProbability(transaction, customer);
  }

  async recommendAction(
    analysis: FailureAnalysis,
    score: RecoveryScore,
    transaction: TransactionContext
  ): Promise<ActionRecommendation> {
    await this.simulateLatency(50, 150);
    return recommendAction(analysis, score, transaction);
  }

  async determineOptimalTiming(
    transaction: TransactionContext,
    customer: CustomerContext,
    action: RecoveryAction
  ): Promise<TimingRecommendation> {
    await this.simulateLatency(30, 100);
    return determineOptimalTiming(transaction, customer, action);
  }

  private simulateLatency(minMs: number, maxMs: number): Promise<void> {
    const delay = Math.random() * (maxMs - minMs) + minMs;
    return new Promise((resolve) => setTimeout(resolve, delay));
  }
}

/**
 * Full pipeline: run all AI steps on a transaction and return combined results.
 */
export async function runFullAnalysis(
  engine: IRecoveryAIEngine,
  transaction: TransactionContext,
  customer: CustomerContext
) {
  const analysis = await engine.analyzeFailure(transaction);
  const score = await engine.scoreRecoveryProbability(transaction, customer);
  const action = await engine.recommendAction(analysis, score, transaction);
  const timing = await engine.determineOptimalTiming(
    transaction,
    customer,
    action.primaryAction
  );

  return {
    analysis,
    score,
    action,
    timing,
  };
}

// ─── Factory ─────────────────────────────────────────────

let engineInstance: IRecoveryAIEngine | null = null;

/**
 * Creates or returns the AI engine instance.
 * - If GROQ_API_KEY is set → GroqRecoveryAIEngine (real LLM)
 * - Otherwise → MockRecoveryAIEngine (deterministic fallback)
 */
export function createAIEngine(): IRecoveryAIEngine {
  if (!engineInstance) {
    if (isGroqAvailable()) {
      engineInstance = new GroqRecoveryAIEngine();
    } else {
      engineInstance = new MockRecoveryAIEngine();
    }
    logGroqStatus();
  }
  return engineInstance;
}

/**
 * Returns the name of the currently active AI engine.
 */
export function getActiveEngineName(): "groq" | "mock" {
  return isGroqAvailable() ? "groq" : "mock";
}

export { IRecoveryAIEngine };
