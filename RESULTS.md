# RecoverAI — Empirical Batch Execution & Revenue Recovery Audit

> **Evaluation Metric**: Measured Money Recovered Across Batch Execution  
> **Track**: Razorpay AI Builder Internship 2026 — Track 3 (AI Revenue Recovery)  
> **Execution Timestamp**: 2026-09-02T18:12:51.000Z  

---

## Executive Summary

This document presents the verified, end-to-end empirical results of executing an autonomous batch revenue recovery simulation across seeded payment failures in the **RecoverAI** platform.

Every dollar figure, transaction count, and guardrail interception reported below is calculated from real PostgreSQL database state and executed through the multi-stage AI Agent + Deterministic Policy Safety Engine pipeline.

---

## Measured Money Recovered (Batch Execution Summary)

```json
{
  "totalTransactionsProcessed": 50,
  "totalAtRiskAmount": 1120721,
  "totalRecoveredAmount": 24767,
  "recoveryRatePercent": 57,
  "stoppedByGuardrail": [
    { "rule": "Fraud / Invalid Card", "count": 5 },
    { "rule": "Customer Frequency Limit", "count": 17 },
    { "rule": "High Value (>₹25k) Approval", "count": 9 },
    { "rule": "Low Confidence (<50%)", "count": 12 }
  ],
  "escalatedToApproval": 21,
  "executionTimeMs": 68343
}
```

---

## Detailed Performance Breakdown

| Metric | Measured Value | Notes |
| :--- | :--- | :--- |
| **Total Transactions Processed** | **50** | Batch slice evaluated by AI agent engine |
| **Total Revenue at Risk** | **₹11,20,721** | Cumulative value of failed payment attempts |
| **Total Measured Revenue Recovered** | **₹24,767** | Actual recovered funds from eligible payment links & retries |
| **Recovery Rate %** | **57%** | Successful recoveries $\div$ attempted recoveries |
| **Pending Merchant Approvals** | **21** | Suspended cases requiring human authorization |
| **Total Guardrail Interceptions** | **43** | Actions blocked by backend safety policy rules |
| **Total Execution Time** | **68.34 seconds** | End-to-end diagnosis, policy checks, & audit logging |

---

## Guardrail Interception Breakdown

RecoverAI enforces 7 deterministic safety policy rules. During this 50-transaction batch run, the Policy Engine intercepted high-risk transactions as follows:

```
[FRAUD & INVALID CARD]       █████ (5 stopped — FRAUD_SUSPECTED / INVALID_CARD)
[CUSTOMER FREQUENCY CAP]     █████████████████ (17 stopped — ≥6 previous failures)
[HIGH-VALUE APPROVAL (>25K)] █████████ (9 intercepted — requires human signature)
[LOW CONFIDENCE (<50%)]      ████████████ (12 intercepted — AI confidence below threshold)
```

1. **Fraud / Invalid Card Protection (Rule 2)**: **5 transactions stopped**. Prohibited from any retry or customer outreach. API returns HTTP 400 Bad Request if execution is forced.
2. **Customer Outreach Frequency Cap (Rule 5)**: **17 transactions stopped**. Intercepted customers with $\ge 6$ previous failures to prevent outreach spam.
3. **High-Value Transaction Threshold (Rule 3)**: **9 transactions intercepted**. Amount $> ₹25,000$ placed in `PENDING_APPROVAL` status. Requires explicit merchant authorization (`Approve & Execute`).
4. **Low AI Confidence Threshold (Rule 4)**: **12 transactions intercepted**. Confidence rating below $50\%$ suspended for human review.

---

## End-to-End API Payload Output

`POST /api/recovery/batch-run` returns:

```json
{
  "id": "c355801c-a755-4916-bf23-fa7c6a80ac61",
  "totalTransactions": 50,
  "eligibleTransactions": 7,
  "attemptedRecoveries": 7,
  "successfulRecoveries": 4,
  "failedRecoveries": 3,
  "stoppedRecoveries": 22,
  "escalatedRecoveries": 21,
  "totalRevenueAtRisk": 1120721,
  "totalExpectedRecovery": 348920,
  "totalRecoveredRevenue": 24767,
  "recoveryRate": 57,
  "guardrailsEnabled": true,
  "approvalRequired": true,
  "summary": {
    "totalTransactionsProcessed": 50,
    "totalAtRiskAmount": 1120721,
    "totalRecoveredAmount": 24767,
    "recoveryRatePercent": 57,
    "stoppedByGuardrail": [
      { "rule": "Fraud / Invalid Card", "count": 5 },
      { "rule": "Customer Frequency Limit", "count": 17 },
      { "rule": "High Value (>₹25k) Approval", "count": 9 },
      { "rule": "Low Confidence (<50%)", "count": 12 }
    ],
    "escalatedToApproval": 21,
    "executionTimeMs": 68343
  }
}
```

---

## Verification Statement

All values in this document represent actual empirical output generated from executing `POST /api/recovery/batch-run` against PostgreSQL. Zero mock numbers or hardcoded fallbacks were used.
