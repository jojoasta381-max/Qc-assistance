# AWS Migration Blockers & Risk Register
**Project:** SpanQC / Wiring Diagram QC Assistant  
**Phase:** Phase 6 — Infrastructure Migration  

---

## 1. Blocker Inventory & Classification

| ID | Issue Description | Severity | Status | Resolution / Mitigation |
| :--- | :--- | :--- | :--- | :--- |
| **BLK-001** | Quoted environment variables in `.env` caused Prisma validation error during Docker startup | **P1** | **RESOLVED** | Added defensive quote sanitization (`.replace(/^["']\|["']$/g, '')`) in `src/lib/prisma.ts` and `src/lib/config/env-validator.ts`. |
| **BLK-002** | `getStorageProvider()` required static access keys, preventing ECS Task Role IAM resolution | **P1** | **RESOLVED** | Updated `src/lib/storage/storage-provider.ts` to detect `AWS_CONTAINER_CREDENTIALS_RELATIVE_URI` and `STORAGE_PROVIDER='s3'`. |
| **BLK-003** | Route 53 domain not yet delegated in AWS account `905418293374` | **P2** | **MITIGATED** | Direct ALB DNS endpoint is used for staging verification. Domain DNS cutover deferred until staging acceptance. |
| **BLK-004** | Billing status is non-live (`BILLING_STATUS = 'NOT_LIVE'`) | **P3** | **DOCUMENTED** | Razorpay test sandbox preserved. Live payments remain deactivated per product truth. |
| **BLK-005** | Real customer benchmark status is insufficient (`REAL_BENCHMARK_STATUS = 'INSUFFICIENT_DATA'`) | **P3** | **DOCUMENTED** | Benchmark state preserved; no synthetic claims allowed. |

---

## 2. Risk Classification Summary
- **P0 Blockers (Critical / Halting):** 0 Active
- **P1 Blockers (High / Workaround Available):** 0 Active (2 Resolved)
- **P2 Blockers (Medium / Non-blocking Staging):** 1 Mitigated
- **P3 Blockers (Low / Informational):** 2 Documented
