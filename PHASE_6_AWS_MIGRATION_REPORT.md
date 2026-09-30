# PHASE 6 — AWS PRODUCTION INFRASTRUCTURE MIGRATION REPORT
## Vercel Staging → AWS ECS Fargate Migration (ap-south-1 Mumbai)

---

### Status Classification: **`AWS_STAGING_READY`**
*(Note: As mandated by engineering protocol, this deployment is verified for AWS Staging. It is NOT classified as `PRODUCTION READY` until custom domain cutover, ACM certificate binding, and production acceptance sign-off occur.)*

---

## 1. Executive Summary

SpanQC has successfully executed **Phase 6: Infrastructure Migration**, transitioning the primary application runtime from Vercel to native Amazon Web Services infrastructure in the `ap-south-1` (Mumbai) region.

The core runtime has been migrated to **AWS ECS Fargate** behind an **Application Load Balancer (ALB)**, with container images hosted in **Amazon ECR**, documents securely persisted in an encrypted, private **Amazon S3** bucket, secrets managed via **AWS Secrets Manager**, and observability unified in **Amazon CloudWatch Logs**. External database persistence was preserved on **Neon PostgreSQL** to avoid simultaneous state migration risk.

The migration successfully cleared all **16/16 verification gates** in the automated acceptance suite, proving full end-to-end functionality across multi-tenant authentication, presigned S3 uploads, real PDF preflight extraction, 20 deterministic QC rules, report generation, and cross-tenant IDOR protection.

---

## 2. Before Architecture (Vercel Staging)

- **Compute & Routing:** Vercel Edge / Serverless Functions (Node.js runtime)
- **Deployment URL:** `https://qc-assistance.vercel.app/`
- **Database:** Neon PostgreSQL (external connection string via `DATABASE_URL`)
- **Document Storage:** In-memory or temporary local filesystem / development mock storage
- **Secrets:** Vercel Project Environment Variables
- **Logs:** Vercel Runtime Logs

---

## 3. After Architecture (Target AWS Staging)

```
                            Client Traffic (Web / API)
                                       │
                                       ▼
                       Application Load Balancer (ALB)
                          [spanqc-staging-alb]
                                       │
                                       ▼ (HTTP :3000)
                              ECS Fargate Service
                          [spanqc-staging-service]
                      ┌─────────────────────────┐
                      │ Next.js 16 (Standalone) │
                      │ Node.js 20 Minimal OCI  │
                      └───────────┬─────────────┘
                                  │
          ┌───────────────────────┼────────────────────────┐
          ▼                       ▼                        ▼
  Private S3 Bucket        External Neon DB        AWS Secrets Manager
  [spanqc-staging-docs]   [PostgreSQL Pooler]     [spanqc/staging/secrets]
    - Encrypted SSE-S3      - Strict Isolation      - Injected at Startup
    - Block Public Access   - SSL Encrypted         - Ephemeral Task Memory
    - Tenant-Scoped Keys
```

---

## 4. Exact AWS Resources Created

All resources provisioned in AWS Account `905418293374`, Region `ap-south-1`:

| Service | Resource Name | Identifier / ARN |
| :--- | :--- | :--- |
| **ECR** | `spanqc-staging` | `arn:aws:ecr:ap-south-1:905418293374:repository/spanqc-staging` |
| **S3** | `spanqc-staging-documents-905418293374` | `arn:aws:s3:::spanqc-staging-documents-905418293374` |
| **Secrets Manager** | `spanqc/staging/app-secrets` | `arn:aws:secretsmanager:ap-south-1:905418293374:secret:spanqc/staging/app-secrets-R4wtvP` |
| **IAM Execution Role** | `spanqc-staging-ecs-execution-role` | `arn:aws:iam::905418293374:role/spanqc-staging-ecs-execution-role` |
| **IAM Task Role** | `spanqc-staging-ecs-task-role` | `arn:aws:iam::905418293374:role/spanqc-staging-ecs-task-role` |
| **CloudWatch Logs** | `/ecs/spanqc-staging` | `arn:aws:logs:ap-south-1:905418293374:log-group:/ecs/spanqc-staging` |
| **ALB** | `spanqc-staging-alb` | `arn:aws:elasticloadbalancing:ap-south-1:905418293374:loadbalancer/app/spanqc-staging-alb/6fcab9fcbeea6344` |
| **ALB Target Group** | `spanqc-staging-tg` | `arn:aws:elasticloadbalancing:ap-south-1:905418293374:targetgroup/spanqc-staging-tg/699f6ec4b7733927` |
| **ECS Cluster** | `spanqc-staging-cluster` | `arn:aws:ecs:ap-south-1:905418293374:cluster/spanqc-staging-cluster` |
| **ECS Service** | `spanqc-staging-service` | `arn:aws:ecs:ap-south-1:905418293374:service/spanqc-staging-cluster/spanqc-staging-service` |
| **Security Group (ALB)** | `spanqc-staging-alb-sg` | `sg-01809349db6a39036` |
| **Security Group (ECS)** | `spanqc-staging-ecs-sg` | `sg-07504aa207e61a0b9` |

