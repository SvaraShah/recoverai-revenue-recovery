# RecoverAI — Autonomous AI Revenue Recovery Platform

[![Live Demo](https://img.shields.io/badge/Live_Demo-Vercel-000000?style=flat&logo=vercel&logoColor=white)](https://recoverai-revenue-recovery-five.vercel.app/)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=flat&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-61DAFB?style=flat&logo=react&logoColor=black)](https://react.dev/)
[![Express](https://img.shields.io/badge/Express-000000?style=flat&logo=express&logoColor=white)](https://expressjs.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?style=flat&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Prisma](https://img.shields.io/badge/Prisma-2D3748?style=flat&logo=prisma&logoColor=white)](https://www.prisma.io/)
[![Groq](https://img.shields.io/badge/Groq-F05032?style=flat&logo=lightning&logoColor=white)](https://groq.com/)

**Live Application URL**: [https://recoverai-revenue-recovery-five.vercel.app/](https://recoverai-revenue-recovery-five.vercel.app/)

> **Track**: Razorpay AI Builder Internship 2026 — Track 3 (AI Revenue Recovery)

---

**RecoverAI** is an AI-powered revenue recovery platform that autonomously analyzes failed payment transactions, determines intelligent recovery strategies, applies deterministic backend safety policies, executes eligible recovery actions, and records every operational decision in an immutable, auditable workflow.

> **Positioning**: RecoverAI is an **AI Agent system**, not simply a chatbot or static analytics dashboard. The agent proposes operational decisions, while a deterministic backend policy engine maintains final authority over execution.

---

## Architecture Diagram

```
User (Operations Console)
       ↓
RecoverAI Frontend (React / Vite / TypeScript)
       ↓  [REST API]
Express API Server (Node.js / TypeScript)
       ↓
AI Agent Engine (Groq API · Model: openai/gpt-oss-120b)
 ├── 1. Detect      (Ingest failed payment telemetry)
 ├── 2. Diagnose    (Groq root cause diagnosis)
 ├── 3. Score       (Multi-factor recovery scoring 0-100)
 ├── 4. Decide      (Intervention strategy selection)
 └── 5. Recommend  (Channel, timing delay, expected value)
       ↓
Deterministic Policy Safety Engine  <-- [FINAL AUTHORITY]
 ├── Rule 1: Retry attempt caps (Max 3 attempts)
 ├── Rule 2: Fraud & invalid card block (FRAUD_SUSPECTED / INVALID_CARD)
 ├── Rule 3: High-value merchant approval (>₹25,000 threshold)
 ├── Rule 4: Low confidence intercept (<50% threshold)
 ├── Rule 5: Customer outreach frequency cap (Max 6 failures)
 ├── Rule 6: Deduplication & state lock (RECOVERED state lock)
 └── Rule 7: Repeated attempt escalation policy
       ↓
Recovery Action Execution (Smart Retry / Payment Link / Outreach)
       ↓
Immutable Audit Trail Ledger & Live Analytics (PostgreSQL + Prisma)
```

---

## Why the Agent is Safe

> *"AI decides what may be worth doing; deterministic policies decide what is actually allowed to happen."*

1. **Bounded Autonomy**: AI recommendations are never automatically trusted. Every proposed recovery action must pass through 7 deterministic safety guardrails before execution.
2. **LLM Cannot Override Safety Rules**: Even if an LLM model recommends retrying a transaction, backend code interceptors override the action if safety rules are triggered.
3. **Deterministic Fraud Intercept**: Transactions flagged as `FRAUD_SUSPECTED` or `INVALID_CARD` are immediately set to `status = "STOPPED"` with `autoExecute = false`. Any attempt to execute a prohibited action returns **HTTP 400 Bad Request**.
4. **Human-in-the-Loop Approval**: High-value transactions (>₹25,000) are placed into `PENDING_APPROVAL` status, requiring explicit merchant authorization before execution.
5. **Full Auditability**: Every state transition, AI rationale, policy check, and outcome is logged to an immutable audit trail ledger.

---

## AI Agent Workflow

Every failed transaction passes through a 9-stage bounded agent lifecycle:

| Stage | Name | Operational Function |
| :--- | :--- | :--- |
| `1` | **DETECT** | Ingests payment failure telemetry (gateway response, payment method, customer history). |
| `2` | **DIAGNOSE** | Groq AI engine analyzes failure classification (e.g., `INSUFFICIENT_FUNDS`, `BANK_TIMEOUT`). |
| `3` | **SCORE** | Computes a 0–100 recovery score and confidence percentage based on historical profiles. |
| `4` | **DECIDE** | Selects optimal intervention strategy (`SMART_RETRY`, `PAYMENT_LINK`, `EMAIL_REMINDER`). |
| `5` | **POLICY CHECK** | Evaluates the proposed decision against 7 deterministic backend safety guardrails. |
| `6` | **ACT** | Dispatches recovery action if eligible, or suspends action for human approval/safety block. |
| `7` | **STOP / ESCALATE** | Transitions risk cases to `STOPPED` (fraud/limits) or `PENDING_APPROVAL` (>₹25,000). |
| `8` | **AUDIT** | Writes an immutable record to the audit trail with decision rationales and policy checks. |
| `9` | **MEASURE** | Tracks telemetry, realized revenue, and recovery lift metrics. |

---

## Deterministic Safety Guardrails

The backend enforces 7 strict rules in `recoveryService.ts`:

- **Rule 1: Retry Attempt Limits**: Limits retries to 3 attempts. Exceeding retries transitions opportunity to `STOPPED`.
- **Rule 2: Fraud & Invalid Card Protection**:
  - `failureReason === "FRAUD_SUSPECTED"` or `"INVALID_CARD"`
  - Immediately forces `status = "STOPPED"` and `autoExecute = false`.
  - Execution API returns **HTTP 400 Bad Request** (`POLICY BLOCKED: Recovery action prohibited for fraud/invalid-card risk`).
- **Rule 3: High-Value Transaction Protection**:
  - Transactions with amount `> ₹25,000`
  - Forces `status = "PENDING_APPROVAL"` and `autoExecute = false`.
  - Requires manual merchant authorization (`Approve & Execute`).
- **Rule 4: Confidence Threshold**: Confidence ratings below 70% prevent autonomous execution.
- **Rule 5: Customer Frequency Limit**: Customers with $\ge 6$ failed payments are stopped to prevent customer spam.
- **Rule 6: Deduplication Lock**: Transactions already marked `RECOVERED` block further outreach actions.
- **Rule 7: Escalation Policy**: Repeated failure attempts escalate opportunity to manual security review.

---

## AI & Groq Integration

- **Provider**: Groq Cloud AI Engine (`groq-sdk`)
- **Current Production Model**: `openai/gpt-oss-120b`
- **Output Format**: Enforced structured JSON via `response_format: { type: "json_object" }`
- **Security**: `GROQ_API_KEY` is strictly server-side only and never exposed to the client bundle or network payload.

---

## Core Features

- **Command Center Dashboard**: Aggregates real-time Revenue at Risk, Recovered Revenue, Recovery Rate, and Active Opportunities with performance trend charts.
- **Payment Operations Console**: Dense, searchable payment table with status filters, failure reason pills, score badges, and tabular amounts.
- **AI Analysis Right-Side Drawer**: Comprehensive inspection drawer featuring transaction summaries, root cause diagnoses, confidence metrics, and vertical agent workflow steppers.
- **Recovery Queue & Batch Execution**: Pipeline management allowing manual or batch execution of eligible recovery opportunities.
- **AI Insights Engine**: Dynamically generated root cause analyses, pattern detections, and recommendations.
- **Conversion Funnel Analytics**: Telemetry detailing conversion rates from Failed Payments $\rightarrow$ AI Analyzed $\rightarrow$ Opportunities $\rightarrow$ Outreach $\rightarrow$ Revenue Recovered using live database metrics.
- **Immutable Audit Trail**: Chronological event ledger tracking every AI decision, policy override, approval request, and recovery outcome.
- **Real-Time System Telemetry Notifications**: Header popover delivering instant notifications for policy blocks, human approval requests, and analysis events.
- **Global Search Console**: Keyboard-accessible (`⌘K`) debounced search across transaction IDs, customer names, and emails.

---

## Tech Stack

### Frontend
- **Framework**: React 19, TypeScript, Vite
- **Styling**: Tailwind CSS v4, Lucide Icons
- **Visualization**: Recharts (trend charts)

### Backend
- **Runtime**: Node.js, Express, TypeScript (`ts-node`)
- **Database ORM**: Prisma ORM
- **Database**: PostgreSQL (Render PostgreSQL in production)

### AI
- **SDK**: Groq SDK (`groq-sdk`)
- **Model**: `openai/gpt-oss-120b`

---

## API Overview

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/health` | Service health check |
| `GET` | `/api/ai/status` | Active AI engine status & model identifier |
| `GET` | `/api/transactions` | Paginated transaction listing with status & search filters |
| `POST` | `/api/transactions/:id/analyze` | Triggers Groq AI diagnosis and policy check for a transaction |
| `GET` | `/api/recovery` | Paginated recovery opportunities queue |
| `POST` | `/api/recovery/:id/execute` | Executes an eligible recovery opportunity (enforces guardrails) |
| `POST` | `/api/recovery/batch-run` | Executes batch recovery simulation |
| `GET` | `/api/recovery/performance` | Returns live conversion metrics and performance telemetry |
| `GET` | `/api/recovery/audit-log` | Returns chronological audit trail ledger entries |
| `GET` | `/api/recovery/guardrails` | Returns safety guardrail configuration parameters |

---

## Setup & Local Installation

### Prerequisites
- Node.js (v18+)
- PostgreSQL database instance

### Environment Setup

Create `server/.env`:
```env
PORT=3001
NODE_ENV=development
DATABASE_URL=postgresql://user:password@localhost:5432/recoverai
GROQ_API_KEY=your_groq_api_key_here
GROQ_MODEL=openai/gpt-oss-120b
```

Create `client/.env`:
```env
VITE_API_URL=http://localhost:3001
```

### Installation Steps

1. **Clone Repository**:
   ```bash
   git clone https://github.com/SvaraShah/recoverai-revenue-recovery.git
   cd recoverai-revenue-recovery
   ```

2. **Install Dependencies**:
   ```bash
   # Install root, server, and client dependencies
   npm install
   cd server && npm install
   cd ../client && npm install
   ```

3. **Database Setup & Seed**:
   ```bash
   cd ../server
   npx prisma db push
   npm run seed
   ```

4. **Start Application**:
   ```bash
   # Run both frontend and backend concurrently from root
   cd ..
   npm run dev
   ```
   - **Frontend Console**: [http://localhost:5173](http://localhost:5173)
   - **Backend API**: [http://localhost:3001/api](http://localhost:3001/api)

---

## Verification & Validation

The codebase has been verified against the following criteria:

- **Frontend Production Build**: `npm run build` in `client` compiles in 1.13s with **0 errors** (`Exit Code 0`).
- **Backend Production Build**: `npm run build` in `server` compiles with **0 errors** (`Exit Code 0`).
- **Groq API Model Connectivity**: Verified live model availability (`openai/gpt-oss-120b`) via `/api/ai/status`.
- **Fraud Safety Guardrail (Rule 2)**: Verified `FRAUD_SUSPECTED` and `INVALID_CARD` transactions return `status: "STOPPED"` and block execution with **HTTP 400 Bad Request**.
- **High-Value Guardrail (Rule 3)**: Verified transactions $> ₹25,000$ return `status: "PENDING_APPROVAL"` requiring merchant authorization.
- **Analytics Data Pipeline**: Verified conversion funnel metrics derive 100% from live PostgreSQL query aggregations.

---

## License & Internship Context

Developed for the **Razorpay AI Builder Internship Track 3 (AI Revenue Recovery)**.
