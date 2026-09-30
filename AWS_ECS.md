# AWS ECS Fargate Cluster & Service Specification
**Project:** SpanQC / Wiring Diagram QC Assistant  
**Cluster Name:** `spanqc-staging-cluster`  
**Service Name:** `spanqc-staging-service`  
**Task Definition:** `spanqc-staging-task`  
**AWS Region:** `ap-south-1` (Mumbai)  

---

## 1. Cluster & Runtime Profile

- **Launch Type:** AWS Fargate (Serverless Container Compute)
- **Container Insights:** Enabled
- **Network Mode:** `awsvpc`
- **CPU Allocation:** `512` (0.5 vCPU)
- **Memory Allocation:** `1024 MB` (1 GB)
- **Operating System:** Linux / Alpine (`node:20-alpine`)
- **Execution User:** `nextjs` (UID 1001, Non-root)

---

## 2. Container Configuration

| Setting | Value | Purpose |
| :--- | :--- | :--- |
| **Container Name** | `spanqc-app` | Primary Next.js application container |
| **Image** | `905418293374.dkr.ecr.ap-south-1.amazonaws.com/spanqc-staging:f5a2dd1` | Immutable Git commit SHA tagged image |
| **Port Mapping** | `3000/tcp` | Standalone Next.js listener |
| **Health Check** | `curl -f http://127.0.0.1:3000/api/health \|\| exit 1` | Container process and database connectivity liveness |
| **Logging** | `awslogs` driver -> `/ecs/spanqc-staging` | Centralized CloudWatch stdout/stderr logging |

### Environment Variables
- `NODE_ENV = "production"`
- `APP_MODE = "PRODUCTION"`
- `PORT = "3000"`
- `HOSTNAME = "0.0.0.0"`
- `AWS_REGION = "ap-south-1"`
- `AWS_S3_BUCKET = "spanqc-staging-documents-905418293374"`
- `STORAGE_PROVIDER = "s3"`
- `BILLING_STATUS = "NOT_LIVE"`

### Secrets Injected from Secrets Manager (`spanqc/staging/app-secrets-R4wtvP`)
- `DATABASE_URL`
- `DIRECT_URL`
- `AUTH_SECRET`
- `RAZORPAY_KEY_ID`
- `RAZORPAY_KEY_SECRET`
- `RAZORPAY_WEBHOOK_SECRET`

---

## 3. High Availability & Deployment Strategy

- **Desired Count:** 1 (staging cost-optimized) / 2+ (production)
- **Minimum Healthy Percent:** 100% (Guarantees zero downtime during updates)
- **Maximum Percent:** 200% (Permits spin-up of new tasks before old tasks are terminated)
- **Graceful Shutdown:** SIGTERM sent by ECS agent initiates clean drain of active HTTP connections.

---

## 4. Gate 4 (ECS) Verdict

**STATUS: ECS CLUSTER, TASK DEFINITION & SERVICE DEPLOYED VIA TERRAFORM.**