---

## 5. ECS Configuration

- **Launch Type:** AWS Fargate (Platform Version 1.4.0)
- **Task CPU & Memory:** 0.5 vCPU (512 CPU units), 1024 MiB (1.0 GB RAM)
- **Container Port:** 3000
- **Desired Count:** 1 replica (Rolling deployment: Min healthy 100%, Max 200%)
- **Process User:** Non-root (`nextjs:nodejs`, UID 1001)
- **Health Check:** Liveness `/api/health` checked every 30s
- **Graceful Shutdown:** SIGTERM caught by Node.js server with 30s connection draining

---

## 6. ECR Configuration

- **Repository:** `spanqc-staging`
- **URI:** `905418293374.dkr.ecr.ap-south-1.amazonaws.com/spanqc-staging`
- **Tagging Discipline:** Commit SHA (`3b624ee`) + Environment tag (`staging`)
- **Lifecycle Policy:**
  - Untagged images expire after 1 day.
  - Tagged images retain the 30 most recent revisions.
- **Image Size:** 268 MB (Multi-stage Alpine Linux with standalone Next.js artifact)

---

## 7. S3 Configuration

- **Bucket:** `spanqc-staging-documents-905418293374`
- **Access Control:** S3 Block Public Access (all 4 flags enabled: `BlockPublicAcls`, `IgnorePublicAcls`, `BlockPublicPolicy`, `RestrictPublicBuckets`)
- **Encryption:** Server-Side Encryption with Amazon S3 managed keys (`AES256`)
- **Versioning:** Enabled
- **CORS:** Restricted to HTTP PUT/GET methods with custom headers (`x-amz-checksum-sha256`)
- **Object Key Schema:** `tenants/{tenantId}/documents/{documentId}/source/{filename}`
- **Security Guarantee:** No public access. All uploads and downloads occur strictly via time-limited (15-minute) AWS SigV4 presigned URLs generated server-side following tenant membership validation.

---

## 8. IAM Configuration (Least Privilege)

Strict separation of concerns was implemented:

1. **ECS Task Execution Role (`spanqc-staging-ecs-execution-role`):**
   - Managed Policy: `AmazonECSTaskExecutionRolePolicy` (pull images from ECR, create CloudWatch log streams).
   - Scoped Policy: `SecretsManagerRead` restricted to `arn:aws:secretsmanager:ap-south-1:905418293374:secret:spanqc/staging/app-secrets*`.
2. **ECS Task Role (`spanqc-staging-ecs-task-role`):**
   - Assumed by the running container process via AWS Container Credentials.
   - S3 Permissions: `PutObject`, `GetObject`, `AbortMultipartUpload`, `ListBucket` strictly scoped to `arn:aws:s3:::spanqc-staging-documents-905418293374/*`.
   - Explicitly lacks `AdministratorAccess` and broad wildcard grants.

---

## 9. Secrets Management

- **Secrets Manager ARN:** `arn:aws:secretsmanager:ap-south-1:905418293374:secret:spanqc/staging/app-secrets-R4wtvP`
- **Managed Variables:**
  - `DATABASE_URL` (Neon PostgreSQL TLS pooled connection)
  - `AUTH_SECRET` (HMAC-SHA256 session token signing key)
  - `STORAGE_BUCKET_NAME` (`spanqc-staging-documents-905418293374`)
  - `AWS_REGION` (`ap-south-1`)
  - `BILLING_STATUS` (`NOT_LIVE`)
  - `REAL_BENCHMARK_STATUS` (`INSUFFICIENT_DATA`)
- **Rotation Strategy:** Managed via Terraform; injected into ECS task definition `secrets` block at container launch time. No credentials exist in Git or container layers.

---

## 10. Networking & Cost Architecture

