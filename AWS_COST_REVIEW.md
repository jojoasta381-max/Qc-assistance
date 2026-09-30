# SpanQC — AWS Cost Architecture Review & Audit
**Region:** `ap-south-1` (Mumbai)  
**Date:** September 2026  
**Auditor:** Principal Cloud Architect & FinOps Review

---

## 1. Cost Overview & Summary Matrix

The following table provides an unembellished, line-item projection of AWS infrastructure expenditures across development and production lifecycle tiers.

| AWS Service | Cost Type | Minimum Staging (Current) | Realistic Pilot (Multi-AZ) | Production Baseline |
| :--- | :--- | :--- | :--- | :--- |
| **ECS Fargate Compute** | Fixed | $18.03 (1 task, 0.5 vCPU, 1GB) | $36.06 (2 tasks, 0.5 vCPU, 1GB)| $144.15 (4 tasks, 1.0 vCPU, 2GB)|
| **Application Load Balancer**| Fixed + LCU | $17.43 (1 ALB, <1 LCU) | $18.50 (1 ALB, 1-2 LCU) | $24.00 (Multi-AZ, higher LCU) |
| **Amazon S3 Storage** | Usage-based | $0.50 (< 5 GB storage) | $2.50 (~50 GB storage) | $15.00 (~500 GB storage) |
| **Amazon ECR Image Storage**| Usage-based | $0.81 (~8.1 GB, 30 tags) | $1.50 (~15 GB) | $3.50 (~35 GB) |
| **CloudWatch Logs** | Usage-based | $1.20 (< 2 GB, 14-day retain)| $3.00 (~5 GB) | $12.00 (~20 GB, 30-day retain) |
| **AWS Secrets Manager** | Fixed + API | $0.45 (1 secret) | $0.45 (1 secret) | $0.90 (2 secrets) |
| **Route 53 & ACM** | Fixed + Queries | $0.50 (1 zone, ACM free) | $0.60 | $1.20 |
| **NAT Gateway (Egress)** | Fixed + Data | **$0.00 (Bypassed Option A)**| **$0.00 (Bypassed Option A)** | **$68.50 (If Private Subnet)** |
| **Data Transfer Out** | Usage-based | $0.00 (Under 100 GB Free) | $5.00 (~50 GB over free tier) | $43.60 (~500 GB egress) |
| **TOTAL ESTIMATED MONTHLY** | — | **~$38.92 / month** | **~$67.61 / month** | **~$312.85 / month** |

*(Note: These figures represent calculated AWS list prices in `ap-south-1`. They are model estimates, not invoices. Actual bills depend on dynamic request traffic and data throughput.)*

---

## 2. Deep-Dive on Largest Cost Drivers

### 2.1 The NAT Gateway Surcharge (~$65 – $70 / mo)
In typical "textbook enterprise" architectures, ECS tasks are placed in private subnets, requiring an AWS NAT Gateway to communicate outbound to external APIs (Neon PostgreSQL, NPM, or public endpoints).
- **Hourly Cost:** $0.045 / hour / NAT Gateway = $32.85 / month for a single AZ, or **$65.70 / month** for Multi-AZ.
- **Data Cost:** $0.045 / GB processed.
- **Architectural Decision (Option A):** For Staging and Pilot, we place ECS tasks in public subnets with `assign_public_ip = true`, but enforce strict ingress security:
  ```
  Internet → [Dropped by sg-07504aa207e61a0b9 (ECS SG)]
  ALB      → [Allowed TCP 3000 by sg-07504aa207e61a0b9]
  ECS      → Outbound Internet Gateway (Free) → Neon DB
  ```
- **Cost Savings:** Direct savings of **$788.40 per year** without compromising network isolation.

### 2.2 ECS Fargate Compute Sizing
- Fargate rates in `ap-south-1`:
  - $0.04048 per vCPU-hour
  - $0.004445 per GB-hour
- Sizing at 0.5 vCPU / 1024 MiB RAM provides ample headroom for standalone Next.js 16 and headless PDF parsing while keeping idle spend at ~$18/month.

### 2.3 CloudWatch Log Retention Optimization
- Default CloudWatch log groups retain data "Never Expire", which accumulates unneeded storage costs over time.
- All SpanQC staging log groups have an enforced **14-day retention policy**, capping log storage under $1.50/month.

---

## 3. Cost-Control Recommendations for Production (Phase 10)

1. **AWS Savings Plans / Compute Fargate:** Committing to 1-year Compute Savings Plan reduces Fargate hourly cost by 20–28%.
2. **ECR Lifecycle Policy:** Retaining only the last 30 tagged images prevents linear registry storage accumulation.
3. **VPC Endpoints for S3:** Using an S3 Gateway Endpoint (free of charge) ensures traffic between ECS and S3 stays on the AWS private network and incurs zero data transfer charges.
