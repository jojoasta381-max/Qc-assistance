# AWS Secrets Management Specification
**Project:** SpanQC / Wiring Diagram QC Assistant  
**Secret Name:** `spanqc/staging/app-secrets`  
**Secret ARN:** `arn:aws:secretsmanager:ap-south-1:905418293374:secret:spanqc/staging/app-secrets-R4wtvP`  
**AWS Account ID:** `905418293374`  
**AWS Region:** `ap-south-1` (Mumbai)  

---

## 1. Secrets Inventory & Security Classification

| Secret Key | Classification | Description | Consumer |
| :--- | :--- | :--- | :--- |
| `DATABASE_URL` | Confidential | Neon PostgreSQL pooled connection string with SSL | Prisma Client runtime |
| `DIRECT_URL` | Confidential | Neon PostgreSQL direct connection string | Prisma migration runner |
| `AUTH_SECRET` | Confidential | HMAC SHA-256 session signature secret (>= 32 chars) | Auth / Session subsystem |
| `RAZORPAY_KEY_ID` | Restricted | Non-live Razorpay test key ID (`rzp_test_*`) | Billing subsystem (`NOT_LIVE`) |
| `RAZORPAY_KEY_SECRET` | Confidential | Non-live Razorpay test key secret | Billing subsystem (`NOT_LIVE`) |
| `RAZORPAY_WEBHOOK_SECRET` | Confidential | Non-live Razorpay test webhook signature secret | Webhook verification |

---

## 2. Injection Pattern

In ECS Fargate, secrets are injected directly into container environment variables at task start time via the `secrets` stanza of the task definition. 

Example task definition secret mapping:
```json
{
  "name": "DATABASE_URL",
  "valueFrom": "arn:aws:secretsmanager:ap-south-1:905418293374:secret:spanqc/staging/app-secrets-R4wtvP:DATABASE_URL::"
},
{
  "name": "AUTH_SECRET",
  "valueFrom": "arn:aws:secretsmanager:ap-south-1:905418293374:secret:spanqc/staging/app-secrets-R4wtvP:AUTH_SECRET::"
}
```

### Advantages:
1. No secrets committed to Git repository.
2. No secrets embedded in Docker image layers.
3. Decoupled rotation without rebuilding container images.
4. Auditable via AWS CloudTrail.

---

## 3. Rotation Strategy

1. **Staging / Pilot:** Controlled rotation via AWS CLI / Terraform by updating the secret version and initiating a new ECS deployment.
2. **Zero Downtime:** ECS rolling deployment launches new tasks with updated secrets while ensuring old tasks complete active requests before draining.

---

## 4. Gate 3 Verdict

**STATUS: GATE 3 PASSED.**  
Proceed to Gate 4 (VPC, ALB & ECS Fargate Infrastructure).
