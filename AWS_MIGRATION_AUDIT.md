# AWS Infrastructure Migration Forensic Audit
**Project:** SpanQC / Wiring Diagram QC Assistant  
**Date:** September 30, 2026  
**Target AWS Region:** `ap-south-1` (Mumbai)  
**AWS Account ID:** `905418293374`  
**IAM User:** `devops-asta`  
**Migration Phase:** Phase 6 — Vercel to AWS ECS Fargate  

---

## 1. Executive Summary

This forensic audit evaluates the readiness of the frozen Phase 5.5 / demo-ready codebase for migration from Vercel to native AWS infrastructure (ECS Fargate, ALB, ECR, S3, Secrets Manager, CloudWatch).

The audit confirms that the application has **zero runtime dependencies on Vercel proprietary APIs** (no `@vercel/blob`, `@vercel/kv`, `@vercel/postgres`, or `@vercel/analytics`). It is a standard Node.js Next.js 16.3.6 App Router application backed by Prisma ORM and external Neon Serverless PostgreSQL. With minimal configuration additions (`output: 'standalone'` in `next.config.ts`, ECS Task Role IAM credential resolution in `storage-provider.ts`, and least-privilege IAM policies), the application can be packaged into a minimal multi-stage Docker container and orchestrated on AWS ECS Fargate.

---

## 2. Current Architecture vs. Target AWS Architecture

```
CURRENT (STAGING / FALLBACK):
User / Client ──► Vercel Edge Ingress ──► Next.js Serverless Function ──► Neon PostgreSQL
                                                                       └──► Local/S3 Storage

TARGET AWS ARCHITECTURE:
User / Client ──► Route 53 (staging.spanqc.com) / ALB DNS
                         │
                         ▼
                 AWS ALB (Port 80/443, SSL/TLS Termination)
                         │
                         ▼ (HTTP :3000, Security Group Gated)
                 ECS Fargate Service (Next.js Standalone Container)
                  ├── Task Execution Role (ECR pull, CloudWatch logs, Secrets fetch)
                  └── Task IAM Role (Private S3 read/write)
                         │
         ┌───────────────┼───────────────┐
         ▼               ▼               ▼
     Neon DB         Private S3    Secrets Manager
 (US-East-2 / Neon) (ap-south-1)     (ap-south-1)
```

---

## 3. Forensic Codebase Audit Findings

### 3.1 Runtime & Framework
- **Framework:** Next.js `16.3.6` App Router with React `19.2.8` and Turbopack.
- **Node.js Target:** Node.js `>= 20.9.0` (LTS 20 / 22 compatible).
- **Compilation:** Production Turbopack build succeeds cleanly with 48/48 routes (static + dynamic).
- **TypeScript & Lint:** 0 TypeScript compile errors (`npx tsc --noEmit`); 0 lint errors with 310 legacy warnings (`npm run lint`).
- **Tests:** 116 / 116 automated tests pass across all test suites (`npm test`).

### 3.2 Vercel Dependencies
- **Runtime Code:** **ZERO** dependencies on Vercel runtime.
- **Build / Tooling:** `vercel` CLI version `^60.1.3` is installed in `devDependencies` for CLI deploys.
- **Project Metadata:** `.vercel/project.json` links the repo to Vercel project `prj_2j78jB4uL2jP8kXjWkC7`.
- **Verdict:** Safe for containerization; no proprietary lock-in.

### 3.3 Storage Subsystem & S3 Integration
- **SDK:** `@aws-sdk/client-s3` (`^3.1141.0`) and `@aws-sdk/s3-request-presigner` (`^3.1141.0`) are already installed and implemented in `src/lib/storage/storage-provider.ts`.
- **Current Behavior:** `getStorageProvider()` selects `S3StorageProvider` if `AWS_S3_BUCKET`, `AWS_ACCESS_KEY_ID`, and `AWS_SECRET_ACCESS_KEY` are defined.
- **Fargate IAM Enhancement Needed:** On AWS ECS Fargate, best practice is to assign an IAM Task Role and let the AWS SDK resolve credentials from the container metadata environment (`AWS_CONTAINER_CREDENTIALS_RELATIVE_URI`). `getStorageProvider()` must be enhanced to instantiate `S3StorageProvider` when `AWS_S3_BUCKET` is configured even if static access keys are absent.

### 3.4 Database Subsystem
- **Provider:** PostgreSQL via `@prisma/client` (`^6.4.0`).
- **Instance:** Neon Serverless PostgreSQL (`ep-old-cell-b4j92zqi-pooler.c-6.us-east-2.aws.neon.tech`).
- **Connection Mode:** Pooled connection via `DATABASE_URL` with SSL mode `require`; direct connection via `DIRECT_URL`.
- **Schema Management:** Prisma schema validated (`npx prisma validate`); currently managed via `prisma db push`.
- **Directive Compliance:** Neon PostgreSQL remains external; no RDS migration during Phase 6.

### 3.5 Health & Readiness Endpoints
- **Liveness:** `GET /api/health` probes `SELECT 1` on database and returns HTTP 200 `{ status: "ok" }` or HTTP 503 `{ status: "degraded" }`.
- **Readiness:** `GET /api/ready` probes database readiness and returns HTTP 200 `{ ready: true }` or HTTP 503 `{ ready: false }`.
- **ALB Suitability:** `GET /api/health` is fully suitable as the ALB health check endpoint (fast, unauthenticated, non-sensitive).