- **VPC Subnets:** Provisioned in Default VPC subnets across `ap-south-1a`, `ap-south-1b`, `ap-south-1c`.
- **Security Groups:**
  - `spanqc-staging-alb-sg`: Inbound HTTP port 80 from `0.0.0.0/0`.
  - `spanqc-staging-ecs-sg`: Inbound TCP port 3000 strictly from `sg-01809349db6a39036` (ALB SG). Public internet access directly to ECS task is blocked.
- **NAT Gateway Decision:** To prevent unnecessary idle cloud burn (~$65-70/month), the staging Fargate tasks utilize assign public IP with strict egress through the Internet Gateway, while the ECS security group blocks all direct inbound public connections.

---

## 11. Application Load Balancer (ALB)

- **DNS:** `spanqc-staging-alb-1167170205.ap-south-1.elb.amazonaws.com`
- **Listener:** HTTP Port 80 forwarding to `spanqc-staging-tg`.
- **Target Group:** `spanqc-staging-tg`
  - Health check path: `/api/health`
  - Healthy threshold: 2 checks, Interval: 30s, Timeout: 5s
  - Deregistration delay: 30s
- **Current Target Health:** 1 target registered, state: `healthy` (`172.31.8.182:3000`).

---

## 12. DNS & ACM Strategy

- **Current State:** Staging tests execute directly against the ALB DNS name.
- **Production Roadmap:**
  - Request ACM certificate for `staging.spanqc.com` (or target custom domain) in `ap-south-1`.
  - Add CNAME record in Route 53 pointing to the ALB.
  - Add HTTPS port 443 listener with ACM certificate and HTTP:80 → HTTPS:443 redirect.
  - Preserve Vercel DNS until formal staging acceptance sign-off.

---

## 13. Neon PostgreSQL Connectivity

- Decoupled Prisma migrations from ECS container startup to avoid race conditions and lock contention.
- Verified connection pooler compatibility with TLS encryption over port 5432.
- Prisma schema validation and migration status verified cleanly: `npx prisma migrate status` reports database schema is up to date.

---

## 14. Observability & Logging

- **Log Group:** `/ecs/spanqc-staging`
- **Log Stream Format:** `ecs/spanqc-app/{task-id}`
- **Retention:** 14 days
- **Log Sanitation:** JSON structured request logs contain request ID, duration, route, and status code. Passwords, JWT tokens, AWS credentials, and private S3 payload buffers are excluded from log statements.

---

## 15. Security Audit Findings

| Test | Objective | Result | Verification |
| :--- | :--- | :--- | :--- |
| **S3 Public Access** | Verify direct public curl to S3 object returns 403 Forbidden | **PASS** | HTTP 403 Forbidden |
| **Unauthenticated Access** | Verify `/api/v1/projects` returns 401 without cookie | **PASS** | HTTP 401 Unauthorized |
| **Container Privilege** | Verify container runs as non-root UID 1001 | **PASS** | `nextjs:nodejs` UID 1001 verified |
| **Secrets Exposure** | Verify client bundle does not leak Secrets Manager keys | **PASS** | 0 secrets present in frontend bundles |
| **Cross-Tenant IDOR (Doc)** | Tenant B attempts GET on Tenant A document | **PASS** | HTTP 404 Not Found (Isolated) |
| **Cross-Tenant IDOR (QC)** | Tenant B attempts GET on Tenant A findings | **PASS** | HTTP 404 Not Found (Isolated) |

---

## 16. Automated Acceptance Suite Results (16/16 Passed)

Executed against `http://spanqc-staging-alb-1167170205.ap-south-1.elb.amazonaws.com`:

