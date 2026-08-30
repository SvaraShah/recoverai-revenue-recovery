-- CreateTable
CREATE TABLE "recovery_batch_runs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" DATETIME,
    "totalTransactions" INTEGER NOT NULL DEFAULT 0,
    "eligibleTransactions" INTEGER NOT NULL DEFAULT 0,
    "attemptedRecoveries" INTEGER NOT NULL DEFAULT 0,
    "successfulRecoveries" INTEGER NOT NULL DEFAULT 0,
    "failedRecoveries" INTEGER NOT NULL DEFAULT 0,
    "stoppedRecoveries" INTEGER NOT NULL DEFAULT 0,
    "escalatedRecoveries" INTEGER NOT NULL DEFAULT 0,
    "totalRevenueAtRisk" REAL NOT NULL DEFAULT 0,
    "totalExpectedRecovery" REAL NOT NULL DEFAULT 0,
    "totalRecoveredRevenue" REAL NOT NULL DEFAULT 0,
    "recoveryRate" REAL NOT NULL DEFAULT 0,
    "averageRecoveryTime" REAL NOT NULL DEFAULT 0,
    "guardrailsEnabled" BOOLEAN NOT NULL DEFAULT true,
    "approvalRequired" BOOLEAN NOT NULL DEFAULT true,
    "results" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_recovery_opportunities" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "transactionId" TEXT NOT NULL,
    "recoveryScore" REAL NOT NULL,
    "estimatedRecoverableAmount" REAL NOT NULL,
    "expectedValue" REAL NOT NULL DEFAULT 0,
    "priority" TEXT NOT NULL DEFAULT 'MEDIUM',
    "recommendedAction" TEXT NOT NULL,
    "recommendedChannel" TEXT NOT NULL DEFAULT 'EMAIL',
    "recommendedDelay" INTEGER NOT NULL DEFAULT 0,
    "reasonCodes" TEXT NOT NULL DEFAULT '[]',
    "aiExplanation" TEXT NOT NULL DEFAULT '',
    "failureDiagnosis" TEXT NOT NULL,
    "diagnosisDetails" JSONB,
    "recommendedTiming" DATETIME NOT NULL,
    "timingRationale" TEXT,
    "status" TEXT NOT NULL DEFAULT 'IDENTIFIED',
    "aiConfidence" REAL NOT NULL,
    "autoExecute" BOOLEAN NOT NULL DEFAULT false,
    "executedAt" DATETIME,
    "recoveredAmount" REAL,
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "lastAttemptAt" DATETIME,
    "expiresAt" DATETIME NOT NULL,
    "batchRunId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "recovery_opportunities_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "transactions" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "recovery_opportunities_batchRunId_fkey" FOREIGN KEY ("batchRunId") REFERENCES "recovery_batch_runs" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_recovery_opportunities" ("aiConfidence", "attemptCount", "autoExecute", "createdAt", "diagnosisDetails", "estimatedRecoverableAmount", "executedAt", "expiresAt", "failureDiagnosis", "id", "lastAttemptAt", "recommendedAction", "recommendedTiming", "recoveredAmount", "recoveryScore", "status", "timingRationale", "transactionId", "updatedAt") SELECT "aiConfidence", "attemptCount", "autoExecute", "createdAt", "diagnosisDetails", "estimatedRecoverableAmount", "executedAt", "expiresAt", "failureDiagnosis", "id", "lastAttemptAt", "recommendedAction", "recommendedTiming", "recoveredAmount", "recoveryScore", "status", "timingRationale", "transactionId", "updatedAt" FROM "recovery_opportunities";
DROP TABLE "recovery_opportunities";
ALTER TABLE "new_recovery_opportunities" RENAME TO "recovery_opportunities";
CREATE UNIQUE INDEX "recovery_opportunities_transactionId_key" ON "recovery_opportunities"("transactionId");
CREATE INDEX "recovery_opportunities_status_idx" ON "recovery_opportunities"("status");
CREATE INDEX "recovery_opportunities_recoveryScore_idx" ON "recovery_opportunities"("recoveryScore");
CREATE INDEX "recovery_opportunities_recommendedAction_idx" ON "recovery_opportunities"("recommendedAction");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
