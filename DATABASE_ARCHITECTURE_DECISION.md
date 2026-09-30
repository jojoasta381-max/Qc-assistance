# SpanQC — Database Architecture Decision Record (ADR)
## Evaluation of PostgreSQL Persistence Options for SpanQC

**Status:** `DECIDED`  
**Classification:** **`KEEP_NEON_FOR_NOW`**  
**Region Context:** Application deployed in AWS ECS Fargate `ap-south-1` (Mumbai). Neon database currently provisioned in `us-east-2` (Ohio).

---

## 1. Executive Summary

During Phase 6 infrastructure migration, SpanQC migrated container compute, routing, storage, and secrets from Vercel to native AWS (`ap-south-1`), while deliberately preserving external **Neon PostgreSQL** persistence.

This document formally evaluates three architectural options:
- **Option A:** Keep Neon PostgreSQL (Serverless External)
- **Option B:** Migrate to AWS RDS PostgreSQL (`ap-south-1`)
- **Option C:** Migrate to Amazon Aurora PostgreSQL Serverless v2 (`ap-south-1`)

Additionally, the role of **Redis / Valkey** is evaluated as a complementary caching and queuing layer.

---

## 2. Options Comparison Matrix

| Evaluation Dimension | Option A: Neon PostgreSQL (Current) | Option B: AWS RDS PostgreSQL (Single/Multi-AZ) | Option C: Amazon Aurora Serverless v2 |
| :--- | :--- | :--- | :--- |
| **Co-location / Latency** | Cross-region (`ap-south-1` to `us-east-2`), ~190–215 ms RTT | Same-region (`ap-south-1`), < 1–2 ms intra-VPC RTT | Same-region (`ap-south-1`), < 1 ms intra-VPC RTT |
| **Estimated Monthly Cost (Staging)** | **$0.00 – $19.00 / mo** (Free / Launch Tier) | **~$35.00 / mo** (`db.t4g.micro` + 20GB GP3 + automated backup) | **~$48.00 / mo** (Min 0.5 ACU + storage) |
| **Estimated Monthly Cost (Production HA)**| **~$49.00 – $99.00 / mo** (Scale Tier) | **~$75.00 – $95.00 / mo** (`db.t4g.small` Multi-AZ + RDS Proxy) | **~$110.00 – $145.00 / mo** (0.5–4.0 ACU HA + distributed storage) |
| **Connection Pooling** | Built-in native PgBouncer pooler (`-pooler` endpoint) | Requires AWS RDS Proxy or self-hosted PgBouncer for serverless bursts | Native high connection ceiling; RDS Proxy optional |
| **Connection Limits** | Up to 10,000 pooled connections | 50–100 (`db.t4g.micro`) up to 400 (`db.t4g.small`) | Scales dynamically with ACU |
| **Prisma Compatibility** | 100% verified with pooled + direct URL configuration | 100% standard PostgreSQL driver | 100% standard PostgreSQL driver |
| **Storage & Scaling** | Auto-scaling serverless storage (up to 1 TB) | Auto-scaling GP3 storage volumes | Distributed 6-way replicated storage across 3 AZs |
| **Backups & Recovery** | Instant branching, continuous PITR | Automated daily snapshots + transaction logs (1–35 days) | Continuous automated backup with 1-second PITR |
| **Availability (SLA)** | 99.95% | 99.95% (Multi-AZ) | 99.99% (Multi-AZ) |
| **Migration Risk / Effort** | **ZERO RISK** (Already working, zero schema or data drift) | **MEDIUM** (`pg_dump`/`pg_restore`, downtime window required) | **MEDIUM-HIGH** (Data migration + cluster sizing + cost tuning) |

---

## 3. Analysis & Key Trade-Offs

### 3.1 Network Latency Impact on Document Processing
Currently, ECS tasks in Mumbai execute SQL round-trips to Neon in Ohio.
- **Measured Batch Analysis Time (Phase 6):** 29.98 seconds for complete end-to-end PDF parse, netlist extraction, and 20 QC rules.
- **Latency Breakdown:** The deterministic rule engine runs largely in Node.js memory on the extracted netlist; database interactions occur during preflight validation, quota reservation, ledger creation, and bulk findings persistence.
- **Projection on Local RDS (`ap-south-1`):** Co-locating PostgreSQL in `ap-south-1` will reduce total roundtrip latency by ~180ms per query, shaving approximately 3–5 seconds off large inspection jobs. However, current staging performance (29.9s) is well within acceptance limits.

### 3.2 Stability & Isolation
Keeping Neon isolated from AWS infrastructure ensures that AWS compute updates, rolling deployments, or Terraform changes cannot accidentally corrupt or delete database state. Furthermore, Neon's instant branching allows creating zero-copy database branches for isolated staging integration tests.

### 3.3 Rollback Safety
Because Vercel is retained as hot standby, keeping the shared Neon database guarantees that if ECS Fargate ever experiences an outage, DNS can immediately point back to Vercel without data desynchronization or split-brain state.

---

## 4. Evaluation of Redis / Valkey

### Clarification of Role:
Redis / Valkey is **NOT a replacement for PostgreSQL**. SpanQC requires strict ACID transactional guarantees for tenant isolation, organization members, usage ledgers, and immutable report records.

### Future Role of Redis / Valkey (Phase 8+):
When SpanQC scales to multi-replica production Fargate tasks, Redis / Valkey will be introduced for:
1. **Background Job Queues:** BullMQ distributed worker queue (decoupling synchronous PDF extraction from API request lifecycle).
2. **Distributed Locks:** Preventing race conditions during document re-analysis.
3. **Session Cache:** Rapid lookup of organization roles and active quotas.
4. **Rate Limiting:** Distributed token-bucket rate limiting per tenant.

**Decision on Redis / Valkey:** Do NOT deploy during Phase 6.5. Current single-replica staging handles queuing via PostgreSQL transactional status transitions cleanly.

---

## 5. Architectural Decision & Recommendation

### Recommendation: **`KEEP_NEON_FOR_NOW`**

### Rationale:
1. **Zero Downtime & Zero Regression:** Eliminates simultaneous database migration risk while the newly provisioned ECS Fargate cluster is stabilized.
2. **Rollback Guarantee:** Preserves 100% interoperability with Vercel rollback deployment.
3. **Cost-Conscious:** Avoids adding ~$35–$120/month of idle RDS / Aurora cost during testing.
4. **Planned Migration Window:** When SpanQC advances toward customer pilot readiness (Phase 9), a scheduled, zero-downtime replication to an `ap-south-1` RDS PostgreSQL Multi-AZ instance will be executed.