| Gate / Test Name | Status | Latency | Details |
| :--- | :--- | :--- | :--- |
| ALB Health Probe | **PASS** | 547ms | HTTP 200 OK (DB: healthy) |
| ALB Readiness Probe | **PASS** | 406ms | HTTP 200 (Ready: true) |
| S3 Public Access Denial | **PASS** | 280ms | HTTP 403 Forbidden (Public direct access successfully blocked) |
| Unauthenticated Access Rejection | **PASS** | 191ms | HTTP 401 Unauthorized as expected |
| Tenant A Onboarding | **PASS** | 3550ms | Org: `173336b1-5f02-4bbd-a469-01671bb79647`, Email: `aerospace-qc-878375@apex-avionics.com` |
| Tenant B Onboarding | **PASS** | 2034ms | Org: `ec024ab6-2f3a-4433-b830-f3db0662b836` |
| Tenant A Project Creation | **PASS** | 2038ms | Project ID: `7d5e87cf-b6a9-4b38-8252-3d4426a25cc5` |
| Upload Session & S3 Presigned URL | **PASS** | 2866ms | Doc ID: `6b0520a2-f873-418d-974c-c5b602327926`, Method: PUT |
| Direct Binary S3 Storage Write | **PASS** | 217ms | HTTP 200 (Uploaded 1123 bytes to S3) |
| Upload Verification & Checksum Gate | **PASS** | 3043ms | Status: VERIFIED |
| Real Pipeline & Deterministic 20 QC Engine | **PASS** | 29979ms | Job Status: COMPLETED, Stage: COMPLETED, Document: QC_COMPLETE |
| Findings Retrieval Experience | **PASS** | 2805ms | Retrieved findings response (Status: 200, count: 28) |
| QC Review Report Generation | **PASS** | 2868ms | Report ID: `rep_muoa9cf4_2c9b1d70`, Status: 201 |
| Authorized Report Download URL | **PASS** | 923ms | Presigned URL: `https://spanqc-staging-documents-905418293374...` |
| Tenant Isolation: Document IDOR Block | **PASS** | 714ms | HTTP 404 (Tenant B blocked from accessing Tenant A document) |
| Tenant Isolation: Findings IDOR Block | **PASS** | 718ms | HTTP 404 (Tenant B blocked from viewing Tenant A findings) |

---

## 17. Performance Baseline Measurements

- **Health Check Latency:** 200 – 547 ms
- **Readiness Latency:** 406 ms
- **Direct S3 Upload Latency:** 217 ms
- **Document Preflight + Electrical Graph + 20 QC Rules Processing Time:** 29.98 seconds (Real binary PDF parse with headless worker, netlist extraction, and rule evaluation)
- **Findings Retrieval Latency:** 2.80 seconds
- **Report Generation Latency:** 2.86 seconds

---

## 18. Monthly AWS Cost Estimate

| Component | Minimum Staging (Current) | Pilot Architecture | Production Baseline (Multi-AZ) |
| :--- | :--- | :--- | :--- |
| ECS Fargate | $11.00 (1 task, 0.5 vCPU, 1GB) | $22.00 (2 tasks) | $66.00 (4 tasks autoscale) |
| ALB | $16.50 (1 ALB) | $16.50 | $22.00 |
| S3 Storage & Transfer | $1.00 (< 5 GB) | $5.00 | $15.00 |
| CloudWatch Logs | $1.50 (14-day retention) | $3.00 | $10.00 |
| Secrets Manager | $0.40 (1 secret) | $0.40 | $0.80 |
| ECR | $0.50 (< 10 GB) | $1.00 | $2.50 |
| Route 53 / ACM | $0.50 (1 hosted zone) | $0.50 | $1.00 |
| NAT Gateway | **$0.00 (Bypassed)** | **$0.00** | $68.00 (If private subnets enforced) |
| **Total Monthly Estimated** | **~$31.40 / month** | **~$48.40 / month** | **~$185.30 / month** |

---

## 19. Rollback & Fallback Verification

- **Vercel Deployment Status:** ACTIVE and HEALTHY (`HTTP/2 200 OK`)
- **Rollback Procedure:** DNS remains completely pointing to Vercel. In the event of an AWS staging anomaly, zero downtime occurs for existing users as Vercel is maintained as the hot standby.

---

## 20. Exact Deployment Coordinates

- **Git Branch:** `phase-6-aws-migration`
- **Git Commit:** `3b624ee`
- **ECR Repository:** `905418293374.dkr.ecr.ap-south-1.amazonaws.com/spanqc-staging`
- **ECR Image Tag:** `3b624ee` / `staging`
- **Active AWS Staging URL:** `http://spanqc-staging-alb-1167170205.ap-south-1.elb.amazonaws.com`
- **Active Vercel Rollback URL:** `https://qc-assistance.vercel.app/`

---

## 21. Final Migration Status

### **`AWS_STAGING_READY`**
All AWS infrastructure components, Docker multi-stage containerization, ECR pipelines, S3 storage abstraction, least-privilege IAM roles, Secrets Manager bindings, ALB ingress, Neon DB pooling, and automated end-to-end acceptance tests have passed with 100% adherence to product truth constraints.
