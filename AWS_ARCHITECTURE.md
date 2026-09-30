# Target AWS Production Infrastructure Architecture
**Project:** SpanQC / Wiring Diagram QC Assistant  
**AWS Account ID:** `905418293374`  
**Primary Region:** `ap-south-1` (Mumbai)  

---

## 1. High-Level System Architecture

```
                    Internet Users
                          │
                          ▼
             Route 53 DNS (staging.spanqc.com)
                          │
                          ▼
            ACM TLS / HTTPS Termination (Port 443)
                          │
                          ▼
     Application Load Balancer (spanqc-staging-alb)
              Health Check: /api/health
                          │
                          ▼ HTTP :3000
    ┌────────────────────────────────────────────────────────┐
    │ Amazon ECS Fargate (spanqc-staging-cluster)            │
    │ Service: spanqc-staging-service                        │
    │                                                        │
    │ Task Definition: spanqc-staging-task                   │
    │ Image: 905418293374.dkr.ecr.ap-south-1...:f5a2dd1      │
    │ Non-root User: nextjs (1001)                           │
    │ Standalone Server: Node.js 20 on Alpine                │
    │                                                        │
    │ Roles:                                                 │
    │  - Execution: spanqc-staging-ecs-execution-role        │
    │  - Task: spanqc-staging-ecs-task-role                  │
    └─────────────────────┬─────────────────┬────────────────┘
                          │                 │
             ┌────────────┴────────┐        │
             ▼                     ▼        ▼
       Amazon S3              AWS Secrets   Neon PostgreSQL
 (Private Documents Bucket)     Manager    (External DB)
```

---

## 2. Component Specifications

### 1. Ingress & Routing
- **AWS ALB:** `spanqc-staging-alb` deployed across 3 Availability Zones (`ap-south-1a`, `ap-south-1b`, `ap-south-1c`).
- **Target Group:** `spanqc-staging-tg` (Port 3000, target type IP).
- **Health Check Endpoint:** `GET /api/health` (HTTP 200, checks database connectivity via `SELECT 1`).

### 2. Compute Runtime
- **Platform:** AWS ECS Fargate (Linux / Alpine `node:20-alpine`).
- **Cluster:** `spanqc-staging-cluster`.
- **Service:** `spanqc-staging-service`.
- **Hardware Profile:** 0.5 vCPU (512 units), 1 GB RAM (1024 units).
- **Service Scaling:** Desired count 1; rolling minimum healthy 100%, maximum 200%.

### 3. Object Storage
- **Bucket:** `spanqc-staging-documents-905418293374` in `ap-south-1`.
- **Security:** Public access blocked, SSE-S3 AES-256 encryption, versioning enabled, CORS enabled.
- **Access Pattern:** Server-side generated presigned PUT/GET URLs; authorization strictly gated per tenant.

### 4. Database Layer
- **Provider:** Neon Serverless PostgreSQL (`ep-old-cell-b4j92zqi-pooler.c-6.us-east-2.aws.neon.tech`).
- **Preserved:** External to AWS to avoid unneeded database migration risk during Phase 6.

### 5. Secrets Management
- **Secret:** `spanqc/staging/app-secrets-R4wtvP` in `ap-south-1`.
- **Injected:** Securely populated into task environment variables via Secrets Manager ARNs at task launch.
