# SpanQC — Electrical Diagram Quality Control Assistant

> **Product Truth:** AI-assisted quality checking that helps engineering teams review wiring diagrams more efficiently — while keeping engineers in control.

SpanQC is a multi-tenant, cloud-native engineering quality-checking platform designed to ingest aerospace and industrial wiring diagrams, extract schematic topologies, build deterministic electrical connectivity graphs, and evaluate 20 standard deterministic QC rules (including IPC-WHMA-A-620 compliance) with full evidence provenance and human review workflows.

---

## 1. System Architecture Overview

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

### Dual Infrastructure Footprint
1. **Primary AWS Staging Environment (Phase 6):**
   - **Runtime:** AWS ECS Fargate (`ap-south-1` Mumbai)
   - **Load Balancer:** Internet-Facing Application Load Balancer (`spanqc-staging-alb`)
   - **ALB Endpoint:** `http://spanqc-staging-alb-1167170205.ap-south-1.elb.amazonaws.com`
   - **Storage:** Amazon S3 Private Bucket (`spanqc-staging-documents-905418293374`)
   - **Registry:** Amazon ECR (`spanqc-staging`)
   - **Secrets:** AWS Secrets Manager (`spanqc/staging/app-secrets-R4wtvP`)
   - **Observability:** Amazon CloudWatch Logs (`/ecs/spanqc-staging`)
   - **Database:** Neon PostgreSQL (external pooled connection over TLS)
2. **Rollback & Verification Environment:**
   - **Platform:** Vercel Staging (`https://qc-assistance.vercel.app/`)
   - Preserved as hot rollback target during the migration validation window.

---

## 2. Product Reality & Safety Declarations

- **`REAL_BENCHMARK_STATUS = 'INSUFFICIENT_DATA'`**: Benchmark metrics reflect empirical sandbox test vectors only. SpanQC does NOT claim certified regulatory validation or production aerospace sign-off without engineer-in-the-loop review.
- **`BILLING_STATUS = 'NOT_LIVE'`**: Razorpay billing integration is implemented in architecture but disabled in live execution. Quota limits and metering are tracked strictly via an internal ledger.
- **Deterministic QC**: The 20 production QC rules run deterministically on extracted netlists without relying on generative LLM hallucination for critical pass/fail verdicts.

---

## 3. Infrastructure as Code (Terraform)

All AWS staging infrastructure is declared with HashiCorp Terraform under `infra/terraform/`:

```
infra/terraform/
├── environments/
│   └── staging/
│       ├── main.tf           # Staging root module
│       ├── variables.tf      # Configuration variables
│       └── outputs.tf        # ALB DNS, ECR URI, Cluster Name
└── modules/
    ├── networking/           # VPC subnets & Security Groups
    ├── alb/                  # Application Load Balancer & Target Groups
    └── ecs/                  # ECS Cluster, Task Definition & Service
```

### Deploying Infrastructure
```bash
cd infra/terraform/environments/staging
terraform init
terraform plan
terraform apply
```

---

## 4. Containerization & Deployment

### Building & Running Production Container Locally
```bash
# Multi-stage production build
docker build -t spanqc:latest .

# Run locally with environment file
docker run -p 3000:3000 --env-file .env spanqc:latest
```

### Pushing to Amazon ECR & Deploying to ECS Fargate
```bash
# Authenticate with AWS ECR
aws ecr get-login-password --region ap-south-1 | docker login --username AWS --password-stdin 905418293374.dkr.ecr.ap-south-1.amazonaws.com

# Tag with Commit SHA and staging tag
COMMIT_SHA=$(git rev-parse --short HEAD)
docker tag spanqc:latest 905418293374.dkr.ecr.ap-south-1.amazonaws.com/spanqc-staging:$COMMIT_SHA
docker tag spanqc:latest 905418293374.dkr.ecr.ap-south-1.amazonaws.com/spanqc-staging:staging

# Push image
docker push 905418293374.dkr.ecr.ap-south-1.amazonaws.com/spanqc-staging:$COMMIT_SHA
docker push 905418293374.dkr.ecr.ap-south-1.amazonaws.com/spanqc-staging:staging

# Force rolling deployment
aws ecs update-service --cluster spanqc-staging-cluster --service spanqc-staging-service --force-new-deployment --region ap-south-1
```

---

## 5. Verification & Acceptance Testing

The repository includes a comprehensive 16-gate production verification suite:

```bash
# Run acceptance test against AWS Staging ALB
npx tsx scripts/verify_aws_staging.ts
```

### Verification Gates Covered:
1. `ALB Health Probe` (`/api/health` -> HTTP 200, Neon DB connected)
2. `ALB Readiness Probe` (`/api/ready` -> HTTP 200, Ready)
3. `S3 Public Access Denial` (Validates S3 Block Public Access returns 403 Forbidden)
4. `Unauthenticated Access Rejection` (Validates 401 Unauthorized on protected routes)
5. `Tenant A Onboarding` (Registers organization and user atomically)
6. `Tenant B Onboarding` (Registers independent tenant)
7. `Tenant A Project Creation` (Verifies multi-tenant project assignment)
8. `Upload Session & S3 Presigned URL` (Generates time-bound presigned PUT URL)
9. `Direct Binary S3 Storage Write` (Pushes actual PDF binary payload to private S3)
10. `Upload Verification & Checksum Gate` (Authoritative SHA-256 verification in S3)
11. `Real Pipeline & Deterministic 20 QC Engine` (Runs topology extraction + 20 QC rules)
12. `Findings Retrieval Experience` (Retrieves evidence-backed rule findings)
13. `QC Review Report Generation` (Generates full audit report record)
14. `Authorized Report Download URL` (Issues presigned S3 GET URL)
15. `Tenant Isolation: Document IDOR Block` (Guarantees Tenant B cannot read Tenant A doc)
16. `Tenant Isolation: Findings IDOR Block` (Guarantees Tenant B cannot read Tenant A findings)

---

## 6. Migration Documentation Index

- [AWS Architecture](AWS_ARCHITECTURE.md)
- [AWS Migration Forensic Audit](AWS_MIGRATION_AUDIT.md)
- [AWS IAM Roles & Least-Privilege Policies](AWS_IAM.md)
- [AWS Secrets Management](AWS_SECRETS.md)
- [AWS Private S3 Storage Architecture](AWS_S3.md)
- [AWS ECS Fargate Specification](AWS_ECS.md)
- [AWS Networking & Cost Optimization](AWS_NETWORKING.md)
- [AWS Deployment Guide](AWS_DEPLOYMENT.md)
- [AWS Rollback & Fallback Strategy](AWS_ROLLBACK.md)
- [Database & Migration Decoupling](DATABASE_DEPLOYMENT.md)
- [CloudWatch Observability & Logging](OBSERVABILITY.md)
- [Monthly AWS Cost Model](AWS_COST.md)
- [Blockers & Risk Registry](AWS_MIGRATION_BLOCKERS.md)
- [Phase 6 Final Verification Report](PHASE_6_AWS_MIGRATION_REPORT.md)
