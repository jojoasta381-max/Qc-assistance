# AWS Infrastructure Cost Estimation & Analysis
**Project:** SpanQC / Wiring Diagram QC Assistant  
**Region:** `ap-south-1` (Mumbai)  
**Currency:** USD ($)  

---

## 1. Cost Overview: Architecture Tiers

| Architecture Tier | Monthly Estimate | Infrastructure Components |
| :--- | :--- | :--- |
| **1. Minimum Staging (Current)** | **~$28.00 / mo** | 1 ALB ($16.20), 1 Fargate Task 0.5 vCPU/1GB ($11.00), ECR & S3 (<$1.00), Secrets Manager ($0.40), CloudWatch Logs (<$0.50), $0 NAT Gateway |
| **2. Realistic Pilot** | **~$48.00 / mo** | 1 ALB ($16.20), 2 Fargate Tasks 0.5 vCPU/1GB ($22.00) in Multi-AZ, S3 (~10GB docs, $0.25), CloudWatch ($2.00), Secrets Manager ($0.80) |
| **3. Production Baseline** | **~$125.00 / mo** | 1 ALB ($16.20), 2-4 Fargate Tasks (1.0 vCPU/2GB auto-scaled, ~$55.00), Multi-AZ NAT Gateway ($32.40), S3 Standard (~50GB, $1.15), CloudWatch Logs & Metrics ($5.00), Route 53 ($0.50) |

*Note: All prices are standard AWS ap-south-1 on-demand list prices. Bandwidth egress within free tier allowances.*

---

## 2. Component-by-Component Cost Breakdown (Staging)

### 1. Application Load Balancer (ALB)
- **Base Rate:** $0.0225 per hour = ~$16.20 / month
- **LCU (Load Balancer Capacity Units):** Staging traffic within minimum 1 LCU ($0.008/hour = ~$5.76/month if active)
- **Subtotal:** ~$16.20 - $22.00 / month

### 2. ECS Fargate Compute (1 Task, 0.5 vCPU, 1 GB RAM)
- **vCPU:** 0.5 * $0.04048 per vCPU-hour * 730 hours = ~$14.78 / month (standard)
- **Fargate Spot (Optional for Dev/Staging):** Up to 70% savings (~$4.50/month)
- **Fargate On-Demand (Staging):** ~$11.00 - $14.80 / month

### 3. Amazon S3 Storage
- **Storage:** $0.023 per GB/month for first 50 TB. (1 GB staging docs = $0.02/month)
- **PUT Requests:** $0.005 per 1,000 requests.
- **GET Requests:** $0.0004 per 1,000 requests.
- **Subtotal:** < $0.50 / month

### 4. Amazon ECR (Elastic Container Registry)
- **Storage:** $0.10 per GB/month. 1 image (268 MB) * 3 tags = ~800 MB = ~$0.08 / month.
- **Lifecycle Policy:** Automatically expires untagged layers older than 1 day and caps history at 30 images.
- **Subtotal:** < $0.20 / month

### 5. AWS Secrets Manager
- **Secrets:** $0.40 per secret per month. (1 secret `spanqc/staging/app-secrets` = $0.40/month)
- **API Calls:** $0.05 per 10,000 API calls (cached by ECS container on startup).
- **Subtotal:** ~$0.40 / month

### 6. CloudWatch Logs
- **Ingestion:** $0.50 per GB. (Staging generates < 100 MB/month = < $0.05)
- **Retention:** Set to 14 days to prevent storage growth.
- **Subtotal:** < $0.10 / month

### 7. External Database (Neon Serverless PostgreSQL)
- **Current Cost:** $0.00 (Neon Free / Developer tier serverless). Managed outside AWS bill.

---

## 3. Cost-Conscious Optimizations Implemented

1. **Zero NAT Gateway Overhead:** Utilizing Internet Gateway for outbound egress from task-level security groups eliminates **$32.40 - $64.80/month** in unnecessary idle NAT fees.
2. **Minimal Task Sizing:** 0.5 vCPU and 1 GB memory is sufficient for Next.js standalone server and deterministic QC evaluator.
3. **Single Aggregated Secret:** Bundling all application keys into `spanqc/staging/app-secrets` avoids paying $0.40/month per individual environment variable.
4. **CloudWatch Retention Cap:** Fixed 14-day retention prevents runaway logging costs.