### 3.6 Security & Authentication
- **Session Tokens:** HMAC SHA-256 tokens stored in HTTP-only `qc_session_token` cookie.
- **RBAC:** 11 hierarchical roles with granular permission checks in `src/lib/auth-guard.ts`.
- **Tenant Isolation:** Tenant boundary strictly enforced in database queries and S3 key namespaces (`organizations/{orgId}/projects/{projId}/documents/{docId}/...`).
- **SSRF:** Validated in `src/lib/security/ssrf-validator.ts` (blocks private CIDRs, loopbacks, cloud metadata `169.254.169.254`).

---

## 4. Required AWS Services & Configurations

| AWS Service | Configuration Details | Purpose |
| :--- | :--- | :--- |
| **Amazon ECR** | Repository `spanqc-staging` in `ap-south-1` | Immutable Docker image storage tagged with Git commit SHA |
| **Amazon S3** | `spanqc-staging-documents-905418293374` | Private document and report storage with SSE-S3 encryption and Block Public Access |
| **AWS Secrets Manager** | `spanqc/staging/app-secrets` in `ap-south-1` | Secure injection of `DATABASE_URL`, `AUTH_SECRET`, etc. |
| **AWS IAM** | Separate Task Execution Role and Task Role | Least-privilege IAM policies without `AdministratorAccess` |
| **Amazon ECS** | Fargate Cluster `spanqc-staging-cluster` | Serverless container compute running Next.js standalone |
| **AWS ALB** | Internet-facing ALB in `ap-south-1` across 3 AZs | HTTP/HTTPS routing, health checks, SSL termination |
| **CloudWatch Logs** | `/ecs/spanqc-staging` log group | Structured container logs with 14-day retention |
| **Route 53 / ACM** | Prepared for `staging.<domain>` | Custom domain and TLS certificate management |

---

## 5. Environment Variables & Secret Separation

### Public / Runtime Non-Secrets (ECS Environment Variables)
- `NODE_ENV = "production"`
- `APP_MODE = "PRODUCTION"`
- `PORT = "3000"`
- `HOSTNAME = "0.0.0.0"`
- `AWS_REGION = "ap-south-1"`
- `AWS_S3_BUCKET = "spanqc-staging-documents-905418293374"`
- `BILLING_STATUS = "NOT_LIVE"`

### Sensitive Production Secrets (AWS Secrets Manager)
- `DATABASE_URL` (Neon PostgreSQL pooled connection string)
- `DIRECT_URL` (Neon PostgreSQL direct connection string)
- `AUTH_SECRET` (HMAC SHA-256 key, cryptographically random, >= 32 characters)
- `RAZORPAY_KEY_ID` (`rzp_test_*`, non-live)
- `RAZORPAY_KEY_SECRET` (non-live)
- `RAZORPAY_WEBHOOK_SECRET` (non-live)

---

## 6. Networking & Cost Optimization Strategy

### Staging Network Design (Cost-Conscious)
- **VPC:** Default VPC `vpc-04633279bc7985525` (CIDR `172.31.0.0/16`) in `ap-south-1`.
- **Subnets:** 3 public subnets in `ap-south-1a`, `ap-south-1b`, `ap-south-1c`.
- **ALB Security Group:**
  - Ingress: Port 80 (HTTP) from `0.0.0.0/0`, Port 443 (HTTPS) from `0.0.0.0/0`.
  - Egress: Port 3000 to ECS Security Group.
- **ECS Security Group:**
  - Ingress: Port 3000 strictly restricted to ALB Security Group (`sg-alb`).
  - Egress: Outbound to internet gateway (for Neon PostgreSQL port 5432, S3/SecretsManager/CloudWatch HTTPS port 443).
- **Cost Saving Decision:** Avoiding NAT Gateway saves **~$65-70/month** in staging while preserving strict security (direct inbound to ECS tasks from the internet is completely blocked by security group).

---

## 7. Migration Blockers & Architecture Decisions

| Potential Blocker | Evaluation | Resolution |
| :--- | :--- | :--- |
| **Next.js Standalone Mode** | Default Next.js build produces bloated `.next` folder requiring full `node_modules` | Added `output: 'standalone'` to `next.config.ts` to generate minimal production bundle |
| **IAM Task Role S3 Access** | `storage-provider.ts` previously required explicit `AWS_ACCESS_KEY_ID` | Updated `storage-provider.ts` to support IAM Task Role credential chain when `AWS_S3_BUCKET` is set |
| **Database Migrations** | Prisma Migrate has no local migration history (`prisma db push` used) | Maintain controlled database deployment script; do not execute `prisma migrate reset` |
| **Billing Gateway** | Razorpay keys required in production mode | Keep `BILLING_STATUS = 'NOT_LIVE'` with test credentials; billing deactivated |

**Blocker Assessment:** No architectural blockers require halting. All necessary prerequisites have clear, low-risk resolutions.

---

## 8. Rollback Strategy

1. **Vercel Preserved:** The current deployment at `https://qc-assistance.vercel.app/` remains active and unimpacted throughout the entire AWS staging migration.
2. **Database Non-Destructive:** No database migrations or schema alterations are performed. The Neon PostgreSQL database remains shared and fully compatible with both Vercel and AWS.
3. **DNS Untouched:** DNS cutover will not occur until AWS staging passes all acceptance tests.

---

## 9. Gate 1 Verdict

**STATUS: GATE 1 PASSED.**  
Proceed to Gate 2 (Containerization & ECR Image Delivery).
