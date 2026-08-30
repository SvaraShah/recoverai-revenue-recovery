import { analyzeFailure } from "./analyzer";
import { scoreRecoveryProbability } from "./scorer";
import { recommendAction } from "./recommender";
import { determineOptimalTiming } from "./scheduler";
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
 * deterministic logic. Designed to be a drop-in replacement target
 * for an LLM-backed engine.
 *
 * To swap for a real LLM:
 * 1. Create a new class implementing IRecoveryAIEngine
 * 2. Replace the `createAIEngine()` factory call
 * 3. All callers use the interface — no changes needed
 */
class MockRecoveryAIEngine implements IRecoveryAIEngine {
  async analyzeFailure(transaction: TransactionContext): Promise<FailureAnalysis> {
    // Simulate async LLM call latency
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

export function createAIEngine(): IRecoveryAIEngine {
  if (!engineInstance) {
    engineInstance = new MockRecoveryAIEngine();
  }
  return engineInstance;
}

export { IRecoveryAIEngine };
