-- CreateTable
CREATE TABLE "merchants" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "industry" TEXT NOT NULL,
    "monthlyVolume" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Kolkata',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "merchants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customers" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "totalTransactions" INTEGER NOT NULL DEFAULT 0,
    "successfulPayments" INTEGER NOT NULL DEFAULT 0,
    "failedPayments" INTEGER NOT NULL DEFAULT 0,
    "totalSpent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "lastPaymentDate" TIMESTAMP(3),
    "riskScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "merchantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transactions" (
    "id" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "status" TEXT NOT NULL,
    "paymentMethod" TEXT NOT NULL,
    "gateway" TEXT NOT NULL,
    "failureReason" TEXT,
    "failureMessage" TEXT,
    "cardLast4" TEXT,
    "bankName" TEXT,
    "ipAddress" TEXT,
    "deviceType" TEXT,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "maxRetries" INTEGER NOT NULL DEFAULT 3,
    "metadata" JSONB,
    "customerId" TEXT NOT NULL,
    "merchantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recovery_opportunities" (
    "id" TEXT NOT NULL,
    "transactionId" TEXT NOT NULL,
    "recoveryScore" DOUBLE PRECISION NOT NULL,
    "estimatedRecoverableAmount" DOUBLE PRECISION NOT NULL,
    "expectedValue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "priority" TEXT NOT NULL DEFAULT 'MEDIUM',
    "recommendedAction" TEXT NOT NULL,
    "recommendedChannel" TEXT NOT NULL DEFAULT 'EMAIL',
    "recommendedDelay" INTEGER NOT NULL DEFAULT 0,
    "reasonCodes" TEXT NOT NULL DEFAULT '[]',
    "aiExplanation" TEXT NOT NULL DEFAULT '',
    "failureDiagnosis" TEXT NOT NULL,
    "diagnosisDetails" JSONB,
    "recommendedTiming" TIMESTAMP(3) NOT NULL,
    "timingRationale" TEXT,
    "status" TEXT NOT NULL DEFAULT 'IDENTIFIED',
    "aiConfidence" DOUBLE PRECISION NOT NULL,
    "autoExecute" BOOLEAN NOT NULL DEFAULT false,
    "executedAt" TIMESTAMP(3),
    "recoveredAmount" DOUBLE PRECISION,
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "lastAttemptAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "batchRunId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "recovery_opportunities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recovery_campaigns" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "targetCount" INTEGER NOT NULL DEFAULT 0,
    "recoveredCount" INTEGER NOT NULL DEFAULT 0,
    "recoveredAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalAtRisk" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "filters" JSONB,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "recovery_campaigns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "campaign_opportunities" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "opportunityId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'IDENTIFIED',
    "executedAt" TIMESTAMP(3),
    "result" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "campaign_opportunities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "details" JSONB,
    "outcome" TEXT,
    "userId" TEXT,
    "ipAddress" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_insights" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "data" JSONB,
    "actionable" BOOLEAN NOT NULL DEFAULT true,
    "actionUrl" TEXT,
    "dismissed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),

    CONSTRAINT "ai_insights_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recovery_batch_runs" (
    "id" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "totalTransactions" INTEGER NOT NULL DEFAULT 0,
    "eligibleTransactions" INTEGER NOT NULL DEFAULT 0,
    "attemptedRecoveries" INTEGER NOT NULL DEFAULT 0,
    "successfulRecoveries" INTEGER NOT NULL DEFAULT 0,
    "failedRecoveries" INTEGER NOT NULL DEFAULT 0,
    "stoppedRecoveries" INTEGER NOT NULL DEFAULT 0,
    "escalatedRecoveries" INTEGER NOT NULL DEFAULT 0,
    "totalRevenueAtRisk" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalExpectedRecovery" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalRecoveredRevenue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "recoveryRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "averageRecoveryTime" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "guardrailsEnabled" BOOLEAN NOT NULL DEFAULT true,
    "approvalRequired" BOOLEAN NOT NULL DEFAULT true,
    "results" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "recovery_batch_runs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "merchants_email_key" ON "merchants"("email");

-- CreateIndex
CREATE UNIQUE INDEX "transactions_externalId_key" ON "transactions"("externalId");

-- CreateIndex
CREATE INDEX "transactions_status_idx" ON "transactions"("status");

-- CreateIndex
CREATE INDEX "transactions_merchantId_idx" ON "transactions"("merchantId");

-- CreateIndex
CREATE INDEX "transactions_customerId_idx" ON "transactions"("customerId");

-- CreateIndex
CREATE INDEX "transactions_createdAt_idx" ON "transactions"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "recovery_opportunities_transactionId_key" ON "recovery_opportunities"("transactionId");

-- CreateIndex
CREATE INDEX "recovery_opportunities_status_idx" ON "recovery_opportunities"("status");

-- CreateIndex
CREATE INDEX "recovery_opportunities_recoveryScore_idx" ON "recovery_opportunities"("recoveryScore");

-- CreateIndex
CREATE INDEX "recovery_opportunities_recommendedAction_idx" ON "recovery_opportunities"("recommendedAction");

-- CreateIndex
CREATE UNIQUE INDEX "campaign_opportunities_campaignId_opportunityId_key" ON "campaign_opportunities"("campaignId", "opportunityId");

-- CreateIndex
CREATE INDEX "audit_logs_entityType_entityId_idx" ON "audit_logs"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "audit_logs_timestamp_idx" ON "audit_logs"("timestamp");

-- CreateIndex
CREATE INDEX "ai_insights_type_idx" ON "ai_insights"("type");

-- CreateIndex
CREATE INDEX "ai_insights_severity_idx" ON "ai_insights"("severity");

-- AddForeignKey
ALTER TABLE "customers" ADD CONSTRAINT "customers_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "merchants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "merchants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recovery_opportunities" ADD CONSTRAINT "recovery_opportunities_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "transactions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recovery_opportunities" ADD CONSTRAINT "recovery_opportunities_batchRunId_fkey" FOREIGN KEY ("batchRunId") REFERENCES "recovery_batch_runs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaign_opportunities" ADD CONSTRAINT "campaign_opportunities_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "recovery_campaigns"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaign_opportunities" ADD CONSTRAINT "campaign_opportunities_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "recovery_opportunities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
